import { Linking, Platform } from 'react-native';

export interface UpiPaymentParams {
  upiId: string;
  payeeName: string;
  amount: number;
  currency?: string;
  note?: string;
}

export type UpiAppTarget = 'GENERIC' | 'GPAY' | 'PHONEPE' | 'PAYTM';

/**
 * Constructs a standard NPCI compliant UPI payment URI.
 * Example: upi://pay?pa=sarah@okaxis&pn=Sarah%20Jenkins&am=1420.00&cu=INR&tn=Goa%20Settlement
 */
export function generateUpiPaymentUri(params: UpiPaymentParams): string {
  const {
    upiId,
    payeeName,
    amount,
    currency = 'INR',
    note = 'TripSplit Settlement',
  } = params;

  const formattedAmount = amount.toFixed(2);
  const query = [
    `pa=${encodeURIComponent(upiId)}`,
    `pn=${encodeURIComponent(payeeName)}`,
    `am=${encodeURIComponent(formattedAmount)}`,
    `cu=${encodeURIComponent(currency)}`,
    `tn=${encodeURIComponent(note)}`,
  ].join('&');

  return `upi://pay?${query}`;
}

/**
 * Attempts to launch deep link for UPI payment apps on Android.
 * Supports Generic UPI Intent, Google Pay, PhonePe, and Paytm.
 */
export async function launchUpiPayment(
  params: UpiPaymentParams,
  targetApp: UpiAppTarget = 'GENERIC'
): Promise<{ success: boolean; message?: string }> {
  const genericUri = generateUpiPaymentUri(params);

  // App-specific scheme prefixes where supported, with fallback to generic upi://pay
  let urlToOpen = genericUri;

  if (Platform.OS === 'android') {
    switch (targetApp) {
      case 'GPAY':
        // Standard GPay package/intent handler fallback
        urlToOpen = genericUri;
        break;
      case 'PHONEPE':
        urlToOpen = genericUri;
        break;
      case 'PAYTM':
        urlToOpen = genericUri;
        break;
      default:
        urlToOpen = genericUri;
        break;
    }
  }

  try {
    const supported = await Linking.canOpenURL(urlToOpen);
    if (supported || Platform.OS === 'android') {
      await Linking.openURL(urlToOpen);
      return { success: true };
    } else {
      return {
        success: false,
        message: 'No supported UPI app found. Please copy the UPI ID or scan the QR code.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Could not open UPI payment application.',
    };
  }
}
