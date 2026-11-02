jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  updateProfile: jest.fn(),
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
  deleteDoc: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('../config', () => ({
  auth: {},
  db: {},
  isFirebaseConfigured: false,
}));

import { isUserInTrip } from '../tripService';
import { Trip } from '../../../types/trip';

describe('isUserInTrip Multi-Device Synchronization Tests', () => {
  const baseTrip: Trip = {
    id: 'trip_101',
    title: 'Manali Expedition',
    baseCurrency: 'INR',
    createdBy: 'usr_admin_123',
    totalSpend: 1500,
    createdAt: 1000,
    updatedAt: 1000,
    memberIds: ['usr_admin_123', 'phone_9876543210', 'mem_charlie'],
    members: [
      {
        id: 'usr_admin_123',
        userId: 'usr_admin_123',
        name: 'Admin Alice',
        role: 'CREATOR',
        totalPaid: 1500,
        totalShare: 500,
        netBalance: 1000,
      },
      {
        id: 'phone_9876543210',
        userId: 'phone_9876543210',
        name: 'Bob Phone',
        role: 'MEMBER',
        email: '9876543210',
        totalPaid: 0,
        totalShare: 500,
        netBalance: -500,
      },
      {
        id: 'mem_charlie',
        name: 'Charlie Dave',
        role: 'MEMBER',
        email: 'charlie@tripsplit.app',
        totalPaid: 0,
        totalShare: 500,
        netBalance: -500,
      },
    ],
  };

  test('matches creator by user id', () => {
    expect(isUserInTrip(baseTrip, 'usr_admin_123')).toBe(true);
  });

  test('matches member by memberIds entry', () => {
    expect(isUserInTrip(baseTrip, 'phone_9876543210')).toBe(true);
  });

  test('matches member when querying with clean digits from second phone', () => {
    expect(isUserInTrip(baseTrip, '9876543210')).toBe(true);
    expect(isUserInTrip(baseTrip, '+919876543210')).toBe(true);
  });

  test('matches member by email', () => {
    expect(isUserInTrip(baseTrip, 'charlie@tripsplit.app')).toBe(true);
  });

  test('returns false for unrelated user', () => {
    expect(isUserInTrip(baseTrip, 'unrelated_user_999')).toBe(false);
    expect(isUserInTrip(baseTrip, '1112223334')).toBe(false);
  });
});
