import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db, isFirebaseConfigured } from './config';
import { UserProfile, SetupWizardData } from '../../types/user';
import { Trip, TripMember } from '../../types/trip';
import { JoinRequest } from '../../types/joinRequest';
import { sanitizeForFirestore } from '../../utils/sanitizeFirestore';
import {
  getLocalCurrentUser,
  setLocalCurrentUser,
  getLocalUserProfile,
  saveLocalUserProfile,
  subscribeLocalAuth,
  getLocalTrips,
  saveLocalTrip,
} from '../storage/localDatabase';

export interface PhoneLoginResult {
  success: boolean;
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_FOUND';
  profile?: UserProfile;
  tripId?: string;
  tripTitle?: string;
  message?: string;
}

const USERS_COLLECTION = 'users';

export function createMockFirebaseUser(uid: string, email: string, displayName: string): User {
  return {
    uid,
    email,
    displayName,
    photoURL: null,
    emailVerified: true,
    isAnonymous: false,
    metadata: {} as any,
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({
      uid,
      email,
      displayName,
      photoURL: null,
      emailVerified: true,
      isAnonymous: false,
      phoneNumber: null,
      providerId: 'password',
    }),
    phoneNumber: null,
    providerId: 'password',
  };
}

export async function signUpWithEmail(
  email: string,
  pass: string,
  fullName: string
): Promise<UserProfile> {
  const emailAddr = email.trim();
  let uid = '';

  if (isFirebaseConfigured) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, emailAddr, pass);
      const user = userCredential.user;
      uid = user.uid;
      await updateProfile(user, { displayName: fullName });
    } catch (err: any) {
      if (
        err.code === 'auth/api-key-not-valid' ||
        err.code === 'auth/network-request-failed' ||
        err.code === 'auth/internal-error'
      ) {
        console.warn('Firebase Auth unavailable, using local offline account:', err.message);
        uid = 'local_user_' + Date.now();
      } else {
        throw err;
      }
    }
  } else {
    uid = 'local_user_' + Date.now();
  }

  const profile: UserProfile = {
    id: uid,
    email: emailAddr,
    fullName,
    country: 'India',
    defaultCurrency: 'INR',
    preferredLanguage: 'English',
    isProfileComplete: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveLocalUserProfile(profile);
  const mockUser = createMockFirebaseUser(uid, emailAddr, fullName);
  await setLocalCurrentUser(mockUser);

  if (isFirebaseConfigured && !uid.startsWith('local_user_')) {
    try {
      await setDoc(doc(db, USERS_COLLECTION, uid), sanitizeForFirestore(profile));
    } catch (dbErr) {
      console.warn('Firestore setDoc failed, saved in local cache:', dbErr);
    }
  }

  return profile;
}

export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const emailAddr = email.trim();

  if (isFirebaseConfigured) {
    try {
      const credential = await signInWithEmailAndPassword(auth, emailAddr, pass);
      const userToSave = createMockFirebaseUser(
        credential.user.uid,
        credential.user.email || emailAddr,
        credential.user.displayName || emailAddr.split('@')[0]
      );
      await setLocalCurrentUser(userToSave);

      // Cache profile locally if available in Firestore
      let profile = await getLocalUserProfile(credential.user.uid);
      if (!profile) {
        try {
          const snap = await getDoc(doc(db, USERS_COLLECTION, credential.user.uid));
          if (snap.exists()) {
            profile = snap.data() as UserProfile;
          }
        } catch (e) {
          console.warn('Firestore profile fetch on sign in notice:', e);
        }
      }
      if (!profile) {
        profile = {
          id: credential.user.uid,
          email: credential.user.email || emailAddr,
          fullName: credential.user.displayName || emailAddr.split('@')[0],
          country: 'India',
          defaultCurrency: 'INR',
          preferredLanguage: 'English',
          isProfileComplete: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
      }
      await saveLocalUserProfile(profile);

      return credential.user;
    } catch (err: any) {
      if (err.code === 'auth/api-key-not-valid') {
        console.warn('Firebase Auth API key invalid, falling back to local account verification.');
      } else {
        throw err;
      }
    }
  }

  // Local Offline Account Authentication
  const localUid = 'local_user_' + emailAddr.replace(/[^a-zA-Z0-9]/g, '_');
  let profile = await getLocalUserProfile(localUid);
  if (!profile) {
    profile = {
      id: localUid,
      email: emailAddr,
      fullName: emailAddr.split('@')[0],
      country: 'India',
      defaultCurrency: 'INR',
      preferredLanguage: 'English',
      isProfileComplete: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveLocalUserProfile(profile);
  }
  const mockUser = createMockFirebaseUser(profile.id, profile.email, profile.fullName);
  await setLocalCurrentUser(mockUser);
  return mockUser;
}

export async function signOutUser(): Promise<void> {
  await setLocalCurrentUser(null);
  try {
    if (isFirebaseConfigured) {
      await signOut(auth);
    }
  } catch (err) {
    console.warn('Firebase signOut error:', err);
  }
}

export async function sendPasswordReset(email: string): Promise<void> {
  if (isFirebaseConfigured) {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return;
    } catch (err: any) {
      if (err.code !== 'auth/api-key-not-valid') {
        throw err;
      }
    }
  }
  console.log(`[Offline Mode] Password reset requested for: ${email}`);
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const localProfile = await getLocalUserProfile(userId);
  if (localProfile) {
    return localProfile;
  }

  if (isFirebaseConfigured) {
    try {
      const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        await saveLocalUserProfile(data);
        return data;
      }
    } catch (error) {
      console.warn('Failed to fetch user profile from Firestore:', error);
    }
  }
  return null;
}

