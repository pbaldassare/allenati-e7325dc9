import { supabase } from '@/integrations/supabase/client';
import { hasActiveUnlimitedSubscription } from '@/lib/subscriptionHelpers';

export interface RefundEligibilityResult {
  shouldRefund: boolean;
  reason: string;
}

/**
 * Check if a booking cancellation should result in credit refund
 */
export const checkRefundEligibility = async (
  booking: any,
  userRole: 'user' | 'instructor' | 'owner' | 'admin'
): Promise<RefundEligibilityResult> => {
  // Staff (instructor, owner, admin) can always refund
  if (userRole !== 'user') {
    return {
      shouldRefund: true,
      reason: 'Staff cancellation - always eligible for refund'
    };
  }

  // For users, check deadline
  const course = booking.courses || booking.course;
  const bookingDateTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
  const deadlineTime = new Date(bookingDateTime.getTime() - ((course?.deadline_hours || 24) * 60 * 60 * 1000));
  const now = new Date();
  const isWithinDeadline = now <= deadlineTime;

  if (!isWithinDeadline) {
    return {
      shouldRefund: false,
      reason: 'User cancellation past deadline'
    };
  }

  return {
    shouldRefund: true,
    reason: 'User cancellation within deadline'
  };
};

/**
 * Check if user had unlimited subscription when booking was made
 */
export const hadUnlimitedSubscriptionAtBooking = async (
  userId: string,
  gymId: string,
  bookingCreatedAt: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        subscription_plans!inner(unlimited_access)
      `)
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .eq('subscription_plans.unlimited_access', true)
      .lte('starts_at', bookingCreatedAt)
      .gte('expires_at', bookingCreatedAt)
      .single();

    return !!data;
  } catch (error) {
    console.error('Error checking subscription at booking time:', error);
    return false;
  }
};

/**
 * Process credit refund for a cancelled booking
 */
export const processRefund = async (
  booking: any,
  userId: string,
  userRole: 'user' | 'instructor' | 'owner' | 'admin',
  cancellationReason?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Processing refund for booking:', booking.id, 'user:', booking.user_id, 'role:', userRole);
    
    // Check if refund is eligible
    const eligibility = await checkRefundEligibility(booking, userRole);
    console.log('Refund eligibility:', eligibility);
    
    if (!eligibility.shouldRefund) {
      return {
        success: true,
        message: 'Booking cancelled - no refund due to policy'
      };
    }

    // Don't refund if no credits were used (e.g., unlimited subscription)
    if (!booking.credits_used || booking.credits_used <= 0) {
      console.log('No credits used, skipping refund');
      return {
        success: true,
        message: 'Booking cancelled - no credits to refund'
      };
    }

    // Get gym_id - try multiple sources
    let gymId = booking.gym_id;
    const course = booking.courses || booking.course;
    
    if (!gymId && course?.gym_id) {
      gymId = course.gym_id;
    }
    
    // If still no gym_id, fetch it from the course
    if (!gymId && booking.course_id) {
      console.log('Fetching gym_id from course_id:', booking.course_id);
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('gym_id, name')
        .eq('id', booking.course_id)
        .single();
      
      if (courseError) {
        console.error('Error fetching course:', courseError);
        throw new Error('Could not find course information');
      }
      
      gymId = courseData.gym_id;
      console.log('Found gym_id from course:', gymId);
    }

    if (!gymId) {
      throw new Error('Could not determine gym_id for refund');
    }

    // Check if user had unlimited subscription at booking time
    const hadUnlimited = await hadUnlimitedSubscriptionAtBooking(
      booking.user_id,
      gymId,
      booking.created_at
    );

    if (hadUnlimited) {
      console.log('User had unlimited subscription, no refund needed');
      return {
        success: true,
        message: 'Booking cancelled - user had unlimited access, no credits to refund'
      };
    }

    // Get current gym credits for the specific gym
    const { data: gymCreditsData, error: gymCreditsError } = await supabase
      .from('gym_credits')
      .select('credits')
      .eq('user_id', booking.user_id)
      .eq('gym_id', gymId)
      .single();

    if (gymCreditsError && gymCreditsError.code !== 'PGRST116') {
      console.error('Error fetching gym credits:', gymCreditsError);
      throw gymCreditsError;
    }

    const currentCredits = gymCreditsData?.credits || 0;
    const newBalance = currentCredits + booking.credits_used;
    
    console.log('Processing refund:', {
      user_id: booking.user_id,
      gym_id: gymId,
      credits_to_refund: booking.credits_used,
      current_credits: currentCredits,
      new_balance: newBalance
    });

    // Log refund transaction
    const { error: transactionError } = await supabase
      .from('credits_transactions')
      .insert({
        user_id: booking.user_id,
        gym_id: gymId,
        amount: booking.credits_used,
        balance_after: newBalance,
        transaction_type: 'refund',
        description: `Rimborso per cancellazione: ${course?.name || 'corso'} ${cancellationReason ? `(${cancellationReason})` : ''}`,
        reference_id: booking.id
      });

    if (transactionError) {
      console.error('Error creating refund transaction:', transactionError);
      throw transactionError;
    }

    console.log('Refund processed successfully');
    return {
      success: true,
      message: `Booking cancelled - ${booking.credits_used} credits refunded`
    };
  } catch (error) {
    console.error('Error processing refund:', error);
    return {
      success: false,
      message: `Error processing refund: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Deduct credits from user for a booking
 */
export const deductCredits = async (
  userId: string,
  gymId: string,
  amount: number,
  description: string,
  referenceId: string
): Promise<{ success: boolean; message: string; newBalance: number }> => {
  try {
    // Get current gym credits
    const { data: gymCreditsData, error: gymCreditsError } = await supabase
      .from('gym_credits')
      .select('credits')
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .single();

    if (gymCreditsError && gymCreditsError.code !== 'PGRST116') {
      throw gymCreditsError;
    }

    const currentCredits = gymCreditsData?.credits || 0;
    
    if (currentCredits < amount) {
      return {
        success: false,
        message: `Crediti insufficienti. Necessari: ${amount}, Disponibili: ${currentCredits}`,
        newBalance: currentCredits
      };
    }

    const newBalance = currentCredits - amount;

    // Create transaction record
    const { error: transactionError } = await supabase
      .from('credits_transactions')
      .insert({
        user_id: userId,
        gym_id: gymId,
        amount: -amount,
        balance_after: newBalance,
        transaction_type: 'booking',
        description,
        reference_id: referenceId
      });

    if (transactionError) throw transactionError;

    return {
      success: true,
      message: `${amount} crediti utilizzati con successo`,
      newBalance
    };
  } catch (error) {
    console.error('Error deducting credits:', error);
    return {
      success: false,
      message: 'Errore durante la sottrazione crediti',
      newBalance: 0
    };
  }
};

/**
 * Get user role from user_roles table
 */
export const getUserRole = async (userId: string): Promise<'user' | 'instructor' | 'owner' | 'admin'> => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('role', { ascending: true }); // admin, gym_owner, instructor, basic_user

    if (error || !data || data.length === 0) {
      return 'user';
    }

    // Return highest privilege role
    const roles = data.map(r => r.role);
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('gym_owner')) return 'owner';
    if (roles.includes('instructor')) return 'instructor';
    return 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user';
  }
};