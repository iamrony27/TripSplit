import {
  collection,
  doc,
  setDoc,
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

/**
 * Declares a manual UPI payment from a payer to a receiver.
 * Sets status to PENDING_ADMIN_APPROVAL.
 * Does NOT immediately reduce balances.
 */
export async function declarePaymentInFirestore(payment: PaymentRecord): Promise<void> {
  const tripPayments = await getLocalPayments(payment.tripId);
  
  // Check for duplicate pending declaration for same settlement within recent window
  const existingPending = tripPayments.find(
    (p) =>
      (p.status === 'PENDING_ADMIN_APPROVAL' || p.status === 'PENDING') &&
      p.fromMemberId === payment.fromMemberId &&
      p.toMemberId === payment.toMemberId &&
      Math.abs(p.amount - payment.amount) < 0.01 &&
      Date.now() - p.createdAt < 30000 // 30 seconds debounce
  );

  if (existingPending) {
    throw new Error('A payment declaration with the same details is already pending admin approval.');
  }

  // Ensure status and timestamp invariants
  const declaration: PaymentRecord = {
    ...payment,
    paymentId: payment.id,
    groupId: payment.tripId,
    status: 'PENDING_ADMIN_APPROVAL',
    paidDate: payment.paidDate || new Date().toISOString(),
    isSynced: true,
    createdAt: payment.createdAt || Date.now(),
    updatedAt: Date.now(),
  };

  await saveLocalPayment(declaration);

  if (isFirebaseConfigured && !payment.tripId.startsWith('demo_')) {
    try {
      const ref = doc(db, PAYMENTS_COLLECTION, declaration.id);
      await setDoc(ref, sanitizeForFirestore(declaration));
    } catch (err) {
      console.warn('Firestore declarePayment failed, saved in offline cache:', err);
      // Mark as not yet synced to remote
      await saveLocalPayment({ ...declaration, isSynced: false });
    }
  }
}

/**
 * Approves a pending payment declaration.
 * ONLY authorized administrators can approve.
 * A payer CANNOT approve their own payment.
 * Moves status to APPROVED, which reduces the debtor's balance.
 */
export async function approvePaymentInFirestore(params: {
  paymentId: string;
  tripId: string;
  adminUserId: string;
  adminName: string;
  isTripAdmin: boolean;
  currentMemberId?: string;
}): Promise<PaymentRecord> {
  const { paymentId, tripId, adminUserId, adminName, isTripAdmin, currentMemberId } = params;

  if (!isTripAdmin) {
    throw new Error('Unauthorized: Only the group owner / authorized admin can approve payment declarations.');
  }

  const list = await getLocalPayments(tripId);
  const payment = list.find((p) => p.id === paymentId);

  if (!payment) {
    throw new Error('Payment declaration not found.');
  }

  if (payment.status !== 'PENDING_ADMIN_APPROVAL' && payment.status !== 'PENDING') {
    throw new Error(`Cannot approve: Payment declaration is already marked as ${payment.status}.`);
  }

  // Payer cannot approve their own payment
  const isPayer =
    payment.payerUid === adminUserId ||
    payment.fromMemberId === adminUserId ||
    (currentMemberId && payment.fromMemberId === currentMemberId);

  if (isPayer) {
    throw new Error('A payer cannot approve their own payment declaration. Another group admin or the payee must verify.');
  }

  const updated: PaymentRecord = {
    ...payment,
    status: 'APPROVED',
    approvedBy: adminUserId,
    approvedByName: adminName,
    approvedAt: Date.now(),
    updatedAt: Date.now(),
    isSynced: true,
  };

  await saveLocalPayment(updated);

  if (isFirebaseConfigured && !tripId.startsWith('demo_')) {
    try {
      const ref = doc(db, PAYMENTS_COLLECTION, paymentId);
      await setDoc(ref, sanitizeForFirestore(updated), { merge: true });
    } catch (err) {
      console.warn('Firestore approvePayment failed, updated in offline cache:', err);
      await saveLocalPayment({ ...updated, isSynced: false });
    }
  }

  return updated;
}

/**
 * Rejects a pending payment declaration.
 * Records rejection reason and timestamp.
 * Status becomes REJECTED. Does NOT reduce outstanding balances.
 */
export async function rejectPaymentInFirestore(params: {
  paymentId: string;
  tripId: string;
  adminUserId: string;
  adminName: string;
  isTripAdmin: boolean;
  reason?: string;
}): Promise<PaymentRecord> {
  const { paymentId, tripId, adminUserId, adminName, isTripAdmin, reason } = params;

  if (!isTripAdmin) {
    throw new Error('Unauthorized: Only the group owner / authorized admin can reject payment declarations.');
  }

  const list = await getLocalPayments(tripId);
  const payment = list.find((p) => p.id === paymentId);

  if (!payment) {
    throw new Error('Payment declaration not found.');
  }

  if (payment.status !== 'PENDING_ADMIN_APPROVAL' && payment.status !== 'PENDING') {
    throw new Error(`Cannot reject: Payment declaration is already marked as ${payment.status}.`);
  }

  const updated: PaymentRecord = {
    ...payment,
    status: 'REJECTED',
    rejectedBy: adminUserId,
    rejectedByName: adminName,
    rejectedAt: Date.now(),
    rejectionReason: reason?.trim() || 'Rejected by Admin',
    updatedAt: Date.now(),
    isSynced: true,
  };

  await saveLocalPayment(updated);

  if (isFirebaseConfigured && !tripId.startsWith('demo_')) {
    try {
      const ref = doc(db, PAYMENTS_COLLECTION, paymentId);
      await setDoc(ref, sanitizeForFirestore(updated), { merge: true });
    } catch (err) {
      console.warn('Firestore rejectPayment failed, updated in offline cache:', err);
      await saveLocalPayment({ ...updated, isSynced: false });
    }
  }

  return updated;
}

/**
 * Cancels a pending declaration by the payer.
 */
export async function cancelPaymentDeclaration(
  paymentId: string,
  tripId: string,
  userId: string,
  currentMemberId?: string
): Promise<void> {
  const list = await getLocalPayments(tripId);
  const payment = list.find((p) => p.id === paymentId);

  if (!payment) return;

  const isPayer =
    payment.payerUid === userId ||
    payment.fromMemberId === userId ||
    (currentMemberId && payment.fromMemberId === currentMemberId);

  if (!isPayer) {
    throw new Error('Only the member who submitted this payment declaration can cancel it.');
  }

  const updated: PaymentRecord = {
    ...payment,
    status: 'CANCELLED',
    updatedAt: Date.now(),
  };

  await saveLocalPayment(updated);

  if (isFirebaseConfigured && !tripId.startsWith('demo_')) {
    try {
      const ref = doc(db, PAYMENTS_COLLECTION, paymentId);
      await setDoc(ref, sanitizeForFirestore(updated), { merge: true });
    } catch (err) {
      console.warn('Firestore cancelPayment failed, updated locally:', err);
    }
  }
}

/**
 * Direct payment record (e.g. cash settlement confirmed by both parties).
 */
export async function recordPaymentInFirestore(payment: PaymentRecord): Promise<void> {
  await saveLocalPayment(payment);

  if (isFirebaseConfigured && !payment.tripId.startsWith('demo_')) {
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
        ...(upiTxnId ? { upiTxnId, upiTransactionReference: upiTxnId } : {}),
        ...(status === 'APPROVED' || status === 'PAID' ? { paidDate: new Date().toISOString() } : {}),
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
          ...(upiTxnId ? { upiTxnId, upiTransactionReference: upiTxnId } : {}),
          ...(status === 'APPROVED' || status === 'PAID' ? { paidDate: new Date().toISOString() } : {}),
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
