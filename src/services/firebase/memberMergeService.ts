import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { Trip, TripMember } from '../../types/trip';
import { Expense } from '../../types/expense';
import { PaymentRecord } from '../../types/settlement';
import { MemberMergeRecord } from '../../types/mergeHistory';
import { sanitizeForFirestore } from '../../utils/sanitizeFirestore';
import {
  getLocalExpenses,
  saveLocalExpense,
  getLocalPayments,
  saveLocalPayment,
  getLocalTrips,
  saveLocalTrip,
  saveLocalMergeRecord,
} from '../storage/localDatabase';
import { updateTripInFirestore } from './tripService';
import { logActivityInFirestore } from './activityService';
import { createNotificationInFirestore } from './notificationService';

const EXPENSES_COLLECTION = 'expenses';
const PAYMENTS_COLLECTION = 'payments';
const MERGE_HISTORY_COLLECTION = 'memberMergeHistory';
const TRIPS_COLLECTION = 'trips';

export interface MergePreviewResult {
  sourceMember: TripMember;
  targetMember: TripMember;
  expensesPaidCount: number;
  expensesParticipatedCount: number;
  paymentsMadeCount: number;
  paymentsReceivedCount: number;
}

/**
 * Previews what records will be re-assigned before executing a merge.
 */
export async function previewMemberMerge(params: {
  tripId: string;
  sourceMemberId: string;
  targetMemberId: string;
}): Promise<MergePreviewResult> {
  const { tripId, sourceMemberId, targetMemberId } = params;

  if (sourceMemberId === targetMemberId) {
    throw new Error('Cannot merge a member profile into itself.');
  }

  // 1. Fetch trip
  const allTrips = await getLocalTrips();
  const trip = allTrips.find((t) => t.id === tripId);
  if (!trip) {
    throw new Error('Trip not found.');
  }

  const sourceMember = trip.members.find((m) => m.id === sourceMemberId);
  const targetMember = trip.members.find((m) => m.id === targetMemberId);

  if (!sourceMember || !targetMember) {
    throw new Error('Both members must exist in the group.');
  }

  // 2. Count affected expenses
  const expenses = await getLocalExpenses(tripId);
  let expensesPaidCount = 0;
  let expensesParticipatedCount = 0;

  for (const e of expenses) {
    if (e.paidByMemberId === sourceMemberId) {
      expensesPaidCount++;
    }
    if (e.shares && e.shares[sourceMemberId] !== undefined) {
      expensesParticipatedCount++;
    }
  }

  // 3. Count affected payments
  const payments = await getLocalPayments(tripId);
  let paymentsMadeCount = 0;
  let paymentsReceivedCount = 0;

  for (const p of payments) {
    if (p.fromMemberId === sourceMemberId) {
      paymentsMadeCount++;
    }
    if (p.toMemberId === sourceMemberId) {
      paymentsReceivedCount++;
    }
  }

  return {
    sourceMember,
    targetMember,
    expensesPaidCount,
    expensesParticipatedCount,
    paymentsMadeCount,
    paymentsReceivedCount,
  };
}

/**
 * Executes an administrator-approved profile merge.
 * Associates historical expenses and settlements with the surviving target member identity,
 * removes the redundant profile, recalculates balances, and writes an audit log.
 */
