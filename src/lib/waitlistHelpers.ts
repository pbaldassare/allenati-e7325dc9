import { supabase } from '@/integrations/supabase/client';
import { checkBookingEligibility } from './bookingHelpers';
import { deductCredits } from './creditRefundHelpers';

export interface WaitlistBookingData {
  sessionId: string;
  courseId: string;
  gymId: string;
  scheduledDate: string;
  scheduledTime: string;
  creditsRequired: number;
}

export interface WaitlistResult {
  success: boolean;
  message: string;
  bookingId?: string;
  position?: number;
}

/**
 * Get the next available waitlist position for a session
 */
export const getNextWaitlistPosition = async (sessionId: string): Promise<number> => {
  const { data, error } = await supabase.rpc('get_next_waitlist_position', {
    p_session_id: sessionId
  });

  if (error) {
    console.error('Error getting next waitlist position:', error);
    // Fallback: query manually
    const { data: bookings } = await supabase
      .from('bookings')
      .select('waitlist_position')
      .eq('session_id', sessionId)
      .eq('status', 'waitlist')
      .order('waitlist_position', { ascending: false })
      .limit(1);
    
    return (bookings?.[0]?.waitlist_position || 0) + 1;
  }

  return data || 1;
};

/**
 * Process a waitlist booking
 */
