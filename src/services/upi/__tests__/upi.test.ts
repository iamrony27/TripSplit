import { isValidUpiId, parseUpiQrCode } from '../upiParser';
import { generateUpiPaymentUri } from '../upiLauncher';

describe('UPI Services Tests', () => {
  test('isValidUpiId correctly validates Indian UPI IDs', () => {
    expect(isValidUpiId('sarah.jenkins@okaxis')).toBe(true);
    expect(isValidUpiId('rohan@okhdfcbank')).toBe(true);
    expect(isValidUpiId('merchant123@paytm')).toBe(true);
    expect(isValidUpiId('invalid-upi')).toBe(false);
    expect(isValidUpiId('@okhdfcbank')).toBe(false);
    expect(isValidUpiId('sarah@')).toBe(false);
  });

  test('parseUpiQrCode extracts payee address, name, amount and currency', () => {
    const rawQr = 'upi://pay?pa=rohan.verma@okhdfcbank&pn=Rohan%20Verma&am=1420.00&cu=INR&tn=Goa%20Settlement';
    const parsed = parseUpiQrCode(rawQr);

    expect(parsed.isValid).toBe(true);
    expect(parsed.upiId).toBe('rohan.verma@okhdfcbank');
    expect(parsed.payeeName).toBe('Rohan Verma');
    expect(parsed.amount).toBe(1420);
    expect(parsed.currency).toBe('INR');
    expect(parsed.note).toBe('Goa Settlement');
  });

  test('parseUpiQrCode handles non-UPI QR gracefully', () => {
    const rawQr = 'https://google.com';
    const parsed = parseUpiQrCode(rawQr);

    expect(parsed.isValid).toBe(false);
    expect(parsed.upiId).toBe('');
  });

  test('generateUpiPaymentUri formats compliant NPCI payment URI', () => {
    const uri = generateUpiPaymentUri({
      upiId: 'sarah@okaxis',
      payeeName: 'Sarah Jenkins',
      amount: 1420,
      currency: 'INR',
      note: 'Goa Trip Settlement',
    });

    expect(uri).toContain('upi://pay?');
    expect(uri).toContain('pa=sarah%40okaxis');
    expect(uri).toContain('am=1420.00');
    expect(uri).toContain('cu=INR');
  });
});
