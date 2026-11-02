import AsyncStorage from '@react-native-async-storage/async-storage';
import { Vibration } from 'react-native';

const SOUND_ENABLED_KEY = '@tripsplit_notification_sound_enabled';
let isSoundEnabledCache: boolean | null = null;

// Safe loading of audio asset
let notificationSoundAsset: any = null;
try {
  notificationSoundAsset = require('../../../assets/sounds/notification.wav');
} catch {
  notificationSoundAsset = null;
}

// Lazy-loaded audio module reference with graceful fallback for environments
// lacking the native ExponentAV module (e.g., modern Expo Go SDK)
let AudioModule: any = null;
let audioModuleChecked = false;

function getAudioModule(): any {
  if (!audioModuleChecked) {
    audioModuleChecked = true;
    try {
      // In Expo Go, require('expo-av') throws "Cannot find native module 'ExponentAV'"
      // Catching this prevents the entire application bundle from crashing on load
      const expoAv = require('expo-av');
      if (expoAv && expoAv.Audio) {
        AudioModule = expoAv.Audio;
      }
    } catch {
      AudioModule = null;
    }
  }
  return AudioModule;
}

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
 * Safely falls back to subtle haptic vibration if native audio is unavailable (e.g. in Expo Go).
 */
export async function playNotificationSound(): Promise<void> {
  try {
    const enabled = await isSoundEnabled();
    if (!enabled) return;

    const Audio = getAudioModule();
    if (Audio && notificationSoundAsset) {
      // Configure audio mode to play safely
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        notificationSoundAsset,
        { shouldPlay: true, volume: 1.0 },
        (status: any) => {
          if (status && status.isLoaded && status.didJustFinish) {
            sound.unloadAsync().catch(() => {});
          }
        }
      );
    } else {
      // Gentle haptic feedback fallback when ExponentAV native binary is not present in runtime
      try {
        Vibration.vibrate(60);
      } catch {
        // Safe no-op on platforms without vibration support
      }
    }
  } catch (error) {
    // Graceful fallback - never interrupt user flow if device audio fails
    console.warn('Notification sound playback notice:', error);
  }
}
