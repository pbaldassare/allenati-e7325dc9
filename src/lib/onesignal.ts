// OneSignal Push Notifications integration module

declare global {
  interface Window {
    OneSignalDeferred?: Array<(OneSignal: any) => void>;
    OneSignal?: any;
  }
}

const ONESIGNAL_APP_ID = '2936021b-a20f-44bb-81dd-0cba1d64c481';

let isInitialized = false;

const canUseOneSignal = () =>
  typeof window !== 'undefined' &&
  ['allenati.me', 'www.allenati.me', 'admin.allenati.me', 'localhost'].includes(window.location.hostname);

/**
 * Initialize OneSignal SDK
 */
export const initOneSignal = (): void => {
  if (isInitialized) return;
  if (!canUseOneSignal()) return;
  
  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      try {
        await OneSignal.init({
          appId: ONESIGNAL_APP_ID,
          safari_web_id: 'web.onesignal.auto.2900aeea-27da-4bc5-9f95-2e3d9a76781c',
          notifyButton: {
            enable: false, // We handle this in-app
          },
          allowLocalhostAsSecureOrigin: true,
        });
        console.log('OneSignal: SDK initialized');
        isInitialized = true;
      } catch (error) {
        console.warn('OneSignal: Initialization skipped', error);
      }
    });
  } catch (error) {
    console.error('OneSignal: Initialization error', error);
  }
};

/**
 * Associate the Supabase user with OneSignal
 */
export const setExternalUserId = (userId: string): void => {
  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.login(userId);
      console.log('OneSignal: User linked', userId);
    });
  } catch (error) {
    console.error('OneSignal: Error setting external user ID', error);
  }
};

/**
 * Remove external user ID on logout
 */
export const removeExternalUserId = (): void => {
  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.logout();
      console.log('OneSignal: User unlinked');
    });
  } catch (error) {
    console.error('OneSignal: Error removing external user ID', error);
  }
};

/**
 * Sync notification preferences as OneSignal tags for server-side segmentation
 */
export const setNotificationPreferences = (prefs: {
  push_bookings: boolean;
  push_promotions: boolean;
  notifications_enabled: boolean;
}): void => {
  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      await OneSignal.User.addTags({
        push_bookings: prefs.push_bookings ? 'true' : 'false',
        push_promotions: prefs.push_promotions ? 'true' : 'false',
        notifications_enabled: prefs.notifications_enabled ? 'true' : 'false',
      });
      console.log('OneSignal: Tags updated', prefs);
    });
  } catch (error) {
    console.error('OneSignal: Error setting tags', error);
  }
};

/**
 * Request push notification permission
 */
export const requestPermission = (): void => {
  try {
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async (OneSignal: any) => {
      const permission = await OneSignal.Notifications.requestPermission();
      console.log('OneSignal: Permission result', permission);
    });
  } catch (error) {
    console.error('OneSignal: Error requesting permission', error);
  }
};
