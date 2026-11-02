/**
 * TripSplit Multi-Currency & Exchange Rate Service
 * 
 * Supports base currencies and foreign expense recording.
 * Caches conversion rates and guarantees historical rate locking.
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  flag: string;
}

export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
};

// Default fallback baseline rates against 1 USD
const DEFAULT_RATES_TO_USD: Record<string, number> = {
  USD: 1.0,
  INR: 86.5,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SGD: 1.34,
  THB: 34.5,
  JPY: 152.0,
  AUD: 1.55,
};

let cachedRates = { ...DEFAULT_RATES_TO_USD };
let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 1000 * 60 * 60 * 12; // 12 hours

/**
 * Calculates conversion rate between two currencies: (from -> to)
 */
export function getExchangeRate(fromCurrency: string, toCurrency: string): number {
  if (fromCurrency === toCurrency) return 1.0;

  const fromRate = cachedRates[fromCurrency] || DEFAULT_RATES_TO_USD[fromCurrency] || 1.0;
  const toRate = cachedRates[toCurrency] || DEFAULT_RATES_TO_USD[toCurrency] || 1.0;

  // Rate = (toRate / fromRate)
  return Math.round((toRate / fromRate) * 10000) / 10000;
}

/**
 * Converts an amount from source currency to trip base currency.
 * Returns convertedAmount and immutable exchangeRate.
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  lockedRate?: number
): { convertedAmount: number; exchangeRate: number } {
  if (fromCurrency === toCurrency) {
    return {
      convertedAmount: Math.round((amount + Number.EPSILON) * 100) / 100,
      exchangeRate: 1.0,
    };
  }

  // Preserve historical conversion rate if already locked on an existing expense
  const rate = lockedRate !== undefined && lockedRate > 0
    ? lockedRate
    : getExchangeRate(fromCurrency, toCurrency);

  const convertedAmount = Math.round((amount * rate + Number.EPSILON) * 100) / 100;

  return {
    convertedAmount,
    exchangeRate: rate,
  };
}

/**
 * Formats amount with proper currency symbol (e.g. ₹1,420.00 or $35.50).
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'INR',
  showDecimals: boolean = true
): string {
  const info = SUPPORTED_CURRENCIES[currencyCode] || { symbol: currencyCode };
  const absAmount = Math.abs(amount);
  const formatted = showDecimals
    ? absAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(absAmount).toLocaleString('en-IN');

  const sign = amount < 0 ? '-' : '';
  return `${sign}${info.symbol}${formatted}`;
}
