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
} from '../storage/localDatabase';

const EXPENSES_COLLECTION = 'expenses';

export async function createExpenseInFirestore(expense: Expense): Promise<void> {
  // Always save locally first
  await saveLocalExpense(expense);

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, EXPENSES_COLLECTION, expense.id);
      await setDoc(ref, sanitizeForFirestore(expense));
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
  if (tripId) {
    await deleteLocalExpense(expenseId, tripId);
  }

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, EXPENSES_COLLECTION, expenseId);
      await deleteDoc(ref);
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
