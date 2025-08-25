import { supabase } from '@/integrations/supabase/client';

export interface ActiveSubscription {
  id: string;
  plan_id: string;
  gym_id: string;
  expires_at: string;
  subscription_plans: {
    unlimited_access: boolean;
    credits_included: number;
    name: string;
  };
}

/**
 * Check if user has an active unlimited subscription for a specific gym
 */
export const hasActiveUnlimitedSubscription = async (userId: string, gymId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        subscription_plans!inner(unlimited_access)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('gym_id', gymId)
      .eq('subscription_plans.unlimited_access', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) return false;
    return !!data;
  } catch (error) {
    console.error('Error checking unlimited subscription:', error);
    return false;
  }
};

/**
 * Get user's active subscription for a specific gym
 */
export const getUserActiveSubscription = async (userId: string, gymId: string): Promise<ActiveSubscription | null> => {
  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        plan_id,
        gym_id,
        expires_at,
        subscription_plans!inner(
          unlimited_access,
          credits_included,
          name
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .eq('gym_id', gymId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) return null;
    return data as ActiveSubscription;
  } catch (error) {
    console.error('Error getting active subscription:', error);
    return null;
  }
};

/**
 * Check if user can book without using credits
 */
export const canBookWithoutCredits = async (userId: string, gymId: string): Promise<boolean> => {
  return await hasActiveUnlimitedSubscription(userId, gymId);
};

/**
 * Cancel all active subscriptions for a user in a specific gym
 */
export const cancelActiveSubscriptions = async (userId: string, gymId: string): Promise<void> => {
  try {
    await supabase
      .from('user_subscriptions')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .eq('status', 'active');
  } catch (error) {
    console.error('Error cancelling active subscriptions:', error);
    throw error;
  }
};