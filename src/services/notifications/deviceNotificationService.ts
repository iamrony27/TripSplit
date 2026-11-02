import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_ALLOWED_KEY = '@tripsplit_phone_notifications_enabled';

// Configure how notifications appear when app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Initializes notification channels on Android and verifies permissions.
 */
export async function initDeviceNotifications(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'TripSplit Notifications',
        description: 'Instant alerts for payments, join requests, and settlements',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#1E40AF',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
      });
    }

    return await requestNotificationPermissions();
  } catch (error) {
    console.warn('Failed to initialize device notifications:', error);
    return false;
  }
}

/**
 * Requests operating system notification permissions from the user.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    const granted = finalStatus === 'granted';
    await AsyncStorage.setItem(NOTIFICATIONS_ALLOWED_KEY, granted ? 'true' : 'false');
    return granted;
  } catch (error) {
    console.warn('Error requesting notification permissions:', error);
    return false;
  }
}

/**
 * Checks whether device notification permissions are currently granted.
 */
export async function checkNotificationPermissions(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Sends an immediate local push notification to the user's phone with default sound.
 */
export async function sendPhoneNotification(params: {
  title: string;
  body: string;
  data?: Record<string, any>;
}): Promise<void> {
  const { title, body, data } = params;
  try {
    const isGranted = await checkNotificationPermissions();
    if (!isGranted) {
      // Attempt once to request permissions if not granted yet
      const requested = await requestNotificationPermissions();
      if (!requested) return;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // deliver immediately
    });
  } catch (error) {
    console.warn('Failed to send phone notification:', error);
  }
}
