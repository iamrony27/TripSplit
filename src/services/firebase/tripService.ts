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
import { Trip, TripMember } from '../../types/trip';

const TRIPS_COLLECTION = 'trips';

export async function createTripInFirestore(trip: Trip): Promise<void> {
  const ref = doc(db, TRIPS_COLLECTION, trip.id);
  await setDoc(ref, trip);
}

export async function updateTripInFirestore(
  tripId: string,
  updates: Partial<Trip>
): Promise<void> {
  const ref = doc(db, TRIPS_COLLECTION, tripId);
  await updateDoc(ref, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export async function deleteTripInFirestore(tripId: string): Promise<void> {
  const ref = doc(db, TRIPS_COLLECTION, tripId);
  await deleteDoc(ref);
}

export function subscribeUserTrips(
  userId: string,
  callback: (trips: Trip[]) => void
): Unsubscribe {
  // Query trips where user is a participant or creator
  const q = query(
    collection(db, TRIPS_COLLECTION),
    where('memberIds', 'array-contains', userId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: Trip[] = [];
      snap.forEach((d) => {
        list.push(d.data() as Trip);
      });
      // Sort in memory by updatedAt descending
      list.sort((a, b) => b.updatedAt - a.updatedAt);
      callback(list);
    },
    (err) => {
      console.warn('Trips subscription error:', err);
      callback([]);
    }
  );
}

export function subscribeSingleTrip(
  tripId: string,
  callback: (trip: Trip | null) => void
): Unsubscribe {
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
      callback(null);
    }
  );
}

export async function addMemberToTrip(trip: Trip, newMember: TripMember): Promise<void> {
  const updatedMembers = [...trip.members, newMember];
  const updatedMemberIds = Array.from(new Set([...trip.memberIds, newMember.id, newMember.userId].filter(Boolean))) as string[];

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
