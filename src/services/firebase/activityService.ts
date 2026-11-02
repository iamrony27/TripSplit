import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  query,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './config';
import { ActivityEvent } from '../../types/activity';

const ACTIVITIES_COLLECTION = 'activities';

export async function logActivityInFirestore(event: ActivityEvent): Promise<void> {
  const ref = doc(db, ACTIVITIES_COLLECTION, event.id);
  await setDoc(ref, event);
}

export function subscribeTripActivities(
  tripId: string,
  callback: (activities: ActivityEvent[]) => void
): Unsubscribe {
  const q = query(
    collection(db, ACTIVITIES_COLLECTION),
    where('tripId', '==', tripId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: ActivityEvent[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ActivityEvent);
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    },
    (err) => {
      console.warn('Activities subscription error:', err);
      callback([]);
    }
  );
}

export function subscribeAllUserActivities(
  userId: string,
  tripIds: string[],
  callback: (activities: ActivityEvent[]) => void
): Unsubscribe {
  if (!tripIds || tripIds.length === 0) {
    callback([]);
    return () => {};
  }

  // Firestore in queries allow up to 30 items
  const sliced = tripIds.slice(0, 30);
  const q = query(
    collection(db, ACTIVITIES_COLLECTION),
    where('tripId', 'in', sliced)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: ActivityEvent[] = [];
      snap.forEach((d) => {
        list.push(d.data() as ActivityEvent);
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
      callback(list);
    },
    (err) => {
      console.warn('All activities subscription error:', err);
      callback([]);
    }
  );
}
