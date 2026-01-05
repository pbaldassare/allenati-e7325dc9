import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface WaitlistEntry {
  id: string;
  user_id: string;
  session_id: string;
  waitlist_position: number;
  credits_used: number;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
    email: string;
    profile_picture_url?: string;
  };
}

export const useWaitlist = (sessionId?: string) => {
  const { user } = useAuth();
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [userWaitlistPosition, setUserWaitlistPosition] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWaitlist = useCallback(async () => {
    if (!sessionId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          user_id,
          session_id,
          waitlist_position,
          credits_used,
          created_at,
          profiles!inner(
            first_name,
            last_name,
            email,
            profile_picture_url
          )
        `)
        .eq('session_id', sessionId)
        .eq('status', 'waitlist')
        .order('waitlist_position', { ascending: true });

      if (error) throw error;

      const entries: WaitlistEntry[] = (data || []).map((entry: any) => ({
        id: entry.id,
        user_id: entry.user_id,
        session_id: entry.session_id,
        waitlist_position: entry.waitlist_position,
        credits_used: entry.credits_used,
        created_at: entry.created_at,
        user: entry.profiles ? {
          first_name: entry.profiles.first_name || 'Utente',
          last_name: entry.profiles.last_name || '',
          email: entry.profiles.email || '',
          profile_picture_url: entry.profiles.profile_picture_url
        } : undefined
      }));

      setWaitlistEntries(entries);

      // Check if current user is in waitlist
      if (user) {
        const userEntry = entries.find(e => e.user_id === user.id);
        setUserWaitlistPosition(userEntry?.waitlist_position || null);
      }
    } catch (error) {
      console.error('Error fetching waitlist:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionId, user]);

  const isUserInWaitlist = useCallback((checkSessionId?: string): boolean => {
    if (!user) return false;
    const targetSessionId = checkSessionId || sessionId;
    return waitlistEntries.some(e => e.user_id === user.id && e.session_id === targetSessionId);
  }, [user, sessionId, waitlistEntries]);

  const getUserWaitlistEntry = useCallback((checkSessionId?: string): WaitlistEntry | undefined => {
    if (!user) return undefined;
    const targetSessionId = checkSessionId || sessionId;
    return waitlistEntries.find(e => e.user_id === user.id && e.session_id === targetSessionId);
  }, [user, sessionId, waitlistEntries]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!sessionId) return;

    fetchWaitlist();

    const channel = supabase
      .channel(`waitlist-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `session_id=eq.${sessionId}`
        },
        () => {
          fetchWaitlist();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, fetchWaitlist]);

  return {
    waitlistEntries,
    userWaitlistPosition,
    loading,
    fetchWaitlist,
    isUserInWaitlist,
    getUserWaitlistEntry
  };
};

// Hook per controllare se l'utente è in waitlist per qualsiasi sessione
export const useUserWaitlistStatus = () => {
  const { user } = useAuth();
  const [userWaitlistBookings, setUserWaitlistBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchUserWaitlistBookings = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          session_id,
          course_id,
          waitlist_position,
          credits_used,
          scheduled_date,
          scheduled_time,
          courses(name, gym_id)
        `)
        .eq('user_id', user.id)
        .eq('status', 'waitlist')
        .order('waitlist_position', { ascending: true });

      if (error) throw error;
      setUserWaitlistBookings(data || []);
    } catch (error) {
      console.error('Error fetching user waitlist bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const isInWaitlistForSession = useCallback((sessionId: string): boolean => {
    return userWaitlistBookings.some(b => b.session_id === sessionId);
  }, [userWaitlistBookings]);

  const getWaitlistPosition = useCallback((sessionId: string): number | null => {
    const booking = userWaitlistBookings.find(b => b.session_id === sessionId);
    return booking?.waitlist_position || null;
  }, [userWaitlistBookings]);

  const getWaitlistBookingId = useCallback((sessionId: string): string | null => {
    const booking = userWaitlistBookings.find(b => b.session_id === sessionId);
    return booking?.id || null;
  }, [userWaitlistBookings]);

  useEffect(() => {
    if (!user) return;

    fetchUserWaitlistBookings();

    const channel = supabase
      .channel(`user-waitlist-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchUserWaitlistBookings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchUserWaitlistBookings]);

  return {
    userWaitlistBookings,
    loading,
    fetchUserWaitlistBookings,
    isInWaitlistForSession,
    getWaitlistPosition,
    getWaitlistBookingId
  };
};
