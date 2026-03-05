import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { setNotificationPreferences as syncOneSignalTags } from '@/lib/onesignal';

interface NotificationPreferences {
  notifications_enabled: boolean;
  push_bookings: boolean;
  push_promotions: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  notifications_enabled: true,
  push_bookings: true,
  push_promotions: true,
};

export function useNotificationPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load preferences from Supabase
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadPrefs = async () => {
      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('notifications_enabled, push_bookings, push_promotions')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          const prefs = {
            notifications_enabled: data.notifications_enabled ?? true,
            push_bookings: data.push_bookings ?? true,
            push_promotions: data.push_promotions ?? true,
          };
          setPreferences(prefs);
          // Sync tags on load
          syncOneSignalTags(prefs);
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPrefs();
  }, [user]);

  // Update a single preference
  const updatePreference = useCallback(async (key: keyof NotificationPreferences, value: boolean) => {
    if (!user) return;

    setSaving(true);
    const newPrefs = { ...preferences, [key]: value };

    // If disabling globally, also disable sub-preferences
    if (key === 'notifications_enabled' && !value) {
      newPrefs.push_bookings = false;
      newPrefs.push_promotions = false;
    }

    setPreferences(newPrefs);

    try {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          notifications_enabled: newPrefs.notifications_enabled,
          push_bookings: newPrefs.push_bookings,
          push_promotions: newPrefs.push_promotions,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Sync with OneSignal tags
      syncOneSignalTags(newPrefs);
    } catch (error) {
      console.error('Error saving notification preferences:', error);
      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  }, [user, preferences]);

  return { preferences, loading, saving, updatePreference };
}
