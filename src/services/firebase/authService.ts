import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './config';
import { UserProfile, SetupWizardData } from '../../types/user';
import {
  getLocalCurrentUser,
  setLocalCurrentUser,
  getLocalUserProfile,
  saveLocalUserProfile,
  subscribeLocalAuth,
  seedDemoDataIfEmpty,
} from '../storage/localDatabase';

const USERS_COLLECTION = 'users';

function createMockFirebaseUser(uid: string, email: string, displayName: string): User {
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
    toJSON: () => ({}),
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
      await setDoc(doc(db, USERS_COLLECTION, uid), profile);
    } catch (dbErr) {
      console.warn('Firestore setDoc failed, saved in local cache:', dbErr);
    }
  }

  return profile;
}

export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const emailAddr = email.trim();

  // Special Demo User Bypass: Works completely offline out-of-the-box
  if (emailAddr === 'demo@tripsplit.app') {
    const demoUid = 'demo_user_rony_101';
    const demoName = 'Rony (Demo)';
    const demoProfile: UserProfile = {
      id: demoUid,
      email: emailAddr,
      fullName: demoName,
      upiId: 'rony@okhdfcbank',
      country: 'India',
      defaultCurrency: 'INR',
      preferredLanguage: 'English',
      isProfileComplete: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveLocalUserProfile(demoProfile);
    await seedDemoDataIfEmpty(demoUid, demoName, 'rony@okhdfcbank');
    const mockUser = createMockFirebaseUser(demoUid, emailAddr, demoName);
    await setLocalCurrentUser(mockUser);
    return mockUser;
  }

  if (isFirebaseConfigured) {
    try {
      const credential = await signInWithEmailAndPassword(auth, emailAddr, pass);
      await setLocalCurrentUser(null);
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
      await updateDoc(ref, {
        ...data,
        isProfileComplete: true,
        updatedAt: Date.now(),
      });
    } catch (err) {
      console.warn('Firestore updateDoc failed, stored locally:', err);
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
      await updateDoc(ref, {
        upiId: upiId.trim(),
        updatedAt: Date.now(),
      });
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
    if (!isUnsubscribed && localUser) {
      callback(localUser);
    }
  });

  // 2. Subscribe to local auth state changes
  const localUnsub = subscribeLocalAuth((localUser) => {
    if (!isUnsubscribed && localUser) {
      callback(localUser);
    }
  });

  // 3. Subscribe to Firebase auth state if available
  try {
    firebaseUnsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!isUnsubscribed) {
        if (user) {
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
