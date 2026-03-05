import { supabase } from '@/integrations/supabase/client';

/**
 * Send a push notification via the edge function (fire-and-forget)
 */
export const sendPushNotification = (params: {
  userId: string;
  title: string;
  message: string;
  type: 'booking' | 'payment' | 'course_update' | 'system';
  data?: Record<string, unknown>;
}): void => {
  supabase.functions.invoke('send-push-notification', {
    body: params,
  }).then(({ error }) => {
    if (error) {
      console.error('Push notification error:', error);
    } else {
      console.log('Push notification sent for:', params.type);
    }
  }).catch((err) => {
    console.error('Push notification failed:', err);
  });
};