export async function executeMemberMerge(params: {
  tripId: string;
  sourceMemberId: string;
  targetMemberId: string;
  adminUserId: string;
  adminName: string;
  notes?: string;
}): Promise<MemberMergeRecord> {
  const { tripId, sourceMemberId, targetMemberId, adminUserId, adminName, notes } = params;

  if (sourceMemberId === targetMemberId) {
    throw new Error('Cannot merge a member profile into itself.');
  }

  // 1. Fetch current trip
  let trip: Trip | null = null;
  if (isFirebaseConfigured) {
    try {
      const snap = await getDoc(doc(db, TRIPS_COLLECTION, tripId));
      if (snap.exists()) {
        trip = snap.data() as Trip;
      }
    } catch (err) {
      console.warn('Failed to fetch trip from Firestore during merge:', err);
    }
  }

  if (!trip) {
    const localTrips = await getLocalTrips();
    trip = localTrips.find((t) => t.id === tripId) || null;
  }

  if (!trip) {
    throw new Error('Trip not found.');
  }

  const sourceMember = trip.members.find((m) => m.id === sourceMemberId);
  const targetMember = trip.members.find((m) => m.id === targetMemberId);

  if (!sourceMember || !targetMember) {
    throw new Error('Both member profiles must exist in the group.');
  }

  // 2. Re-assign all expenses
  const allExpenses = await getLocalExpenses(tripId);
  let expensesReassignedCount = 0;

  for (const exp of allExpenses) {
    let changed = false;
    let newPaidBy = exp.paidByMemberId;
    let newShares = { ...exp.shares };
    let newParticipants = [...exp.selectedParticipantIds];

    if (exp.paidByMemberId === sourceMemberId) {
      newPaidBy = targetMemberId;
      changed = true;
    }

    if (newShares[sourceMemberId] !== undefined) {
      const sourceShare = newShares[sourceMemberId] || 0;
      delete newShares[sourceMemberId];

      // Combine into target's share without creating duplicate entries
      newShares[targetMemberId] = (newShares[targetMemberId] || 0) + sourceShare;

      // Update participants list
      newParticipants = newParticipants.filter((id) => id !== sourceMemberId);
      if (!newParticipants.includes(targetMemberId)) {
        newParticipants.push(targetMemberId);
      }
      changed = true;
    }

    if (changed) {
      expensesReassignedCount++;
      const updatedExpense: Expense = {
        ...exp,
        paidByMemberId: newPaidBy,
        shares: newShares,
        selectedParticipantIds: newParticipants,
        updatedAt: Date.now(),
      };

      await saveLocalExpense(updatedExpense);
      if (isFirebaseConfigured) {
        try {
          const expRef = doc(db, EXPENSES_COLLECTION, exp.id);
          await setDoc(expRef, sanitizeForFirestore(updatedExpense));
        } catch (err) {
          console.warn('Failed to update expense in Firestore during merge:', err);
        }
      }
    }
  }

  // 3. Re-assign all settlements / payments
  const allPayments = await getLocalPayments(tripId);
  let paymentsReassignedCount = 0;

  for (const p of allPayments) {
    let changed = false;
    let newFrom = p.fromMemberId;
    let newTo = p.toMemberId;
    let newPayerName = p.payerName;
    let newReceiverName = p.receiverName;

    if (p.fromMemberId === sourceMemberId) {
      newFrom = targetMemberId;
      newPayerName = targetMember.name;
      changed = true;
    }

    if (p.toMemberId === sourceMemberId) {
      newTo = targetMemberId;
      newReceiverName = targetMember.name;
      changed = true;
    }

    if (changed) {
      paymentsReassignedCount++;
      const updatedPayment: PaymentRecord = {
        ...p,
        fromMemberId: newFrom,
        toMemberId: newTo,
        payerName: newPayerName,
        receiverName: newReceiverName,
        updatedAt: Date.now(),
      };

      await saveLocalPayment(updatedPayment);
      if (isFirebaseConfigured) {
        try {
          const pRef = doc(db, PAYMENTS_COLLECTION, p.id);
          await setDoc(pRef, sanitizeForFirestore(updatedPayment));
        } catch (err) {
          console.warn('Failed to update payment in Firestore during merge:', err);
        }
      }
    }
  }

  // 4. Update surviving member profile
  // If source had a linked userId or UPI that target lacked, preserve it safely
  const survivingMember: TripMember = {
    ...targetMember,
    userId: targetMember.userId || sourceMember.userId,
    email: targetMember.email || sourceMember.email,
    upiId: targetMember.upiId || sourceMember.upiId,
  };

  const updatedMembers = trip.members
    .filter((m) => m.id !== sourceMemberId)
    .map((m) => (m.id === targetMemberId ? survivingMember : m));

  const updatedMemberIds = Array.from(
    new Set(
      updatedMembers
        .flatMap((m) => [m.id, m.userId])
        .filter(Boolean) as string[]
    )
  );

  await updateTripInFirestore(tripId, {
    members: updatedMembers,
    memberIds: updatedMemberIds,
  });

  // 5. Create immutable merge audit record
  const mergeRecordId = `merge_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const mergeRecord: MemberMergeRecord = {
    id: mergeRecordId,
    tripId,
    tripTitle: trip.title,
    sourceMemberId,
    sourceMemberName: sourceMember.name,
    targetMemberId,
    targetMemberName: targetMember.name,
    mergedByUserId: adminUserId,
    mergedByName: adminName,
    mergedAt: Date.now(),
    expensesReassignedCount,
    paymentsReassignedCount,
    notes: notes?.trim() || undefined,
  };

  await saveLocalMergeRecord(mergeRecord);

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, MERGE_HISTORY_COLLECTION, mergeRecordId);
      await setDoc(ref, sanitizeForFirestore(mergeRecord));
    } catch (err) {
      console.warn('Failed to save merge record in Firestore:', err);
    }
  }

  // 6. Log to activity timeline
  await logActivityInFirestore({
    id: `act_${Date.now()}`,
    tripId,
    tripTitle: trip.title,
    userId: adminUserId,
    userName: adminName,
    action: 'MEMBER_MERGED',
    details: `${adminName} consolidated profile "${sourceMember.name}" into "${targetMember.name}" (${expensesReassignedCount} expenses, ${paymentsReassignedCount} payments re-attributed)`,
    timestamp: Date.now(),
  });

  // 7. Send in-app notification to surviving user if registered
  if (survivingMember.userId) {
    await createNotificationInFirestore({
      userId: survivingMember.userId,
      tripId,
      tripTitle: trip.title,
      type: 'MEMBER_MERGED',
      title: 'Profile Consolidated',
      message: `${adminName} linked your account with previous expenses recorded under "${sourceMember.name}".`,
      data: { mergeRecordId },
    });
  }

  return mergeRecord;
}
