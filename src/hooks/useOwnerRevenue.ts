import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RevenueStats {
  weeklyRevenue: number;
  monthlyRevenue: number;
  weeklyTrend: number;
}

interface SubscriptionStats {
  newSubscriptionsThisMonth: number;
  totalActiveSubscriptions: number;
  monthlySubscriptionRevenue: number;
  monthlyOneTimeRevenue: number;
  revenueBreakdown: {
    subscriptions: number;
    oneTime: number;
    total: number;
  };
}

export const useOwnerRevenue = () => {
  const { user } = useAuth();
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    weeklyTrend: 0,
  });
  const [subscriptionStats, setSubscriptionStats] = useState<SubscriptionStats>({
    newSubscriptionsThisMonth: 0,
    totalActiveSubscriptions: 0,
    monthlySubscriptionRevenue: 0,
    monthlyOneTimeRevenue: 0,
    revenueBreakdown: {
      subscriptions: 0,
      oneTime: 0,
      total: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;

      try {
        // Get user's gym
        const { data: membership } = await supabase
          .from('user_gym_memberships')
          .select('gym_id')
          .eq('user_id', user.id)
          .eq('status', 'active')
          .eq('membership_type', 'owner')
          .single();

        if (!membership) return;

        const gymId = membership.gym_id;

        // Calculate dates
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);
        const endOfLastWeek = new Date(startOfLastWeek);
        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);

        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Get gym members for revenue calculations
        const { data: gymMembers } = await supabase
          .from('user_gym_memberships')
          .select('user_id')
          .eq('gym_id', gymId)
          .eq('status', 'active');

        const memberIds = gymMembers?.map(m => m.user_id) || [];

        // Get weekly revenue from payments
        const { data: weeklyPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'completed')
          .in('user_id', memberIds)
          .gte('created_at', startOfWeek.toISOString())
          .lte('created_at', endOfWeek.toISOString());

        const weeklyRevenue = weeklyPayments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;

        // Get last week's revenue for trend
        const { data: lastWeekPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'completed')
          .in('user_id', memberIds)
          .gte('created_at', startOfLastWeek.toISOString())
          .lte('created_at', endOfLastWeek.toISOString());

        const lastWeekRevenue = lastWeekPayments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
        const weeklyTrend = lastWeekRevenue > 0 ? ((weeklyRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;

        // Get monthly revenue from payments
        const { data: monthlyPayments } = await supabase
          .from('payments')
          .select('amount, reference_type')
          .eq('status', 'completed')
          .in('user_id', memberIds)
          .gte('created_at', startOfMonth.toISOString());

        const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;

        // Calculate revenue breakdown
        let monthlySubscriptionRevenue = 0;
        let monthlyOneTimeRevenue = 0;

        monthlyPayments?.forEach((payment) => {
          const amount = Number(payment.amount || 0);
          if (payment.reference_type === 'subscription') {
            monthlySubscriptionRevenue += amount;
          } else {
            monthlyOneTimeRevenue += amount;
          }
        });

        // Get new subscriptions this month
        const { data: newSubscriptions } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('gym_id', gymId)
          .eq('status', 'active')
          .gte('starts_at', startOfMonth.toISOString());

        // Get total active subscriptions
        const { data: activeSubscriptions } = await supabase
          .from('user_subscriptions')
          .select('id')
          .eq('gym_id', gymId)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString());

        setRevenueStats({
          weeklyRevenue,
          monthlyRevenue,
          weeklyTrend,
        });

        setSubscriptionStats({
          newSubscriptionsThisMonth: newSubscriptions?.length || 0,
          totalActiveSubscriptions: activeSubscriptions?.length || 0,
          monthlySubscriptionRevenue,
          monthlyOneTimeRevenue,
          revenueBreakdown: {
            subscriptions: monthlySubscriptionRevenue,
            oneTime: monthlyOneTimeRevenue,
            total: monthlyRevenue,
          },
        });
      } catch (error) {
        console.error('Error fetching revenue stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  return {
    revenueStats,
    subscriptionStats,
    loading,
  };
};