import { supabase } from '@/integrations/supabase/client';
import { getUserActiveSubscription, hasActiveUnlimitedSubscription, getUserActiveSubscriptions, type ActiveSubscription } from './subscriptionHelpers';
import { deductCredits } from './creditRefundHelpers';

/**
 * Determine which subscription to use for booking with priority logic
 */
export const determineSubscriptionToUse = (subscriptions: ActiveSubscription[]): ActiveSubscription | null => {
  if (subscriptions.length === 0) return null;
  
  // PRIORITY 1: If there's an unlimited subscription, use it
  const unlimited = subscriptions.find(sub => sub.subscription_plans.unlimited_access);
  if (unlimited) {
    console.log('Using unlimited subscription:', unlimited.id);
    return unlimited;
  }
  
  // PRIORITY 2: Use subscription with most credits
  // PRIORITY 3: If credits are equal, use the one expiring sooner
  const sorted = [...subscriptions].sort((a, b) => {
    const creditsA = a.subscription_plans.credits_included || 0;
    const creditsB = b.subscription_plans.credits_included || 0;
    
    if (creditsA !== creditsB) {
      return creditsB - creditsA; // More credits first
    }
    
    // Equal credits - use earlier expiry date
    return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
  });
  
  console.log('Using subscription with priority:', sorted[0].id);
  return sorted[0];
};

export interface BookingData {
  sessionId?: string;
  courseId: string;
  gymId: string;
  scheduledDate: string;
  scheduledTime: string;
  creditsRequired: number;
}

export interface BookingEligibility {
  canBook: boolean;
  hasUnlimitedAccess: boolean;
  gymCredits: number;
  reason?: string;
}

/**
 * Check if user can book a session (unified logic)
 */
export const checkBookingEligibility = async (
  userId: string, 
  gymId: string, 
  creditsRequired: number
): Promise<BookingEligibility> => {
  try {
    console.log('Checking booking eligibility for user:', userId, 'gym:', gymId, 'credits needed:', creditsRequired);
    
    // First check for unlimited subscription
    const hasUnlimited = await hasActiveUnlimitedSubscription(userId, gymId);
    console.log('Has unlimited subscription:', hasUnlimited);
    
    if (hasUnlimited) {
      console.log('User has unlimited access, booking allowed');
      return {
        canBook: true,
        hasUnlimitedAccess: true,
        gymCredits: 0
      };
    }

    // Check gym-specific credits
    console.log('Checking gym credits...');
    const { data: gymCredits, error: creditsError } = await supabase
      .from('gym_credits')
      .select('credits')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .maybeSingle();

    console.log('Gym credits query result:', { gymCredits, creditsError });

    const availableCredits = gymCredits?.credits || 0;
    console.log('Available credits:', availableCredits);

    // Check if user has any active subscriptions
    const activeSubscriptions = await getUserActiveSubscriptions(userId, gymId);
    const hasActiveSubscription = activeSubscriptions.length > 0;

    // If no active subscription and no credits
    if (!hasActiveSubscription && availableCredits === 0) {
      console.log('No active subscription and no credits');
      return {
        canBook: false,
        hasUnlimitedAccess: false,
        gymCredits: 0,
        reason: 'Nessun abbonamento attivo. Acquista un abbonamento per prenotare.'
      };
    }

    // If has subscription but insufficient credits
    if (availableCredits < creditsRequired) {
      console.log('Insufficient credits, booking denied');
      return {
        canBook: false,
        hasUnlimitedAccess: false,
        gymCredits: availableCredits,
        reason: hasActiveSubscription
          ? `Crediti insufficienti (disponibili: ${availableCredits}, necessari: ${creditsRequired}). Acquista un nuovo pacchetto crediti.`
          : `Crediti esauriti. Acquista un abbonamento o un pacchetto crediti.`
      };
    }

    console.log('Sufficient credits available, booking allowed');
    return {
      canBook: true,
      hasUnlimitedAccess: false,
      gymCredits: availableCredits
    };
  } catch (error) {
    console.error('Error checking booking eligibility:', error);
    return {
      canBook: false,
      hasUnlimitedAccess: false,
      gymCredits: 0,
      reason: 'Errore durante la verifica dei crediti'
    };
  }
};

/**
 * Process a booking (unified logic)
 */
export const processBooking = async (
  userId: string,
  bookingData: BookingData
): Promise<{ success: boolean; message: string; bookingId?: string }> => {
  try {
    console.log('Processing booking for user:', userId, 'data:', bookingData);
    
    // Check eligibility first
    const eligibility = await checkBookingEligibility(
      userId, 
      bookingData.gymId, 
      bookingData.creditsRequired
    );

    console.log('Booking eligibility result:', eligibility);

    if (!eligibility.canBook) {
      console.log('Booking not allowed:', eligibility.reason);
      return {
        success: false,
        message: eligibility.reason || 'Non puoi prenotare questa sessione'
      };
    }

    // Check session availability if sessionId provided
    if (bookingData.sessionId) {
      console.log('Checking session availability for session:', bookingData.sessionId);
      const { data: session, error: sessionError } = await supabase
        .from('course_sessions')
        .select('available_spots')
        .eq('id', bookingData.sessionId)
        .single();

      console.log('Session availability check:', { session, sessionError });

      if (sessionError || !session || session.available_spots <= 0) {
        console.log('No available spots');
        return {
          success: false,
          message: 'Nessun posto disponibile per questa sessione'
        };
      }
    }

    // Create booking
    const bookingInsertData: any = {
      user_id: userId,
      course_id: bookingData.courseId,
      scheduled_date: bookingData.scheduledDate,
      scheduled_time: bookingData.scheduledTime,
      status: 'confirmed',
      credits_used: eligibility.hasUnlimitedAccess ? 0 : bookingData.creditsRequired
    };

    if (bookingData.sessionId) {
      bookingInsertData.session_id = bookingData.sessionId;
    }

    console.log('Creating booking with data:', bookingInsertData);

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingInsertData)
      .select()
      .single();

    console.log('Booking creation result:', { booking, bookingError });

    if (bookingError) {
      console.error('Booking creation failed:', bookingError);
      throw bookingError;
    }

    // Deduct credits if not unlimited
    if (!eligibility.hasUnlimitedAccess) {
      console.log('Deducting credits...');
      const deductionResult = await deductCredits(
        userId,
        bookingData.gymId,
        bookingData.creditsRequired,
        `Prenotazione sessione`,
        booking.id
      );

      console.log('Credit deduction result:', deductionResult);

      if (!deductionResult.success) {
        console.log('Credit deduction failed, rolling back booking');
        // Rollback booking
        await supabase
          .from('bookings')
          .delete()
          .eq('id', booking.id);
        
        return {
          success: false,
          message: deductionResult.message
        };
      }
    }

    console.log('Booking process completed successfully');
    return {
      success: true,
      message: eligibility.hasUnlimitedAccess 
        ? 'Prenotazione confermata (accesso illimitato)'
        : `Prenotazione confermata. Utilizzati ${bookingData.creditsRequired} crediti.`,
      bookingId: booking.id
    };

  } catch (error) {
    console.error('Error processing booking:', error);
    return {
      success: false,
      message: 'Errore durante la prenotazione'
    };
  }
};

/**
 * Get user's gym credits
 */
export const getUserGymCredits = async (userId: string, gymId: string): Promise<number> => {
  try {
    const { data } = await supabase
      .from('gym_credits')
      .select('credits')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .maybeSingle();

    return data?.credits || 0;
  } catch (error) {
    console.error('Error getting gym credits:', error);
    return 0;
  }
};