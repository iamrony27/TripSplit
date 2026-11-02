import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { GroupInvitation } from '../../types/invitation';
import { Trip } from '../../types/trip';
import { sanitizeForFirestore } from '../../utils/sanitizeFirestore';
import {
  saveLocalInvitation,
  getLocalInvitations,
  getLocalTrips,
} from '../storage/localDatabase';
import { updateTripInFirestore } from './tripService';

const INVITATIONS_COLLECTION = 'invitations';
const TRIPS_COLLECTION = 'trips';

const CODE_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates an 8-character unique uppercase alphanumeric invitation code.
 */
export function generateInvitationCode(length = 8): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * CODE_CHARS.length);
    result += CODE_CHARS.charAt(randomIndex);
  }
  return result;
}

/**
 * Creates or retrieves an active invitation code for a trip.
 */
export async function getOrCreateTripInvitation(
  tripId: string,
  tripTitle: string,
  userId: string,
  userName: string
): Promise<GroupInvitation> {
  // Check local invitations first
  const localList = await getLocalInvitations();
  const existingLocal = localList.find(
    (inv) => inv.tripId === tripId && !inv.isRevoked && (!inv.expiresAt || inv.expiresAt > Date.now())
  );
  if (existingLocal) {
    return existingLocal;
  }

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, INVITATIONS_COLLECTION),
        where('tripId', '==', tripId),
        where('isRevoked', '==', false)
      );
      const snap = await getDocs(q);
      const valid = snap.docs
        .map((d) => d.data() as GroupInvitation)
        .find((inv) => !inv.expiresAt || inv.expiresAt > Date.now());

      if (valid) {
        await saveLocalInvitation(valid);
        return valid;
      }
    } catch (err) {
      console.warn('Firestore getInvitation query failed, creating new:', err);
    }
  }

  // Create a new invitation code
  const code = generateInvitationCode(8);
  const invitationId = `inv_${code}`;
  const newInvitation: GroupInvitation = {
    id: invitationId,
    code,
    tripId,
    tripTitle,
    createdBy: userId,
    createdByName: userName,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days default expiration
    isRevoked: false,
    useCount: 0,
  };

  await saveLocalInvitation(newInvitation);

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, INVITATIONS_COLLECTION, invitationId);
      await setDoc(ref, sanitizeForFirestore(newInvitation));
      // Store current invitationCode in trip document
      await updateTripInFirestore(tripId, { invitationCode: code });
    } catch (err) {
      console.warn('Failed to save invitation in Firestore:', err);
    }
  }

  return newInvitation;
}

/**
 * Validates an invitation code (entered manually or scanned via QR code).
 * Returns trip details if valid, otherwise throws an error.
 */
export async function validateInvitationCode(
  inputCode: string
): Promise<{ isValid: boolean; trip: Trip; invitation: GroupInvitation }> {
  const sanitizedCode = inputCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (sanitizedCode.length < 6 || sanitizedCode.length > 12) {
    throw new Error('Invitation code must be 8 characters long.');
  }

  let foundInvitation: GroupInvitation | null = null;
  let foundTrip: Trip | null = null;

  // 1. Check Firestore if configured
  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, INVITATIONS_COLLECTION),
        where('code', '==', sanitizedCode)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        foundInvitation = snap.docs[0].data() as GroupInvitation;
      }

      if (foundInvitation) {
        const tripRef = doc(db, TRIPS_COLLECTION, foundInvitation.tripId);
        const tripSnap = await getDoc(tripRef);
        if (tripSnap.exists()) {
          foundTrip = tripSnap.data() as Trip;
        }
      }
    } catch (err) {
      console.warn('Firestore invitation validation error, falling back to local:', err);
    }
  }

  // 2. Local fallback
  if (!foundInvitation) {
    const localInvs = await getLocalInvitations();
    foundInvitation = localInvs.find((inv) => inv.code === sanitizedCode) || null;
  }

  if (foundInvitation && !foundTrip) {
    const localTrips = await getLocalTrips();
    foundTrip = localTrips.find((t) => t.id === foundInvitation!.tripId) || null;
  }

  if (!foundInvitation || !foundTrip) {
    throw new Error('Invalid invitation code. No matching group found.');
  }

  if (foundInvitation.isRevoked) {
    throw new Error('This invitation code has been revoked by the group administrator.');
  }

  if (foundInvitation.expiresAt && foundInvitation.expiresAt < Date.now()) {
    throw new Error('This invitation code has expired. Please ask the group administrator for a new code.');
  }

  return {
    isValid: true,
    trip: foundTrip,
    invitation: foundInvitation,
  };
}

/**
 * Revokes an existing invitation code.
 */
export async function revokeInvitation(invitationId: string, tripId: string): Promise<void> {
  const localList = await getLocalInvitations();
  const existing = localList.find((i) => i.id === invitationId);
  if (existing) {
    await saveLocalInvitation({ ...existing, isRevoked: true });
  }

  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, INVITATIONS_COLLECTION, invitationId);
      await updateDoc(ref, { isRevoked: true });
      await updateTripInFirestore(tripId, { invitationCode: undefined });
    } catch (err) {
      console.warn('Failed to revoke invitation in Firestore:', err);
    }
  }
}
