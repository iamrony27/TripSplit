import { Linking, Platform } from 'react-native';

export interface UpiPaymentParams {
  upiId: string;
  payeeName: string;
  amount: number;
  currency?: string;
  note?: string;
}

export type UpiAppTarget = 'GENERIC' | 'GPAY' | 'PHONEPE' | 'PAYTM' | 'BHIM';

/**
 * Constructs a standard NPCI compliant UPI payment URI.
 * Example: upi://pay?pa=sarah@okaxis&pn=Sarah%20Jenkins&am=1420.00&cu=INR&tn=TripSplit%20Settlement
 */
export function generateUpiPaymentUri(params: UpiPaymentParams): string {
  const {
    upiId,
    payeeName,
    amount,
    currency = 'INR',
    note = 'TripSplit Settlement',
  } = params;

  const formattedAmount = Math.max(0, amount).toFixed(2);
  const query = [
    `pa=${encodeURIComponent(upiId.trim())}`,
    `pn=${encodeURIComponent(payeeName.trim())}`,
    `am=${encodeURIComponent(formattedAmount)}`,
    `cu=${encodeURIComponent(currency.trim())}`,
    `tn=${encodeURIComponent(note.trim())}`,
  ].join('&');

  return `upi://pay?${query}`;
}

/**
 * Attempts to launch deep link for UPI payment apps on Android.
 * Supports Generic UPI Intent, Google Pay, PhonePe, Paytm, and BHIM.
 */
export async function launchUpiPayment(
  params: UpiPaymentParams,
  targetApp: UpiAppTarget = 'GENERIC'
): Promise<{ success: boolean; message?: string }> {
  if (!params.upiId || !params.upiId.trim()) {
    return {
      success: false,
      message: 'Receiver does not have a UPI ID configured.',
    };
  }

  if (params.amount <= 0) {
    return {
      success: false,
      message: 'Settlement amount must be greater than zero.',
    };
  }

  const genericUri = generateUpiPaymentUri(params);

  try {
    const supported = await Linking.canOpenURL(genericUri);
    if (supported || Platform.OS === 'android') {
      await Linking.openURL(genericUri);
      return { success: true };
    } else {
      return {
        success: false,
        message: 'No compatible UPI app (Google Pay, PhonePe, Paytm, BHIM) found on this device. Please scan the QR code or copy the UPI ID.',
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: 'Could not open UPI payment application. Please ensure a compatible UPI app (Google Pay, PhonePe, Paytm, BHIM) is installed.',
    };
  }
}
