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
import { auth, db } from './config';
import { UserProfile, SetupWizardData } from '../../types/user';

const USERS_COLLECTION = 'users';

export async function signUpWithEmail(
  email: string,
  pass: string,
  fullName: string
): Promise<UserProfile> {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const user = userCredential.user;

  await updateProfile(user, { displayName: fullName });

  const profile: UserProfile = {
    id: user.uid,
    email: user.email || email,
    fullName,
    country: 'India',
    defaultCurrency: 'INR',
    preferredLanguage: 'English',
    isProfileComplete: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await setDoc(doc(db, USERS_COLLECTION, user.uid), profile);
  return profile;
}

export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return credential.user;
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, USERS_COLLECTION, userId));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.warn('Failed to fetch user profile:', error);
    return null;
  }
}

export async function saveSetupWizardData(
  userId: string,
  data: SetupWizardData
): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, userId);
  await updateDoc(ref, {
    ...data,
    isProfileComplete: true,
    updatedAt: Date.now(),
  });
}

export async function updateUserUpiId(userId: string, upiId: string): Promise<void> {
  const ref = doc(db, USERS_COLLECTION, userId);
  await updateDoc(ref, {
    upiId: upiId.trim(),
    updatedAt: Date.now(),
  });
}

export function subscribeAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}
