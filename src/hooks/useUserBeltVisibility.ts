import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useUserBeltVisibility = () => {
  const [shouldShowBelt, setShouldShowBelt] = useState(false);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const checkBeltVisibility = async () => {
      if (!user?.id) {
        setShouldShowBelt(false);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('user_practices_martial_arts', { _user_id: user.id });

        if (error) throw error;
        setShouldShowBelt(data || false);
      } catch (err) {
        console.error('Error checking belt visibility:', err);
        setShouldShowBelt(false);
      } finally {
        setLoading(false);
      }
    };

    checkBeltVisibility();
  }, [user?.id]);

  return { shouldShowBelt, loading };
};