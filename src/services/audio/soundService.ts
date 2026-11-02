import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration } from 'react-native';

const SOUND_ENABLED_KEY = '@tripsplit_notification_sound_enabled';
let isSoundEnabledCache: boolean | null = null;

/**
 * Checks if notification sound / haptics is enabled in user preferences.
 */
export async function isSoundEnabled(): Promise<boolean> {
  if (isSoundEnabledCache !== null) {
    return isSoundEnabledCache;
  }
  try {
    const val = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
    isSoundEnabledCache = val !== 'false';
    return isSoundEnabledCache;
  } catch {
    return true;
  }
}

/**
 * Toggles or sets notification sound / haptics preference.
 */
export async function setSoundEnabled(enabled: boolean): Promise<void> {
  try {
    isSoundEnabledCache = enabled;
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch (err) {
    console.warn('Failed to save sound preference:', err);
  }
}

/**
 * Plays subtle notification feedback (gentle haptic pulse).
 * Non-blocking, completely safe across all platforms without native module dependencies.
 */
export async function playNotificationSound(): Promise<void> {
  try {
    const enabled = await isSoundEnabled();
    if (!enabled) return;

    try {
      Vibration.vibrate(60);
    } catch {
      // Safe no-op on platforms without vibration support
    }
  } catch (error) {
    console.warn('Notification sound notice:', error);
  }
}
