import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface RevenueStats {
  weeklyEstimatedCredits: number;
  monthlyEstimatedCredits: number;
  weeklyTrend: number;
}

interface CreditTransactionStats {
  monthlyCreditsAdded: number;
  monthlyCreditsUsed: number;
  monthlyRefunds: number;
  totalTransactions: number;
  transactionBreakdown: {
    manual: number;
    automatic: number;
    purchases: number;
    refunds: number;
  };
}

export const useOwnerRevenue = () => {
  const { user } = useAuth();
  const [revenueStats, setRevenueStats] = useState<RevenueStats>({
    weeklyEstimatedCredits: 0,
    monthlyEstimatedCredits: 0,
    weeklyTrend: 0,
  });
  const [creditStats, setCreditStats] = useState<CreditTransactionStats>({
    monthlyCreditsAdded: 0,
    monthlyCreditsUsed: 0,
    monthlyRefunds: 0,
    totalTransactions: 0,
    transactionBreakdown: {
      manual: 0,
      automatic: 0,
      purchases: 0,
      refunds: 0,
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

        // Get weekly estimated revenue (current week)
        const { data: weeklyBookings } = await supabase
          .from('bookings')
          .select(`
            credits_used,
            courses!inner(gym_id)
          `)
          .eq('status', 'confirmed')
          .eq('courses.gym_id', gymId)
          .gte('scheduled_date', startOfWeek.toISOString().split('T')[0])
          .lte('scheduled_date', endOfWeek.toISOString().split('T')[0]);

        const weeklyCredits = weeklyBookings?.reduce((sum, booking) => sum + (booking.credits_used || 0), 0) || 0;

        // Get last week's estimated revenue for trend
        const { data: lastWeekBookings } = await supabase
          .from('bookings')
          .select(`
            credits_used,
            courses!inner(gym_id)
          `)
          .eq('status', 'confirmed')
          .eq('courses.gym_id', gymId)
          .gte('scheduled_date', startOfLastWeek.toISOString().split('T')[0])
          .lte('scheduled_date', endOfLastWeek.toISOString().split('T')[0]);

        const lastWeekCredits = lastWeekBookings?.reduce((sum, booking) => sum + (booking.credits_used || 0), 0) || 0;
        const weeklyTrend = lastWeekCredits > 0 ? ((weeklyCredits - lastWeekCredits) / lastWeekCredits) * 100 : 0;

        // Get monthly estimated revenue
        const { data: monthlyBookings } = await supabase
          .from('bookings')
          .select(`
            credits_used,
            courses!inner(gym_id)
          `)
          .eq('status', 'confirmed')
          .eq('courses.gym_id', gymId)
          .gte('scheduled_date', startOfMonth.toISOString().split('T')[0]);

        const monthlyCredits = monthlyBookings?.reduce((sum, booking) => sum + (booking.credits_used || 0), 0) || 0;

        // Get credit transactions for this month
        const { data: transactions } = await supabase
          .from('credits_transactions')
          .select('*')
          .eq('gym_id', gymId)
          .gte('created_at', startOfMonth.toISOString());

        let monthlyCreditsAdded = 0;
        let monthlyCreditsUsed = 0;
        let monthlyRefunds = 0;
        const breakdown = {
          manual: 0,
          automatic: 0,
          purchases: 0,
          refunds: 0,
        };

        transactions?.forEach((transaction) => {
          if (transaction.amount > 0) {
            monthlyCreditsAdded += transaction.amount;
          } else {
            monthlyCreditsUsed += Math.abs(transaction.amount);
          }

          // Categorize transactions
          switch (transaction.transaction_type) {
            case 'manual_credit':
            case 'admin_grant':
              breakdown.manual += Math.abs(transaction.amount);
              break;
            case 'booking':
              breakdown.automatic += Math.abs(transaction.amount);
              break;
            case 'one_time_purchase':
            case 'subscription_credits':
              breakdown.purchases += Math.abs(transaction.amount);
              break;
            case 'refund':
              monthlyRefunds += Math.abs(transaction.amount);
              breakdown.refunds += Math.abs(transaction.amount);
              break;
          }
        });

        setRevenueStats({
          weeklyEstimatedCredits: weeklyCredits,
          monthlyEstimatedCredits: monthlyCredits,
          weeklyTrend,
        });

        setCreditStats({
          monthlyCreditsAdded,
          monthlyCreditsUsed,
          monthlyRefunds,
          totalTransactions: transactions?.length || 0,
          transactionBreakdown: breakdown,
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
    creditStats,
    loading,
  };
};