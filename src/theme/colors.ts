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

  // Rich, Distinct Category Accent Palettes
  categories: {
    food: { primary: '#F57C00', bg: '#FFF3E0', text: '#FFFFFF', icon: '#E65100' },
    restaurant: { primary: '#D84315', bg: '#FBE9E7', text: '#FFFFFF', icon: '#BF360C' },
    travel: { primary: '#1976D2', bg: '#E3F2FD', text: '#FFFFFF', icon: '#0D47A1' },
    transport: { primary: '#0288D1', bg: '#E1F5FE', text: '#FFFFFF', icon: '#01579B' },
    hotel: { primary: '#00897B', bg: '#E0F2F1', text: '#FFFFFF', icon: '#004D40' },
    accommodation: { primary: '#2E7D32', bg: '#E8F5E9', text: '#FFFFFF', icon: '#1B5E20' },
    fuel: { primary: '#D32F2F', bg: '#FFEBEE', text: '#FFFFFF', icon: '#B71C1C' },
    shopping: { primary: '#C2185B', bg: '#FCE4EC', text: '#FFFFFF', icon: '#880E4F' },
    entertainment: { primary: '#7B1FA2', bg: '#F3E5F5', text: '#FFFFFF', icon: '#4A148C' },
    tickets: { primary: '#512DA8', bg: '#EDE7F6', text: '#FFFFFF', icon: '#311B92' },
    groceries: { primary: '#43A047', bg: '#E8F5E9', text: '#FFFFFF', icon: '#1B5E20' },
    teaCoffee: { primary: '#6D4C41', bg: '#EFEBE9', text: '#FFFFFF', icon: '#3E2723' },
    snacks: { primary: '#FFA000', bg: '#FFF8E1', text: '#FFFFFF', icon: '#FF6F00' },
    medical: { primary: '#E53935', bg: '#FFEBEE', text: '#FFFFFF', icon: '#C62828' },
    parking: { primary: '#455A64', bg: '#ECEFF1', text: '#FFFFFF', icon: '#263238' },
    drinks: { primary: '#8E24AA', bg: '#F3E5F5', text: '#FFFFFF', icon: '#4A148C' },
    other: { primary: '#546E7A', bg: '#ECEFF1', text: '#FFFFFF', icon: '#37474F' },
  }
} as const;

export type M3ColorName = keyof typeof M3Colors;
