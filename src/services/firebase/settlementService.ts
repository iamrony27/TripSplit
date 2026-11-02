import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { PaymentRecord, PaymentStatus } from '../../types/settlement';
import { sanitizeForFirestore } from '../../utils/sanitizeFirestore';
import {
  saveLocalPayment,
  subscribeLocalPayments,
  getLocalPayments,
} from '../storage/localDatabase';

const PAYMENTS_COLLECTION = 'payments';

export async function recordPaymentInFirestore(payment: PaymentRecord): Promise<void> {
  await saveLocalPayment(payment);

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, PAYMENTS_COLLECTION, payment.id);
      await setDoc(ref, sanitizeForFirestore(payment));
    } catch (err) {
      console.warn('Firestore recordPayment failed, stored locally:', err);
    }
  }
}

export async function updatePaymentStatusInFirestore(
  paymentId: string,
  status: PaymentStatus,
  upiTxnId?: string,
  tripId?: string
): Promise<void> {
  if (tripId) {
    const list = await getLocalPayments(tripId);
    const existing = list.find((p) => p.id === paymentId);
    if (existing) {
      await saveLocalPayment({
        ...existing,
        status,
        ...(upiTxnId ? { upiTxnId } : {}),
        ...(status === 'PAID' ? { paidDate: new Date().toISOString() } : {}),
        updatedAt: Date.now(),
      });
    }
  }

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, PAYMENTS_COLLECTION, paymentId);
      await setDoc(
        ref,
        sanitizeForFirestore({
          status,
          ...(upiTxnId ? { upiTxnId } : {}),
          ...(status === 'PAID' ? { paidDate: new Date().toISOString() } : {}),
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore updatePaymentStatus failed, stored locally:', err);
    }
  }
}

export function subscribeTripPayments(
  tripId: string,
  callback: (payments: PaymentRecord[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || tripId.startsWith('demo_')) {
    return subscribeLocalPayments(tripId, callback);
  }

  try {
    const q = query(
      collection(db, PAYMENTS_COLLECTION),
      where('tripId', '==', tripId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: PaymentRecord[] = [];
        snap.forEach((d) => {
          list.push(d.data() as PaymentRecord);
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        callback(list);
      },
      (err) => {
        console.warn('Payments subscription error, using local database:', err);
        subscribeLocalPayments(tripId, callback);
      }
    );
  } catch {
    return subscribeLocalPayments(tripId, callback);
  }
}
