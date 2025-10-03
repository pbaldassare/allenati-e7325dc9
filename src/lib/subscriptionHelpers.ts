import { supabase } from '@/integrations/supabase/client';

export interface ActiveSubscription {
  id: string;
  plan_id: string;
  gym_id: string;
  expires_at: string;
  starts_at: string;
  activated_at?: string;
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
    
    const subscriptions = await getUserActiveSubscriptions(userId, gymId);
    const hasUnlimited = subscriptions.some(sub => sub.subscription_plans.unlimited_access);
    
    console.log('Unlimited subscription check result:', hasUnlimited);
    return hasUnlimited;
  } catch (error) {
    console.error('Error checking unlimited subscription:', error);
    return false;
  }
};

/**
 * Get ALL user's active subscriptions for a specific gym
 */
export const getUserActiveSubscriptions = async (userId: string, gymId: string): Promise<ActiveSubscription[]> => {
  try {
    console.log('🔍 [getUserActiveSubscriptions] Checking subscriptions for user:', userId, 'gym:', gymId);
    
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select(`
        id,
        plan_id,
        gym_id,
        expires_at,
        starts_at,
        status,
        activated_at,
        subscription_plans!inner(
          unlimited_access,
          credits_included,
          name
        )
      `)
      .eq('user_id', userId)
      .eq('gym_id', gymId)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString())
      .order('activated_at', { ascending: false });

    console.log('🔍 [getUserActiveSubscriptions] Active subscriptions:', data);

    if (error) {
      console.error('🔍 [getUserActiveSubscriptions] Error:', error);
      return [];
    }

    return (data || []) as ActiveSubscription[];
  } catch (error) {
    console.error('🔍 [getUserActiveSubscriptions] Error getting active subscriptions:', error);
    return [];
  }
};

/**
 * Get user's active subscription for a specific gym (returns first active subscription for compatibility)
 */
export const getUserActiveSubscription = async (userId: string, gymId: string): Promise<ActiveSubscription | null> => {
  const subscriptions = await getUserActiveSubscriptions(userId, gymId);
  return subscriptions.length > 0 ? subscriptions[0] : null;
};

/**
 * Check if user can book without using credits
 */
export const canBookWithoutCredits = async (userId: string, gymId: string): Promise<boolean> => {
  return await hasActiveUnlimitedSubscription(userId, gymId);
};

/**
 * Get total available credits from all active non-unlimited subscriptions
 */
export const getTotalAvailableCredits = async (userId: string, gymId: string): Promise<number> => {
  try {
    const subscriptions = await getUserActiveSubscriptions(userId, gymId);
    
    // Sum credits from all non-unlimited subscriptions
    const totalCredits = subscriptions
      .filter(sub => !sub.subscription_plans.unlimited_access)
      .reduce((total, sub) => total + (sub.subscription_plans.credits_included || 0), 0);
    
    console.log('Total available credits from subscriptions:', totalCredits);
    return totalCredits;
  } catch (error) {
    console.error('Error getting total available credits:', error);
    return 0;
  }
};