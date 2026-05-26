import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const isNativeApp = () => Capacitor.isNativePlatform();

export const supabaseAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isNativeApp()) {
      const { value } = await Preferences.get({ key });
      return value;
    }

    return window.localStorage.getItem(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (isNativeApp()) {
      await Preferences.set({ key, value });
      return;
    }

    window.localStorage.setItem(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (isNativeApp()) {
      await Preferences.remove({ key });
      return;
    }

    window.localStorage.removeItem(key);
  },
};