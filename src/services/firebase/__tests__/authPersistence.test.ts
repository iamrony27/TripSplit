jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
  onAuthStateChanged: jest.fn((auth, cb) => {
    return () => {};
  }),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
}));

jest.mock('../config', () => ({
  auth: {},
  db: {},
  isFirebaseConfigured: false,
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  subscribeAuthState,
} from '../authService';
import { getLocalCurrentUser, getLocalUserProfile } from '../../storage/localDatabase';

describe('Auth Session Persistence Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  test('signInWithEmail persists user and profile in AsyncStorage', async () => {
    const user = await signInWithEmail('testuser@example.com', 'password123');
    expect(user).toBeDefined();
    expect(user.email).toBe('testuser@example.com');

    // Confirm local session is saved
    const savedSession = await getLocalCurrentUser();
    expect(savedSession).not.toBeNull();
    expect(savedSession.email).toBe('testuser@example.com');

    // Confirm user profile is saved
    const savedProfile = await getLocalUserProfile(user.uid);
    expect(savedProfile).not.toBeNull();
    expect(savedProfile?.email).toBe('testuser@example.com');
  });

  test('subscribeAuthState automatically delivers persisted session on app reload', (done) => {
    let completed = false;
    signInWithEmail('reloadtest@example.com', 'password123').then(() => {
      // Simulate app restart / reload by subscribing fresh
      const unsub = subscribeAuthState((restoredUser) => {
        if (!completed && restoredUser) {
          completed = true;
          unsub();
          expect(restoredUser.email).toBe('reloadtest@example.com');
          done();
        }
      });
    });
  });

  test('signOutUser cleanly removes persisted session', async () => {
    await signInWithEmail('signouttest@example.com', 'password123');
    let session = await getLocalCurrentUser();
    expect(session).not.toBeNull();

    await signOutUser();
    session = await getLocalCurrentUser();
    expect(session).toBeNull();
  });
});