export async function saveSetupWizardData(
  userId: string,
  data: SetupWizardData
): Promise<void> {
  const existing = await getLocalUserProfile(userId);
  const updated: UserProfile = {
    ...(existing || {
      id: userId,
      email: '',
      fullName: data.fullName,
      createdAt: Date.now(),
    }),
    ...data,
    isProfileComplete: true,
    updatedAt: Date.now(),
  };
  await saveLocalUserProfile(updated);

  if (isFirebaseConfigured && !userId.startsWith('local_user_') && !userId.startsWith('demo_user_')) {
    try {
      const ref = doc(db, USERS_COLLECTION, userId);
      await setDoc(
        ref,
        sanitizeForFirestore({
          ...data,
          isProfileComplete: true,
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore setDoc/updateDoc failed, stored locally:', err);
    }
  }
}

export async function updateUserUpiId(userId: string, upiId: string): Promise<void> {
  const existing = await getLocalUserProfile(userId);
  if (existing) {
    existing.upiId = upiId.trim();
    existing.updatedAt = Date.now();
    await saveLocalUserProfile(existing);
  }

  if (isFirebaseConfigured && !userId.startsWith('local_user_') && !userId.startsWith('demo_user_')) {
    try {
      const ref = doc(db, USERS_COLLECTION, userId);
      await setDoc(
        ref,
        sanitizeForFirestore({
          upiId: upiId.trim(),
          updatedAt: Date.now(),
        }),
        { merge: true }
      );
    } catch (err) {
      console.warn('Firestore updateUserUpiId failed, stored locally:', err);
    }
  }
}

export function subscribeAuthState(callback: (user: User | null) => void) {
  let isUnsubscribed = false;
  let firebaseUnsubscribe: (() => void) | null = null;

  // 1. Initial check of local user
  getLocalCurrentUser().then((localUser) => {
    if (!isUnsubscribed) {
      if (localUser) {
        callback(localUser);
      } else if (!isFirebaseConfigured) {
        callback(null);
      }
    }
  });

  // 2. Subscribe to local auth state changes
  const localUnsub = subscribeLocalAuth((localUser) => {
    if (!isUnsubscribed) {
      callback(localUser);
    }
  });

  // 3. Subscribe to Firebase auth state if available
  try {
    firebaseUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isUnsubscribed) {
        if (user) {
          const userToSave = createMockFirebaseUser(
            user.uid,
            user.email || '',
            user.displayName || 'Member'
          );
          await setLocalCurrentUser(userToSave);
          callback(user);
        } else {
          const localUser = await getLocalCurrentUser();
          callback(localUser);
        }
      }
    });
  } catch (err) {
    console.warn('Firebase onAuthStateChanged error:', err);
  }

  return () => {
    isUnsubscribed = true;
    localUnsub();
    if (firebaseUnsubscribe) firebaseUnsubscribe();
  };
}

export function matchPhoneNumbers(phoneA?: string, phoneB?: string): boolean {
  if (!phoneA || !phoneB) return false;
  const digitsA = phoneA.replace(/[^0-9]/g, '');
  const digitsB = phoneB.replace(/[^0-9]/g, '');
  if (digitsA.length < 7 || digitsB.length < 7) return false;
  if (digitsA === digitsB) return true;
  return digitsA.endsWith(digitsB) || digitsB.endsWith(digitsA);
}

/**
 * Logs in or grants app access using ONLY mobile phone number.
 * Looks up approved group memberships or approved join requests across Firestore & local database.
 */
