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

interface TotalRevenueStats {
  totalRevenue: number;
  previousMonthRevenue: number;
  monthlyTrend: number;
}

interface SubscriptionCoverage {
  totalNormalUsers: number;
  usersWithSubscriptions: number;
  coveragePercentage: number;
}

interface SubscriptionTypeBreakdown {
  [key: string]: {
    count: number;
    revenue: number;
    name: string;
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
  const [totalRevenueStats, setTotalRevenueStats] = useState<TotalRevenueStats>({
    totalRevenue: 0,
    previousMonthRevenue: 0,
    monthlyTrend: 0,
  });
  const [subscriptionCoverage, setSubscriptionCoverage] = useState<SubscriptionCoverage>({
    totalNormalUsers: 0,
    usersWithSubscriptions: 0,
    coveragePercentage: 0,
  });
  const [subscriptionTypeBreakdown, setSubscriptionTypeBreakdown] = useState<SubscriptionTypeBreakdown>({});
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

        // Get total revenue (all time)
        const { data: allTimePayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'completed')
          .in('user_id', memberIds);

        const totalRevenue = allTimePayments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;

        // Get previous month revenue for trend
        const startOfPreviousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const { data: previousMonthPayments } = await supabase
          .from('payments')
          .select('amount')
          .eq('status', 'completed')
          .in('user_id', memberIds)
          .gte('created_at', startOfPreviousMonth.toISOString())
          .lte('created_at', endOfPreviousMonth.toISOString());

        const previousMonthRevenue = previousMonthPayments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0;
        const monthlyTrend = previousMonthRevenue > 0 ? ((monthlyRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0;

        // Get normal users count (excluding instructors and owners)
        const { data: normalUsers } = await supabase
          .from('user_gym_memberships')
          .select('user_id')
          .eq('gym_id', gymId)
          .eq('status', 'active')
          .eq('membership_type', 'member');

        // Get users with active subscriptions
        const { data: usersWithSubs } = await supabase
          .from('user_subscriptions')
          .select('user_id')
          .eq('gym_id', gymId)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString());

        const totalNormalUsers = normalUsers?.length || 0;
        const usersWithSubscriptions = new Set(usersWithSubs?.map(sub => sub.user_id) || []).size;
        const coveragePercentage = totalNormalUsers > 0 ? (usersWithSubscriptions / totalNormalUsers) * 100 : 0;

        // Get subscription type breakdown
        const { data: subscriptionPlans } = await supabase
          .from('user_subscriptions')
          .select(`
            subscription_plans!inner(
              name,
              price
            )
          `)
          .eq('gym_id', gymId)
          .eq('status', 'active')
          .gt('expires_at', new Date().toISOString());

        const typeBreakdown: SubscriptionTypeBreakdown = {};
        subscriptionPlans?.forEach((sub: any) => {
          const planName = sub.subscription_plans?.name || 'Unknown';
          const planPrice = Number(sub.subscription_plans?.price || 0);
          
          if (!typeBreakdown[planName]) {
            typeBreakdown[planName] = {
              count: 0,
              revenue: 0,
              name: planName,
            };
          }
          typeBreakdown[planName].count += 1;
          typeBreakdown[planName].revenue += planPrice;
        });

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

        setTotalRevenueStats({
          totalRevenue,
          previousMonthRevenue,
          monthlyTrend,
        });

        setSubscriptionCoverage({
          totalNormalUsers,
          usersWithSubscriptions,
          coveragePercentage,
        });

        setSubscriptionTypeBreakdown(typeBreakdown);
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
    totalRevenueStats,
    subscriptionCoverage,
    subscriptionTypeBreakdown,
    loading,
  };
};