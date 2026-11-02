import { MD3LightTheme, configureFonts } from 'react-native-paper';
import { M3Colors } from './colors';

export const paperTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: M3Colors.primary,
    onPrimary: M3Colors.onPrimary,
    primaryContainer: M3Colors.primaryContainer,
    onPrimaryContainer: M3Colors.onPrimaryContainer,

    secondary: M3Colors.secondary,
    onSecondary: M3Colors.onSecondary,
    secondaryContainer: M3Colors.secondaryContainer,
    onSecondaryContainer: M3Colors.onSecondaryContainer,

    tertiary: M3Colors.tertiary,
    onTertiary: M3Colors.onTertiary,
    tertiaryContainer: M3Colors.tertiaryContainer,
    onTertiaryContainer: M3Colors.onTertiaryContainer,

    surface: M3Colors.surface,
    onSurface: M3Colors.onSurface,
    surfaceVariant: M3Colors.surfaceVariant,
    onSurfaceVariant: M3Colors.onSurfaceVariant,

    background: M3Colors.background,
    onBackground: M3Colors.onBackground,

    error: M3Colors.error,
    onError: M3Colors.onError,
    errorContainer: M3Colors.errorContainer,
    onErrorContainer: M3Colors.onErrorContainer,

    outline: M3Colors.outline,
    outlineVariant: M3Colors.outlineVariant,
    inverseSurface: M3Colors.inverseSurface,
    inverseOnSurface: M3Colors.inverseOnSurface,
    inversePrimary: M3Colors.inversePrimary,

    elevation: {
      level0: 'transparent',
      level1: M3Colors.surfaceContainerLow,
      level2: M3Colors.surfaceContainer,
      level3: M3Colors.surfaceContainerHigh,
      level4: M3Colors.surfaceContainerHigh,
      level5: M3Colors.surfaceContainerHighest,
    },
  },
  roundness: 16,
};
