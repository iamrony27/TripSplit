import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { Expense } from '../../types/expense';

const EXPENSES_COLLECTION = 'expenses';

export async function createExpenseInFirestore(expense: Expense): Promise<void> {
  const ref = doc(db, EXPENSES_COLLECTION, expense.id);
  await setDoc(ref, expense);
}

export async function updateExpenseInFirestore(
  expenseId: string,
  updates: Partial<Expense>
): Promise<void> {
  const ref = doc(db, EXPENSES_COLLECTION, expenseId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteExpenseInFirestore(expenseId: string): Promise<void> {
  const ref = doc(db, EXPENSES_COLLECTION, expenseId);
  await deleteDoc(ref);
}

export function subscribeTripExpenses(
  tripId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    collection(db, EXPENSES_COLLECTION),
    where('tripId', '==', tripId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: Expense[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Expense);
      });
      // Sort in memory by expenseDate descending, then createdAt descending
      list.sort((a, b) => {
        if (b.expenseDate !== a.expenseDate) {
          return b.expenseDate.localeCompare(a.expenseDate);
        }
        return b.createdAt - a.createdAt;
      });
      callback(list);
    },
    (err) => {
      console.warn('Expenses subscription error:', err);
      callback([]);
    }
  );
}