export const processWaitlistBooking = async (
  userId: string,
  bookingData: WaitlistBookingData
): Promise<WaitlistResult> => {
  try {
    console.log('Processing waitlist booking for user:', userId, 'data:', bookingData);

    // Check eligibility (same as regular booking)
    const eligibility = await checkBookingEligibility(
      userId,
      bookingData.gymId,
      bookingData.creditsRequired
    );

    if (!eligibility.canBook) {
      return {
        success: false,
        message: eligibility.reason || 'Non puoi iscriverti alla lista d\'attesa'
      };
    }

    // Get next position in waitlist
    const position = await getNextWaitlistPosition(bookingData.sessionId);
    console.log('Waitlist position assigned:', position);

    // Create waitlist booking
    const bookingInsertData: any = {
      user_id: userId,
      course_id: bookingData.courseId,
      session_id: bookingData.sessionId,
      scheduled_date: bookingData.scheduledDate,
      scheduled_time: bookingData.scheduledTime,
      status: 'waitlist',
      waitlist_position: position,
      credits_used: eligibility.hasUnlimitedAccess ? 0 : bookingData.creditsRequired
    };

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert(bookingInsertData)
      .select()
      .single();

    if (bookingError) {
      console.error('Waitlist booking creation failed:', bookingError);
      throw bookingError;
    }

    // Deduct credits if not unlimited
    if (!eligibility.hasUnlimitedAccess) {
      console.log('Deducting credits for waitlist...');
      const deductionResult = await deductCredits(
        userId,
        bookingData.gymId,
        bookingData.creditsRequired,
        `Lista d'attesa: prenotazione in sospeso`,
        booking.id
      );

      if (!deductionResult.success) {
        console.log('Credit deduction failed, rolling back waitlist booking');
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

    console.log('Waitlist booking completed successfully at position:', position);
    return {
      success: true,
      message: eligibility.hasUnlimitedAccess
        ? `Iscritto alla lista d'attesa in posizione #${position}`
        : `Iscritto alla lista d'attesa in posizione #${position}. ${bookingData.creditsRequired} credito/i trattenuti.`,
      bookingId: booking.id,
      position
    };

  } catch (error) {
    console.error('Error processing waitlist booking:', error);
    return {
      success: false,
      message: 'Errore durante l\'iscrizione alla lista d\'attesa'
    };
  }
};

/**
 * Cancel a waitlist booking and refund credits
 */
export const cancelWaitlistBooking = async (
  bookingId: string,
  userId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Cancelling waitlist booking:', bookingId);

    // Get booking details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select(`
        *,
        courses(gym_id, name)
      `)
      .eq('id', bookingId)
      .eq('user_id', userId)
      .eq('status', 'waitlist')
      .single();

    if (fetchError || !booking) {
      return {
        success: false,
        message: 'Prenotazione in lista d\'attesa non trovata'
      };
    }

    const gymId = booking.courses?.gym_id;
    const sessionId = booking.session_id;
    const creditsToRefund = booking.credits_used || 0;

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        waitlist_position: null,
        cancelled_at: new Date().toISOString(),
        cancellation_reason: 'Rimosso dalla lista d\'attesa dall\'utente'
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Refund credits if any were used
    if (creditsToRefund > 0 && gymId) {
      // Get current credits
      const { data: currentCredits } = await supabase
        .from('gym_credits')
        .select('credits')
        .eq('user_id', userId)
        .eq('gym_id', gymId)
        .single();

      const newBalance = (currentCredits?.credits || 0) + creditsToRefund;

      // Update credits
      await supabase
        .from('gym_credits')
        .upsert({
          user_id: userId,
          gym_id: gymId,
          credits: newBalance
        }, {
          onConflict: 'user_id,gym_id'
        });

      // Log transaction
      await supabase
        .from('credits_transactions')
        .insert({
          user_id: userId,
          gym_id: gymId,
          amount: creditsToRefund,
          balance_after: newBalance,
          transaction_type: 'refund',
          description: `Rimborso cancellazione lista d'attesa: ${booking.courses?.name || 'corso'}`,
          reference_id: bookingId
        });
    }

    // Recalculate waitlist positions for remaining entries
    if (sessionId) {
      const { data: remainingWaitlist } = await supabase
        .from('bookings')
        .select('id, waitlist_position')
        .eq('session_id', sessionId)
        .eq('status', 'waitlist')
        .order('waitlist_position', { ascending: true });

      if (remainingWaitlist && remainingWaitlist.length > 0) {
        for (let i = 0; i < remainingWaitlist.length; i++) {
          await supabase
            .from('bookings')
            .update({ waitlist_position: i + 1 })
            .eq('id', remainingWaitlist[i].id);
        }
      }
    }

    console.log('Waitlist booking cancelled successfully');
    return {
      success: true,
      message: creditsToRefund > 0
        ? `Rimosso dalla lista d'attesa. ${creditsToRefund} credito/i rimborsati.`
        : 'Rimosso dalla lista d\'attesa.'
    };

  } catch (error) {
    console.error('Error cancelling waitlist booking:', error);
    return {
      success: false,
      message: 'Errore durante la cancellazione dalla lista d\'attesa'
    };
  }
};

/**
 * Manually promote a user from waitlist (for owner/instructor)
 */
export const promoteFromWaitlist = async (
  bookingId: string
): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('Manually promoting from waitlist:', bookingId);

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'confirmed',
        waitlist_position: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)
      .eq('status', 'waitlist');

    if (error) throw error;

    // Recalculate positions for remaining waitlist
    const { data: booking } = await supabase
      .from('bookings')
      .select('session_id')
      .eq('id', bookingId)
      .single();

    if (booking?.session_id) {
      const { data: remainingWaitlist } = await supabase
        .from('bookings')
        .select('id')
        .eq('session_id', booking.session_id)
        .eq('status', 'waitlist')
        .order('waitlist_position', { ascending: true });

      if (remainingWaitlist) {
        for (let i = 0; i < remainingWaitlist.length; i++) {
          await supabase
            .from('bookings')
            .update({ waitlist_position: i + 1 })
            .eq('id', remainingWaitlist[i].id);
        }
      }
    }

    return {
      success: true,
      message: 'Utente promosso dalla lista d\'attesa'
    };

  } catch (error) {
    console.error('Error promoting from waitlist:', error);
    return {
      success: false,
      message: 'Errore durante la promozione dalla lista d\'attesa'
    };
  }
};
