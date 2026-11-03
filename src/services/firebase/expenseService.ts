import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { Expense } from '../../types/expense';
import { sanitizeForFirestore } from '../../utils/sanitizeFirestore';
import {
  saveLocalExpense,
  deleteLocalExpense,
  subscribeLocalExpenses,
  getLocalExpenses,
  syncTripTotalSpend,
} from '../storage/localDatabase';
import { updateTripInFirestore } from './tripService';

const EXPENSES_COLLECTION = 'expenses';

export async function createExpenseInFirestore(expense: Expense): Promise<void> {
  // Always save locally first
  await saveLocalExpense(expense);
  const newTotal = await syncTripTotalSpend(expense.tripId);

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, EXPENSES_COLLECTION, expense.id);
      await setDoc(ref, sanitizeForFirestore(expense));
      await updateTripInFirestore(expense.tripId, { totalSpend: newTotal });
    } catch (err) {
      console.warn('Firestore createExpense failed, stored in local cache:', err);
    }
  }
}

export async function updateExpenseInFirestore(
  expenseId: string,
  updates: Partial<Expense>
): Promise<void> {
  if (updates.tripId) {
    const list = await getLocalExpenses(updates.tripId);
    const existing = list.find((e) => e.id === expenseId);
    if (existing) {
      await saveLocalExpense({ ...existing, ...updates, updatedAt: Date.now() });
    }
    const newTotal = await syncTripTotalSpend(updates.tripId);
    if (isFirebaseConfigured) {
      updateTripInFirestore(updates.tripId, { totalSpend: newTotal }).catch(() => {});
    }
  }

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, EXPENSES_COLLECTION, expenseId);
      await setDoc(
        ref,
        sanitizeForFirestore({
          ...updates,
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore updateExpense failed, stored locally:', err);
    }
  }
}

export async function deleteExpenseInFirestore(expenseId: string, tripId?: string): Promise<void> {
  let newTotal = 0;
  if (tripId) {
    await deleteLocalExpense(expenseId, tripId);
    newTotal = await syncTripTotalSpend(tripId);
  }

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, EXPENSES_COLLECTION, expenseId);
      await deleteDoc(ref);
      if (tripId) {
        await updateTripInFirestore(tripId, { totalSpend: newTotal });
      }
    } catch (err) {
      console.warn('Firestore deleteExpense failed, removed locally:', err);
    }
  }
}

export function subscribeTripExpenses(
  tripId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || tripId.startsWith('demo_')) {
    return subscribeLocalExpenses(tripId, callback);
  }

  try {
    const q = query(
      collection(db, EXPENSES_COLLECTION),
      where('tripId', '==', tripId)
    );

    return onSnapshot(
      q,
      async (snap) => {
        const firestoreList: Expense[] = [];
        snap.forEach((d) => {
          const item = d.data() as Expense;
          firestoreList.push(item);
          saveLocalExpense(item).catch(() => {});
        });

        // Merge with local expenses so offline additions are retained
        const localList = await getLocalExpenses(tripId);
        const map = new Map<string, Expense>();
        localList.forEach((e) => map.set(e.id, e));
        firestoreList.forEach((e) => map.set(e.id, e));

        const list = Array.from(map.values());
        list.sort((a, b) => {
          if (b.expenseDate !== a.expenseDate) {
            return b.expenseDate.localeCompare(a.expenseDate);
          }
          return b.createdAt - a.createdAt;
        });
        callback(list);
      },
      (err) => {
        console.warn('Expenses subscription error, falling back to local store:', err);
        subscribeLocalExpenses(tripId, callback);
      }
    );
  } catch {
    return subscribeLocalExpenses(tripId, callback);
  }
}
