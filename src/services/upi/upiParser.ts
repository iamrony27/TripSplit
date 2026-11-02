/**
 * TripSplit UPI Parser & Validator
 * 
 * Extracts and validates UPI payment details from scanned QR codes or manual inputs.
 * Standard format: upi://pay?pa=user@upi&pn=Name&am=100.00&cu=INR&tn=Note
 */

export interface ParsedUpiData {
  isValid: boolean;
  upiId: string;
  payeeName?: string;
  amount?: number;
  currency?: string;
  note?: string;
  rawUri: string;
}

// Standard UPI Virtual Payment Address (VPA) regex validation
export const UPI_ID_REGEX = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;

/**
 * Validates whether a given string is a syntactically correct UPI ID (e.g. name@okhdfcbank).
 */
export function isValidUpiId(upiId: string): boolean {
  if (!upiId || typeof upiId !== 'string') return false;
  return UPI_ID_REGEX.test(upiId.trim());
}

/**
 * Parses a scanned QR barcode string into structured UPI data.
 * Gracefully handles arbitrary QR codes that are not valid UPI URIs.
 */
export function parseUpiQrCode(qrData: string): ParsedUpiData {
  const fallback: ParsedUpiData = {
    isValid: false,
    upiId: '',
    rawUri: qrData,
  };

  if (!qrData || typeof qrData !== 'string') {
    return fallback;
  }

  const trimmed = qrData.trim();

  // 1. Direct UPI URI format: upi://pay?...
  if (trimmed.toLowerCase().startsWith('upi://pay')) {
    try {
      const queryString = trimmed.includes('?') ? trimmed.split('?')[1] : '';
      const params = new URLSearchParams(queryString);

      const pa = params.get('pa') || '';
      const pn = params.get('pn') || undefined;
      const am = params.get('am');
      const cu = params.get('cu') || 'INR';
      const tn = params.get('tn') || undefined;

      const validUpi = isValidUpiId(pa);

      return {
        isValid: validUpi,
        upiId: pa.trim(),
        payeeName: pn ? decodeURIComponent(pn) : undefined,
        amount: am ? parseFloat(am) : undefined,
        currency: cu,
        note: tn ? decodeURIComponent(tn) : undefined,
        rawUri: trimmed,
      };
    } catch {
      return fallback;
    }
  }

  // 2. Direct plain UPI ID format (e.g. user@okaxis)
  if (isValidUpiId(trimmed)) {
    return {
      isValid: true,
      upiId: trimmed,
      currency: 'INR',
      rawUri: `upi://pay?pa=${encodeURIComponent(trimmed)}`,
    };
  }

  return fallback;
}
