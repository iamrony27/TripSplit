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
}));

jest.mock('../config', () => ({
  auth: {},
  db: {},
  isFirebaseConfigured: false,
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginWithPhoneNumber } from '../authService';
import { JoinRequest } from '../../../types/joinRequest';
import { Trip } from '../../../types/trip';

describe('loginWithPhoneNumber Unit Tests', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('rejects phone numbers with fewer than 8 digits', async () => {
    await expect(loginWithPhoneNumber('12345')).rejects.toThrow(
      'Please enter a valid mobile number'
    );
  });

  test('returns NOT_FOUND when no group or request matches the phone number', async () => {
    const result = await loginWithPhoneNumber('9876543210');
    expect(result.success).toBe(false);
    expect(result.status).toBe('NOT_FOUND');
    expect(result.message).toContain('No approved group found');
  });

  test('returns PENDING when a pending join request exists for this phone number', async () => {
    const pendingRequest: JoinRequest = {
      id: 'req_123',
      tripId: 'trip_goa_2026',
      tripTitle: 'Goa Summer Trip',
      invitationCode: 'GOA2026',
      applicantName: 'Amit Sharma',
      applicantPhone: '+91 9876543210',
      status: 'PENDING',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await AsyncStorage.setItem(
      '@tripsplit_local_join_requests',
      JSON.stringify([pendingRequest])
    );

    const result = await loginWithPhoneNumber('9876543210');
    expect(result.success).toBe(false);
    expect(result.status).toBe('PENDING');
    expect(result.tripTitle).toBe('Goa Summer Trip');
    expect(result.message).toContain('pending administrator approval');
  });

  test('returns REJECTED when a rejected join request exists for this phone number', async () => {
    const rejectedRequest: JoinRequest = {
      id: 'req_456',
      tripId: 'trip_manali_2026',
      tripTitle: 'Manali Expedition',
      invitationCode: 'MANALI99',
      applicantName: 'Pooja Patel',
      applicantPhone: '9876543210',
      status: 'REJECTED',
      rejectionReason: 'Group is full',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await AsyncStorage.setItem(
      '@tripsplit_local_join_requests',
      JSON.stringify([rejectedRequest])
    );

    const result = await loginWithPhoneNumber('9876543210');
    expect(result.success).toBe(false);
    expect(result.status).toBe('REJECTED');
    expect(result.tripTitle).toBe('Manali Expedition');
    expect(result.message).toContain('declined');
  });

  test('returns APPROVED and initializes session when an approved join request exists', async () => {
    const approvedRequest: JoinRequest = {
      id: 'req_789',
      tripId: 'trip_kerala_2026',
      tripTitle: 'Kerala Backwaters',
      invitationCode: 'KER2026',
      applicantName: 'Rahul Kumar',
      applicantPhone: '9876543210',
      applicantUpiId: 'rahul@upi',
      status: 'APPROVED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await AsyncStorage.setItem(
      '@tripsplit_local_join_requests',
      JSON.stringify([approvedRequest])
    );

    const result = await loginWithPhoneNumber('9876543210');
    expect(result.success).toBe(true);
    expect(result.status).toBe('APPROVED');
    expect(result.tripId).toBe('trip_kerala_2026');
    expect(result.tripTitle).toBe('Kerala Backwaters');
    expect(result.profile?.fullName).toBe('Rahul Kumar');
    expect(result.profile?.upiId).toBe('rahul@upi');

    // Verify session persisted to AsyncStorage
    const activePhone = await AsyncStorage.getItem('@tripsplit_active_phone');
    expect(activePhone).toBe('9876543210');
    const lastTrip = await AsyncStorage.getItem('@tripsplit_last_joined_trip_id');
    expect(lastTrip).toBe('trip_kerala_2026');
  });

  test('returns APPROVED when phone user is an active member in a trip', async () => {
    const tripWithMember: Trip = {
      id: 'trip_ladakh_2026',
      title: 'Ladakh Bike Trip',
      baseCurrency: 'INR',
      createdBy: 'creator_uid',
      members: [
        {
          id: 'phone_9123456789',
          name: 'Vikas Singh',
          role: 'MEMBER',
          email: '9123456789',
          upiId: 'vikas@oksbi',
          totalPaid: 0,
          totalShare: 0,
          netBalance: 0,
          joinedAt: Date.now(),
        },
      ],
      memberIds: ['phone_9123456789'],
      totalSpend: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await AsyncStorage.setItem(
      '@tripsplit_local_trips',
      JSON.stringify([tripWithMember])
    );

    const result = await loginWithPhoneNumber('9123456789');
    expect(result.success).toBe(true);
    expect(result.status).toBe('APPROVED');
    expect(result.tripId).toBe('trip_ladakh_2026');
    expect(result.tripTitle).toBe('Ladakh Bike Trip');
    expect(result.profile?.fullName).toBe('Vikas Singh');
  });
});
