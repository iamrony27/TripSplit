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
import { ActivityEvent } from '../../types/activity';
import { sanitizeForFirestore } from '../../utils/sanitizeFirestore';
import {
  saveLocalActivity,
  subscribeLocalActivities,
  getLocalActivities,
} from '../storage/localDatabase';

const ACTIVITIES_COLLECTION = 'activities';

export async function logActivityInFirestore(event: ActivityEvent): Promise<void> {
  await saveLocalActivity(event);

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, ACTIVITIES_COLLECTION, event.id);
      await setDoc(ref, sanitizeForFirestore(event));
    } catch (err) {
      console.warn('Firestore logActivity failed, stored locally:', err);
    }
  }
}

export function subscribeTripActivities(
  tripId: string,
  callback: (activities: ActivityEvent[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || tripId.startsWith('demo_')) {
    return subscribeLocalActivities(tripId, callback);
  }

  try {
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
        console.warn('Activities subscription error, using local fallback:', err);
        subscribeLocalActivities(tripId, callback);
      }
    );
  } catch {
    return subscribeLocalActivities(tripId, callback);
  }
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

  if (!isFirebaseConfigured || userId.startsWith('local_') || userId.startsWith('demo_')) {
    Promise.all(tripIds.map((tId) => getLocalActivities(tId))).then((arrays) => {
      const flat = arrays.flat().sort((a, b) => b.timestamp - a.timestamp);
      callback(flat);
    });
    return () => {};
  }

  try {
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
        Promise.all(tripIds.map((tId) => getLocalActivities(tId))).then((arrays) => {
          const flat = arrays.flat().sort((a, b) => b.timestamp - a.timestamp);
          callback(flat);
        });
      }
    );
  } catch {
    Promise.all(tripIds.map((tId) => getLocalActivities(tId))).then((arrays) => {
      const flat = arrays.flat().sort((a, b) => b.timestamp - a.timestamp);
      callback(flat);
    });
    return () => {};
  }
}