export async function loginWithPhoneNumber(phoneNumber: string): Promise<PhoneLoginResult> {
  const cleanDigits = phoneNumber.trim().replace(/[^0-9]/g, '');
  if (cleanDigits.length < 8) {
    throw new Error('Please enter a valid mobile number (at least 8 digits).');
  }

  let foundRequest: JoinRequest | null = null;
  let matchingTrip: Trip | null = null;
  let matchingMember: TripMember | null = null;

  // 1. Search joinRequests in Firestore
  if (isFirebaseConfigured) {
    try {
      const candidates = [cleanDigits, `+91${cleanDigits}`, `91${cleanDigits}`, `0${cleanDigits}`];
      const q = query(
        collection(db, 'joinRequests'),
        where('applicantPhone', 'in', candidates)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const list = snap.docs.map((d) => d.data() as JoinRequest);
        list.sort((a, b) => b.createdAt - a.createdAt);
        foundRequest = list[0];
      }
    } catch (err) {
      console.warn('Firestore phone lookup in joinRequests:', err);
    }
  }

  // 2. Search joinRequests in local storage
  if (!foundRequest) {
    try {
      const allLocalRequests = await AsyncStorage.getItem('@tripsplit_local_join_requests');
      if (allLocalRequests) {
        const list: JoinRequest[] = JSON.parse(allLocalRequests);
        foundRequest =
          list.find((r) => matchPhoneNumbers(r.applicantPhone, cleanDigits)) || null;
      }
    } catch (err) {
      console.warn('Local join request phone lookup error:', err);
    }
  }

  // 3. Search in local trips
  const localTrips = await getLocalTrips();
  for (const t of localTrips) {
    const m = t.members.find(
      (mem) =>
        matchPhoneNumbers(mem.email, cleanDigits) ||
        matchPhoneNumbers(mem.id, cleanDigits)
    );
    if (m) {
      matchingTrip = t;
      matchingMember = m;
      break;
    }
  }

  // 4. Search in Firestore trips if not found locally
  if (!matchingMember && isFirebaseConfigured) {
    try {
      const qTrips = query(collection(db, 'trips'));
      const snap = await getDocs(qTrips);
      for (const docSnap of snap.docs) {
        const t = docSnap.data() as Trip;
        const m = t.members?.find(
          (mem) =>
            matchPhoneNumbers(mem.email, cleanDigits) ||
            matchPhoneNumbers(mem.id, cleanDigits)
        );
        if (m) {
          matchingTrip = t;
          matchingMember = m;
          await saveLocalTrip(t);
          break;
        }
      }
    } catch (err) {
      console.warn('Firestore trips phone lookup notice:', err);
    }
  }

  // 5. Evaluate findings
  // Case A: Member is actively in a group (already approved!)
  if (matchingMember && matchingTrip) {
    const userId = matchingMember.userId || matchingMember.id || `phone_${cleanDigits}`;
    const profile: UserProfile = {
      id: userId,
      email: `${cleanDigits}@phone.tripsplit.app`,
      fullName: matchingMember.name || 'Member',
      country: 'India',
      defaultCurrency: matchingTrip.baseCurrency || 'INR',
      preferredLanguage: 'English',
      upiId: matchingMember.upiId,
      isProfileComplete: true,
      createdAt: matchingMember.joinedAt || Date.now(),
      updatedAt: Date.now(),
    };

    await saveLocalUserProfile(profile);
    const mockUser = createMockFirebaseUser(profile.id, profile.email, profile.fullName);
    await setLocalCurrentUser(mockUser);
    await AsyncStorage.setItem('@tripsplit_active_phone', cleanDigits);
    await AsyncStorage.setItem('@tripsplit_last_joined_trip_id', matchingTrip.id);

    return {
      success: true,
      status: 'APPROVED',
      profile,
      tripId: matchingTrip.id,
      tripTitle: matchingTrip.title,
      message: `Welcome back, ${matchingMember.name}! You are in "${matchingTrip.title}".`,
    };
  }

  // Case B: JoinRequest was found
  if (foundRequest) {
    if (foundRequest.status === 'APPROVED') {
      const userId = foundRequest.applicantUserId || `phone_${cleanDigits}`;
      const profile: UserProfile = {
        id: userId,
        email: `${cleanDigits}@phone.tripsplit.app`,
        fullName: foundRequest.applicantName || 'Member',
        country: 'India',
        defaultCurrency: 'INR',
        preferredLanguage: 'English',
        upiId: foundRequest.applicantUpiId,
        isProfileComplete: true,
        createdAt: foundRequest.createdAt,
        updatedAt: Date.now(),
      };

      await saveLocalUserProfile(profile);
      const mockUser = createMockFirebaseUser(profile.id, profile.email, profile.fullName);
      await setLocalCurrentUser(mockUser);
      await AsyncStorage.setItem('@tripsplit_active_phone', cleanDigits);
      if (foundRequest.tripId) {
        await AsyncStorage.setItem('@tripsplit_last_joined_trip_id', foundRequest.tripId);
      }

      return {
        success: true,
        status: 'APPROVED',
        profile,
        tripId: foundRequest.tripId,
        tripTitle: foundRequest.tripTitle,
        message: `Your request was approved! Welcome to "${foundRequest.tripTitle}".`,
      };
    } else if (foundRequest.status === 'PENDING') {
      return {
        success: false,
        status: 'PENDING',
        tripId: foundRequest.tripId,
        tripTitle: foundRequest.tripTitle,
        message: `Your request to join "${foundRequest.tripTitle}" is currently pending administrator approval. Once approved, you can enter immediately using this mobile number.`,
      };
    } else if (foundRequest.status === 'REJECTED') {
      return {
        success: false,
        status: 'REJECTED',
        tripId: foundRequest.tripId,
        tripTitle: foundRequest.tripTitle,
        message: `Your request to join "${foundRequest.tripTitle}" was declined by the administrator.${foundRequest.rejectionReason ? ` Reason: ${foundRequest.rejectionReason}` : ''}`,
      };
    }
  }

  // Case C: No request or group found for this phone number
  return {
    success: false,
    status: 'NOT_FOUND',
    message: 'No approved group found for this mobile number. Please ask the group admin for an invitation code or QR to join a group.',
  };
}
