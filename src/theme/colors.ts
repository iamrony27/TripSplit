/**
 * TripSplit Material Design 3 Color Tokens
 * Derived directly from Google Stitch design specifications
 */

export const M3Colors = {
  // Primary Family (Mint / Emerald)
  primary: '#006C4C',
  onPrimary: '#FFFFFF',
  primaryContainer: '#D6F5E8',
  onPrimaryContainer: '#002114',
  primaryFixed: '#9DF4CB',
  primaryFixedDim: '#81D7B0',
  onPrimaryFixed: '#002114',

  // Secondary Family (Tonal Indigo)
  secondary: '#6750A4',
  onSecondary: '#FFFFFF',
  secondaryContainer: '#EADDFF',
  onSecondaryContainer: '#21005D',
  secondaryFixed: '#E9DDFF',
  secondaryFixedDim: '#CFBCFF',
  onSecondaryFixed: '#22005D',

  // Tertiary Family (Teal / Cyan)
  tertiary: '#006874',
  onTertiary: '#FFFFFF',
  tertiaryContainer: '#97E4F2',
  onTertiaryContainer: '#001F24',
  tertiaryFixed: '#A2EFFD',
  tertiaryFixedDim: '#85D2E0',
  onTertiaryFixed: '#001F24',

  // Surface Elevation Hierarchy
  surface: '#F3FCF4',
  surfaceDim: '#D3DCD5',
  surfaceBright: '#F3FCF4',
  surfaceContainerLowest: '#FFFFFF',
  surfaceContainerLow: '#EDF6EE',
  surfaceContainer: '#E7F0E9',
  surfaceContainerHigh: '#E1EAE3',
  surfaceContainerHighest: '#DCE5DD',
  surfaceVariant: '#E1EAE3',
  background: '#F3FCF4',
  onBackground: '#151D19',

  // Content on Surface
  onSurface: '#151D19',
  onSurfaceVariant: '#3F4943',
  outline: '#6F7A73',
  outlineVariant: '#BEC9C1',
  inverseSurface: '#2A322D',
  inverseOnSurface: '#EAF3EC',
  inversePrimary: '#81D7B0',

  // Error Family
  error: '#BA1A1A',
  onError: '#FFFFFF',
  errorContainer: '#FFDAD6',
  onErrorContainer: '#93000A',

  // Semantic Financial Status
  credit: '#006C4C',             // You are Owed / Positive
  creditContainer: '#D6F5E8',
  onCreditContainer: '#002114',
  debit: '#BA1A1A',              // You Owe / Negative
  debitContainer: '#FFDAD6',
  onDebitContainer: '#93000A',
  settled: '#5A605B',
  settledContainer: '#E1EAE3',

  // Category Pastel Accent Palettes
  categories: {
    food: { bg: '#EADDFF', text: '#21005D', icon: '#6750A4' },
    restaurant: { bg: '#EADDFF', text: '#21005D', icon: '#6750A4' },
    travel: { bg: '#97F0FF', text: '#001F24', icon: '#006874' },
    transport: { bg: '#97F0FF', text: '#001F24', icon: '#006874' },
    hotel: { bg: '#B7F397', text: '#0E2004', icon: '#386A20' },
    accommodation: { bg: '#B7F397', text: '#0E2004', icon: '#386A20' },
    fuel: { bg: '#FFDCC1', text: '#2E1500', icon: '#8B5000' },
    shopping: { bg: '#FFD8EC', text: '#37002B', icon: '#904277' },
    entertainment: { bg: '#E0E0FF', text: '#00105C', icon: '#4355B9' },
    tickets: { bg: '#E0E0FF', text: '#00105C', icon: '#4355B9' },
    groceries: { bg: '#CCE8E5', text: '#00201F', icon: '#006A68' },
    teaCoffee: { bg: '#FFE082', text: '#261900', icon: '#795548' },
    snacks: { bg: '#FFE0B2', text: '#2E1500', icon: '#E65100' },
    medical: { bg: '#FFDAD6', text: '#410002', icon: '#BA1A1A' },
    parking: { bg: '#D1E4FF', text: '#001D36', icon: '#0061A4' },
    drinks: { bg: '#E1BEE7', text: '#311B92', icon: '#7B1FA2' },
    other: { bg: '#E0E4DE', text: '#151D19', icon: '#6F7A73' },
  }
} as const;

export type M3ColorName = keyof typeof M3Colors;
