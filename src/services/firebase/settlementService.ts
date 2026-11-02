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
import { db } from './config';
import { PaymentRecord, PaymentStatus } from '../../types/settlement';

const PAYMENTS_COLLECTION = 'payments';

export async function recordPaymentInFirestore(payment: PaymentRecord): Promise<void> {
  const ref = doc(db, PAYMENTS_COLLECTION, payment.id);
  await setDoc(ref, payment);
}

export async function updatePaymentStatusInFirestore(
  paymentId: string,
  status: PaymentStatus,
  upiTxnId?: string
): Promise<void> {
  const ref = doc(db, PAYMENTS_COLLECTION, paymentId);
  await updateDoc(ref, {
    status,
    ...(upiTxnId ? { upiTxnId } : {}),
    ...(status === 'PAID' ? { paidDate: new Date().toISOString() } : {}),
    updatedAt: Date.now(),
  });
}

export function subscribeTripPayments(
  tripId: string,
  callback: (payments: PaymentRecord[]) => void
): Unsubscribe {
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
      console.warn('Payments subscription error:', err);
      callback([]);
    }
  );
}
