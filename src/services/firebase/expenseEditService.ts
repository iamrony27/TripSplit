import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { Expense, SplitMode, ParticipantSplit } from '../../types/expense';
import { TransactionEditRecord } from '../../types/editHistory';
import { sanitizeForFirestore } from '../../utils/sanitizeFirestore';
import {
  saveLocalExpense,
  getLocalExpenses,
  saveLocalEditRecord,
  getLocalEditHistory,
} from '../storage/localDatabase';
import { calculateExpenseShares } from '../../engine/expenseCalculator';
import { logActivityInFirestore } from './activityService';
import { createNotificationInFirestore } from './notificationService';
import { formatCurrency } from '../currency/exchangeRateService';

const EXPENSES_COLLECTION = 'expenses';
const EDIT_HISTORY_COLLECTION = 'transactionEditHistory';

export interface AdminEditExpenseParams {
  expenseId: string;
  tripId: string;
  adminUserId: string;
  adminName: string;
  reason?: string;
  updates: {
    title?: string;
    amount?: number;
    categoryId?: string;
    paidByMemberId?: string;
    selectedParticipantIds?: string[];
    expenseDate?: string;
    description?: string;
    splitMode?: SplitMode;
    splitsData?: ParticipantSplit[];
  };
}

/**
 * Executes an authorized administrator edit on an existing transaction.
 * Creates an immutable audit record, updates the transaction with an Edited label,
 * recalculates shares, and notifies participating members.
 */
