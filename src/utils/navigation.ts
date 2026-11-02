import { useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/**
 * Safely navigates back if there is a screen in the history stack,
 * otherwise navigates to the specified fallback route using replace.
 * Prevents React Navigation's "The action 'GO_BACK' was not handled by any navigator" error.
 */
export function safeGoBack(router: AppRouter, fallbackRoute: string = '/(tabs)'): void {
  try {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackRoute as any);
    }
  } catch (err) {
    console.warn('safeGoBack fallback activated:', err);
    try {
      router.replace(fallbackRoute as any);
    } catch {
      // Ignored
    }
  }
}
