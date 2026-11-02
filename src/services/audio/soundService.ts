import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_ENABLED_KEY = '@tripsplit_notification_sound_enabled';
let isSoundEnabledCache: boolean | null = null;

// Preloaded audio asset
const NOTIFICATION_SOUND_ASSET = require('../../../assets/sounds/notification.wav');

/**
 * Checks if notification sound is enabled in user preferences.
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
 * Toggles or sets notification sound preference.
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
 * Plays the pleasant notification chime.
 * Unloads the audio resource from memory immediately after playback completes.
 */
export async function playNotificationSound(): Promise<void> {
  try {
    const enabled = await isSoundEnabled();
    if (!enabled) return;

    // Configure audio mode to play safely
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
    });

    const { sound } = await Audio.Sound.createAsync(
      NOTIFICATION_SOUND_ASSET,
      { shouldPlay: true, volume: 1.0 },
      (status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
        }
      }
    );
  } catch (error) {
    // Graceful fallback - never interrupt user flow if device audio fails
    console.warn('Notification sound playback notice:', error);
  }
}
