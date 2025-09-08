import { supabase } from '@/integrations/supabase/client';
import { getUserActiveSubscription, hasActiveUnlimitedSubscription } from './subscriptionHelpers';
import { deductCredits } from './creditRefundHelpers';

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
    // First check for unlimited subscription
    const hasUnlimited = await hasActiveUnlimitedSubscription(userId, gymId);
    
    if (hasUnlimited) {
      return {
        canBook: true,
        hasUnlimitedAccess: true,
        gymCredits: 0
      };
    }

    // Check gym-specific credits
    const { data: gymCredits } = await supabase
      .from('gym_credits')
      .select('credits')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .maybeSingle();

    const availableCredits = gymCredits?.credits || 0;

    if (availableCredits >= creditsRequired) {
      return {
        canBook: true,
        hasUnlimitedAccess: false,
        gymCredits: availableCredits
      };
    }

    return {
      canBook: false,
      hasUnlimitedAccess: false,
      gymCredits: availableCredits,
      reason: `Crediti insufficienti. Necessari: ${creditsRequired}, disponibili: ${availableCredits}`
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
    // Check eligibility first
    const eligibility = await checkBookingEligibility(
      userId, 
      bookingData.gymId, 
      bookingData.creditsRequired
    );

    if (!eligibility.canBook) {
      return {
        success: false,
        message: eligibility.reason || 'Non puoi prenotare questa sessione'
      };
    }

    // Check session availability if sessionId provided
    if (bookingData.sessionId) {
      const { data: session } = await supabase
        .from('course_sessions')
        .select('available_spots')
        .eq('id', bookingData.sessionId)
        .single();

      if (!session || session.available_spots <= 0) {
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

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingInsertData)
      .select()
      .single();

    if (bookingError) throw bookingError;

    // Deduct credits if not unlimited
    if (!eligibility.hasUnlimitedAccess) {
      const deductionResult = await deductCredits(
        userId,
        bookingData.gymId,
        bookingData.creditsRequired,
        `Prenotazione sessione`,
        booking.id
      );

      if (!deductionResult.success) {
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