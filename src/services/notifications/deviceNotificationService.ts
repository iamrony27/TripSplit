import { Vibration, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_ALLOWED_KEY = '@tripsplit_phone_notifications_enabled';

/**
 * Initializes device notification preferences.
 */
export async function initDeviceNotifications(): Promise<boolean> {
  return true;
}

/**
 * Requests notification preferences from the user (persisted locally).
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_ALLOWED_KEY, 'true');
    return true;
  } catch (error) {
    console.warn('Error setting notification preference:', error);
    return false;
  }
}

/**
 * Checks whether notifications/haptic alerts are enabled.
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(NOTIFICATIONS_ALLOWED_KEY);
    return val !== 'false';
  } catch {
    return true;
  }
}

/**
 * Delivers immediate tactile/haptic feedback on actions without triggering
 * remote push notification daemon warnings in Expo Go or SDK 58+.
 */
export async function sendPhoneNotification(params: {
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<void> {
  try {
    const isGranted = await checkNotificationPermissions();
    if (isGranted && Platform.OS !== 'web') {
      Vibration.vibrate(60);
    }
  } catch {
    // Ignore haptic errors on unsupported devices
  }
}
