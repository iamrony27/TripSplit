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
import { Trip, TripMember } from '../../types/trip';
import { sanitizeForFirestore } from '../../utils/sanitizeFirestore';
import {
  saveLocalTrip,
  deleteLocalTrip,
  subscribeLocalTrips,
  getLocalTrips,
} from '../storage/localDatabase';

const TRIPS_COLLECTION = 'trips';

export async function createTripInFirestore(trip: Trip): Promise<void> {
  // Always persist locally first
  await saveLocalTrip(trip);

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, TRIPS_COLLECTION, trip.id);
      await setDoc(ref, sanitizeForFirestore(trip));
    } catch (err) {
      console.warn('Firestore createTrip failed, saved in offline cache:', err);
    }
  }
}

export async function updateTripInFirestore(
  tripId: string,
  updates: Partial<Trip>
): Promise<void> {
  const all = await getLocalTrips();
  const existing = all.find((t) => t.id === tripId);
  if (existing) {
    const updated = { ...existing, ...updates, updatedAt: Date.now() };
    await saveLocalTrip(updated);
  }

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, TRIPS_COLLECTION, tripId);
      await setDoc(
        ref,
        sanitizeForFirestore({
          ...updates,
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore updateTrip failed, saved in offline cache:', err);
    }
  }
}

export async function deleteTripInFirestore(tripId: string): Promise<void> {
  await deleteLocalTrip(tripId);

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, TRIPS_COLLECTION, tripId);
      await deleteDoc(ref);
    } catch (err) {
      console.warn('Firestore deleteTrip failed, removed locally:', err);
    }
  }
}

function matchesPhone(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const da = a.replace(/[^0-9]/g, '');
  const db = b.replace(/[^0-9]/g, '');
  if (da.length < 7 || db.length < 7) return false;
  return da === db || da.endsWith(db) || db.endsWith(da);
}

export function isUserInTrip(trip: Trip, userId: string): boolean {
  if (!trip || !userId) return false;
  if (trip.createdBy === userId || matchesPhone(trip.createdBy, userId)) return true;
  if (trip.memberIds && trip.memberIds.some((mid) => mid === userId || matchesPhone(mid, userId))) return true;

  if (
    trip.members?.some(
      (m) =>
        m.userId === userId ||
        m.id === userId ||
        m.id === `member_${userId}` ||
        matchesPhone(m.id, userId) ||
        matchesPhone(m.userId, userId) ||
        matchesPhone(m.email, userId) ||
        (m.email && m.email.toLowerCase() === userId.toLowerCase())
    )
  ) {
    return true;
  }

  return false;
}

export function subscribeUserTrips(
  userId: string,
  callback: (trips: Trip[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured) {
    return subscribeLocalTrips(userId, callback);
  }

  try {
    const q = query(collection(db, TRIPS_COLLECTION));

    return onSnapshot(
      q,
      async (snap) => {
        const firestoreTrips: Trip[] = [];
        snap.forEach((d) => {
          const t = d.data() as Trip;
          if (isUserInTrip(t, userId)) {
            firestoreTrips.push(t);
            saveLocalTrip(t).catch(() => {});
          }
        });

        // Merge with local trips so offline/local-only records are preserved
        const localList = await getLocalTrips();
        const tripMap = new Map<string, Trip>();
        localList.filter((t) => isUserInTrip(t, userId)).forEach((t) => tripMap.set(t.id, t));
        firestoreTrips.forEach((t) => tripMap.set(t.id, t));

        const combined = Array.from(tripMap.values());
        combined.sort((a, b) => b.updatedAt - a.updatedAt);
        callback(combined);
      },
      (err) => {
        console.warn('Trips Firestore subscription error, using local database:', err);
        subscribeLocalTrips(userId, callback);
      }
    );
  } catch (error) {
    console.warn('Trips query error, using local fallback:', error);
    return subscribeLocalTrips(userId, callback);
  }
}

export function subscribeSingleTrip(
  tripId: string,
  callback: (trip: Trip | null) => void
): Unsubscribe {
  if (!isFirebaseConfigured) {
    getLocalTrips().then((list) => {
      callback(list.find((t) => t.id === tripId) || null);
    });
    return () => {};
  }

  try {
    const ref = doc(db, TRIPS_COLLECTION, tripId);
    return onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          callback(snap.data() as Trip);
        } else {
          callback(null);
        }
      },
      (err) => {
        console.warn('Single trip subscription error:', err);
        getLocalTrips().then((list) => {
          callback(list.find((t) => t.id === tripId) || null);
        });
      }
    );
  } catch {
    getLocalTrips().then((list) => {
      callback(list.find((t) => t.id === tripId) || null);
    });
    return () => {};
  }
}

export async function addMemberToTrip(trip: Trip, newMember: TripMember): Promise<void> {
  const updatedMembers = [...trip.members, newMember];
  const updatedMemberIds = Array.from(
    new Set([...trip.memberIds, newMember.id, newMember.userId].filter(Boolean))
  ) as string[];

  await updateTripInFirestore(trip.id, {
    members: updatedMembers,
    memberIds: updatedMemberIds,
  });
}

export async function removeMemberFromTrip(trip: Trip, memberId: string): Promise<void> {
  const updatedMembers = trip.members.filter((m) => m.id !== memberId);
  const updatedMemberIds = updatedMembers.map((m) => m.userId || m.id);

  await updateTripInFirestore(trip.id, {
    members: updatedMembers,
    memberIds: updatedMemberIds,
  });
}

/**
 * Syncs updated or removed UPI ID across all trips where the user is a member.
 */
export async function updateMemberUpiInTrips(userId: string, upiId: string): Promise<void> {
  const allTrips = await getLocalTrips();
  for (const trip of allTrips) {
    let changed = false;
    const updatedMembers = trip.members.map((m) => {
      if (m.userId === userId || m.id === userId || m.id === `member_${userId}`) {
        changed = true;
        return {
          ...m,
          upiId: upiId ? upiId.trim() : undefined,
        };
      }
      return m;
    });

    if (changed) {
      await updateTripInFirestore(trip.id, { members: updatedMembers });
    }
  }
}