export async function adminEditExpense(params: AdminEditExpenseParams): Promise<Expense> {
  const { expenseId, tripId, adminUserId, adminName, reason, updates } = params;

  // 1. Fetch original expense
  let originalExpense: Expense | null = null;
  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, EXPENSES_COLLECTION, expenseId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        originalExpense = snap.data() as Expense;
      }
    } catch (err) {
      console.warn('Failed to fetch expense from Firestore:', err);
    }
  }

  if (!originalExpense) {
    const localList = await getLocalExpenses(tripId);
    originalExpense = localList.find((e) => e.id === expenseId) || null;
  }

  if (!originalExpense) {
    throw new Error('Transaction not found to edit.');
  }

  const finalAmount = updates.amount !== undefined ? updates.amount : originalExpense.amount;
  const finalTitle = updates.title !== undefined ? updates.title.trim() : originalExpense.title;
  const finalParticipants = updates.selectedParticipantIds || originalExpense.selectedParticipantIds;
  const finalSplitMode = updates.splitMode || originalExpense.splitMode;
  const finalSplitsData = updates.splitsData || originalExpense.splitsData;
  const finalPaidBy = updates.paidByMemberId || originalExpense.paidByMemberId;
  const finalCategory = updates.categoryId || originalExpense.categoryId;
  const finalDate = updates.expenseDate || originalExpense.expenseDate;
  const finalDescription = updates.description !== undefined ? updates.description : originalExpense.description;

  // Recalculate converted amount based on original exchange rate
  const convertedAmount = finalAmount * (originalExpense.exchangeRate || 1);

  // Recalculate participant shares
  const newShares = calculateExpenseShares(
    finalAmount,
    finalSplitMode,
    finalParticipants,
    finalSplitsData
  );

  // 2. Build updated expense object
  const editTimestamp = Date.now();
  const updatedExpense: Expense = {
    ...originalExpense,
    title: finalTitle,
    amount: finalAmount,
    convertedAmount,
    paidByMemberId: finalPaidBy,
    selectedParticipantIds: finalParticipants,
    splitMode: finalSplitMode,
    shares: newShares,
    splitsData: finalSplitsData,
    categoryId: finalCategory,
    expenseDate: finalDate,
    description: finalDescription,
    updatedAt: editTimestamp,

    // Audit fields
    isEdited: true,
    lastEditedAt: editTimestamp,
    lastEditedBy: adminUserId,
    lastEditedByName: adminName,
    editReason: reason?.trim() || undefined,
    editCount: (originalExpense.editCount || 0) + 1,
  };

  // 3. Create immutable edit audit record
  const editRecordId = `edit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const editRecord: TransactionEditRecord = {
    id: editRecordId,
    expenseId,
    tripId,
    originalTitle: originalExpense.title,
    originalAmount: originalExpense.amount,
    originalCurrency: originalExpense.originalCurrency,
    originalPaidByMemberId: originalExpense.paidByMemberId,
    originalSelectedParticipantIds: originalExpense.selectedParticipantIds,
    originalExpenseDate: originalExpense.expenseDate,
    originalCategoryId: originalExpense.categoryId,
    originalDescription: originalExpense.description,

    updatedTitle: finalTitle,
    updatedAmount: finalAmount,
    updatedCurrency: originalExpense.originalCurrency,
    updatedPaidByMemberId: finalPaidBy,
    updatedSelectedParticipantIds: finalParticipants,
    updatedExpenseDate: finalDate,
    updatedCategoryId: finalCategory,
    updatedDescription: finalDescription,

    editedByUserId: adminUserId,
    editedByName: adminName,
    editedAt: editTimestamp,
    reason: reason?.trim() || undefined,
  };

  // Save locally
  await saveLocalExpense(updatedExpense);
  await saveLocalEditRecord(editRecord);

  // Save to Firestore
  if (isFirebaseConfigured) {
    try {
      const expRef = doc(db, EXPENSES_COLLECTION, expenseId);
      await setDoc(expRef, sanitizeForFirestore(updatedExpense));

      const editRef = doc(db, EDIT_HISTORY_COLLECTION, editRecordId);
      await setDoc(editRef, sanitizeForFirestore(editRecord));
    } catch (err) {
      console.warn('Failed to update expense/edit history in Firestore:', err);
    }
  }

  // 4. Log to activity timeline
  const changeDetail =
    originalExpense.amount !== finalAmount
      ? `amount changed from ${formatCurrency(originalExpense.amount, originalExpense.originalCurrency)} to ${formatCurrency(finalAmount, originalExpense.originalCurrency)}`
      : `updated details for "${finalTitle}"`;

  await logActivityInFirestore({
    id: `act_${Date.now()}`,
    tripId,
    userId: adminUserId,
    userName: adminName,
    action: 'EXPENSE_UPDATED',
    details: `${adminName} edited transaction "${finalTitle}" (${changeDetail})${reason ? `: "${reason}"` : ''}`,
    amount: finalAmount,
    currency: originalExpense.originalCurrency,
    timestamp: editTimestamp,
  });

  // 5. Notify all participant members
  for (const participantId of finalParticipants) {
    await createNotificationInFirestore({
      userId: participantId,
      tripId,
      type: 'EXPENSE_EDITED',
      title: 'Expense Edited',
      message: `${adminName} updated "${finalTitle}" (${changeDetail}). Balances have been recalculated.`,
      data: { expenseId, editRecordId },
    });
  }

  return updatedExpense;
}

/**
 * Subscribes to the edit history audit log for a specific transaction.
 */
export function subscribeExpenseEditHistory(
  expenseId: string,
  callback: (records: TransactionEditRecord[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured) {
    getLocalEditHistory(expenseId).then(callback);
    return () => {};
  }

  try {
    const q = query(
      collection(db, EDIT_HISTORY_COLLECTION),
      where('expenseId', '==', expenseId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: TransactionEditRecord[] = [];
        snap.forEach((d) => {
          list.push(d.data() as TransactionEditRecord);
        });
        list.sort((a, b) => b.editedAt - a.editedAt);
        callback(list);
      },
      (err) => {
        console.warn('Edit history subscription error, using local fallback:', err);
        getLocalEditHistory(expenseId).then(callback);
      }
    );
  } catch {
    getLocalEditHistory(expenseId).then(callback);
    return () => {};
  }
}
