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
    console.log('Checking unlimited subscription for user:', userId, 'gym:', gymId);
    
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
      .maybeSingle();

    console.log('Unlimited subscription check result:', { data, error });
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking unlimited subscription:', error);
      return false;
    }
    
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
    console.log('🔍 [getUserActiveSubscription] Checking subscription for user:', userId, 'gym:', gymId);
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        plan_id,
        gym_id,
        expires_at,
        status,
        subscription_plans!inner(
          unlimited_access,
          credits_included,
          name
        )
      `)
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false });

    console.log('🔍 [getUserActiveSubscription] All subscriptions for user:', data);

    if (error) {
      console.error('🔍 [getUserActiveSubscription] Error:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('🔍 [getUserActiveSubscription] No subscriptions found');
      return null;
    }

    // Filter for active and non-expired subscriptions
    const now = new Date().toISOString();
    const activeSubscriptions = data.filter(sub => 
      sub.status === 'active' && 
      new Date(sub.expires_at) > new Date(now)
    );

    console.log('🔍 [getUserActiveSubscription] Active subscriptions:', activeSubscriptions);

    if (activeSubscriptions.length === 0) {
      console.log('🔍 [getUserActiveSubscription] No active/valid subscriptions found');
      return null;
    }

    const result = activeSubscriptions[0] as ActiveSubscription;
    console.log('🔍 [getUserActiveSubscription] Returning subscription:', result);
    return result;
  } catch (error) {
    console.error('🔍 [getUserActiveSubscription] Error getting active subscription:', error);
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