import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { JoinRequest, JoinRequestStatus } from '../../types/joinRequest';
import { Trip, TripMember, MemberRole } from '../../types/trip';
import { sanitizeForFirestore } from '../../utils/sanitizeFirestore';
import {
  saveLocalJoinRequest,
  getLocalJoinRequests,
  subscribeLocalJoinRequests,
  saveLocalTrip,
  getLocalTrips,
} from '../storage/localDatabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addMemberToTrip, updateTripInFirestore } from './tripService';
import { logActivityInFirestore } from './activityService';
import { createNotificationInFirestore } from './notificationService';
import { sendPhoneNotification } from '../notifications/deviceNotificationService';

const JOIN_REQUESTS_COLLECTION = 'joinRequests';
const TRIPS_COLLECTION = 'trips';

/**
 * Submits a new group join request.
 * Prevents duplicate pending requests for the same applicant and group.
 */
export async function submitJoinRequest(params: {
  tripId: string;
  tripTitle: string;
  invitationCode: string;
  applicantUserId?: string;
  applicantName: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantUpiId?: string;
}): Promise<JoinRequest> {
  const {
    tripId,
    tripTitle,
    invitationCode,
    applicantUserId,
    applicantName,
    applicantEmail,
    applicantPhone,
    applicantUpiId,
  } = params;

  // 1. Prevent duplicate pending requests
  const localRequests = await getLocalJoinRequests(tripId);
  const duplicateLocal = localRequests.find(
    (r) =>
      r.status === 'PENDING' &&
      ((applicantUserId && r.applicantUserId === applicantUserId) ||
        (applicantEmail && r.applicantEmail?.toLowerCase() === applicantEmail.toLowerCase()) ||
        r.applicantName.toLowerCase() === applicantName.toLowerCase())
  );

  if (duplicateLocal) {
    throw new Error('A join request is already pending approval for this group.');
  }

  if (isFirebaseConfigured) {
    try {
      const q = query(
        collection(db, JOIN_REQUESTS_COLLECTION),
        where('tripId', '==', tripId),
        where('status', '==', 'PENDING')
      );
      const snap = await getDocs(q);
      const existing = snap.docs
        .map((d) => d.data() as JoinRequest)
        .find(
          (r) =>
            (applicantUserId && r.applicantUserId === applicantUserId) ||
            (applicantEmail && r.applicantEmail?.toLowerCase() === applicantEmail.toLowerCase())
        );

      if (existing) {
        throw new Error('You already have a pending join request for this group. Please await administrator review.');
      }
    } catch (err: any) {
      if (err.message.includes('already have a pending')) {
        throw err;
      }
      console.warn('Firestore duplicate check error, proceeding with local check:', err);
    }
  }

  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const newRequest: JoinRequest = {
    id: requestId,
    tripId,
    tripTitle,
    invitationCode,
    applicantUserId,
    applicantName,
    applicantEmail,
    applicantPhone,
    applicantUpiId,
    status: 'PENDING',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Save locally
  await saveLocalJoinRequest(newRequest);

  // Save to Firestore
  if (isFirebaseConfigured) {
    try {
      const ref = doc(db, JOIN_REQUESTS_COLLECTION, requestId);
      await setDoc(ref, sanitizeForFirestore(newRequest));
    } catch (err) {
      console.warn('Failed to save join request in Firestore:', err);
    }
  }

  // Log activity
  await logActivityInFirestore({
    id: `act_${Date.now()}`,
    tripId,
    tripTitle,
    userId: applicantUserId || 'guest',
    userName: applicantName,
    action: 'JOIN_REQUEST_SUBMITTED',
    details: `${applicantName} requested to join group via code ${invitationCode}`,
    timestamp: Date.now(),
  });

  // Notify group creator / admin
  let tripCreatorUid = '';
  const localTrips = await getLocalTrips();
  const trip = localTrips.find((t) => t.id === tripId);
  if (trip) {
    tripCreatorUid = trip.createdBy;
  } else if (isFirebaseConfigured) {
    try {
      const tripSnap = await getDoc(doc(db, TRIPS_COLLECTION, tripId));
      if (tripSnap.exists()) {
        tripCreatorUid = tripSnap.data()?.createdBy || '';
      }
    } catch (err) {
      console.warn('Failed to fetch trip creator from Firestore:', err);
    }
  }

  if (tripCreatorUid) {
    await createNotificationInFirestore({
      userId: tripCreatorUid,
      tripId,
      tripTitle,
      type: 'JOIN_REQUEST_RECEIVED',
      title: 'New Join Request',
      message: `${applicantName} has requested to join "${tripTitle}". Tap to approve or reject.`,
      data: { requestId, applicantName, applicantUserId, applicantPhone },
    });
  }

  return newRequest;
}

/**
 * Directly joins a trip using a verified invitation code.
 * Adds the member directly to the trip in Firestore & local DB without an approval blocking page,
 * saves the invitation code in AsyncStorage, sends device notification with default sound,
 * and records an approved join entry so the administrator can manage/view them in the group.
 */
export async function joinTripWithInvitationCode(params: {
  tripId: string;
  tripTitle: string;
  invitationCode: string;
  applicantName: string;
  applicantPhone?: string;
  applicantEmail?: string;
  applicantUpiId?: string;
  applicantUserId?: string;
}): Promise<{ trip: Trip; member: TripMember }> {
  const {
    tripId,
    tripTitle,
    invitationCode,
    applicantName,
    applicantPhone,
    applicantEmail,
    applicantUpiId,
    applicantUserId,
  } = params;

  // 1. Fetch current trip
  let trip: Trip | null = null;
  if (isFirebaseConfigured) {
    try {
      const tripRef = doc(db, TRIPS_COLLECTION, tripId);
      const snap = await getDoc(tripRef);
      if (snap.exists()) {
        trip = snap.data() as Trip;
      }
    } catch (err) {
      console.warn('Firestore trip fetch notice, trying local:', err);
    }
  }

  if (!trip) {
    const localTrips = await getLocalTrips();
    trip = localTrips.find((t) => t.id === tripId) || null;
  }

  if (!trip) {
    // Construct minimal fallback if necessary
    trip = {
      id: tripId,
      title: tripTitle,
      baseCurrency: 'INR',
      createdBy: 'admin',
      members: [],
      memberIds: [],
      totalSpend: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  // 2. Generate clean member identifier
  const cleanPhone = applicantPhone ? applicantPhone.replace(/[^0-9]/g, '') : '';
  const memberId =
    applicantUserId ||
    (cleanPhone ? `phone_${cleanPhone}` : `member_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`);

  // Check if already a member
  const existingMember = trip.members.find(
    (m) =>
      (m.userId && m.userId === memberId) ||
      m.id === memberId ||
      (cleanPhone && m.email === cleanPhone) ||
      (m.name.toLowerCase() === applicantName.toLowerCase() && (m.upiId === applicantUpiId || m.email === applicantEmail))
  );

  let updatedMembers = [...trip.members];
  let updatedMemberIds = [...(trip.memberIds || [])];
  let memberObj: TripMember;

  if (existingMember) {
    memberObj = existingMember;
  } else {
    memberObj = {
      id: memberId,
      userId: applicantUserId,
      name: applicantName.trim(),
      role: 'MEMBER',
      email: applicantEmail?.trim() || (cleanPhone ? applicantPhone : undefined),
      upiId: applicantUpiId?.trim() || undefined,
      totalPaid: 0,
      totalShare: 0,
      netBalance: 0,
      joinedAt: Date.now(),
    };
    updatedMembers.push(memberObj);
    if (!updatedMemberIds.includes(memberId)) {
      updatedMemberIds.push(memberId);
    }
  }

  const updatedTrip: Trip = {
    ...trip,
    members: updatedMembers,
    memberIds: updatedMemberIds,
    updatedAt: Date.now(),
  };

  // 3. Save trip locally and in Firestore
  await saveLocalTrip(updatedTrip);

  if (isFirebaseConfigured) {
    try {
      const tripRef = doc(db, TRIPS_COLLECTION, tripId);
      await setDoc(tripRef, sanitizeForFirestore(updatedTrip), { merge: true });
    } catch (err) {
      console.warn('Failed to update trip members in Firestore:', err);
    }
  }

  // 4. Record approved join request for admin visibility in Members / Join Requests tab
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const joinRecord: JoinRequest = {
    id: requestId,
    tripId,
    tripTitle,
    invitationCode,
    applicantUserId: applicantUserId || memberId,
    applicantName: applicantName.trim(),
    applicantEmail: applicantEmail?.trim() || undefined,
    applicantPhone: applicantPhone?.trim() || undefined,
    applicantUpiId: applicantUpiId?.trim() || undefined,
    status: 'APPROVED',
    assignedRole: 'MEMBER',
    reviewedBy: trip.createdBy,
    reviewedByName: 'Invite Code Joined',
    reviewedAt: Date.now(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveLocalJoinRequest(joinRecord);

  if (isFirebaseConfigured) {
    try {
      const reqRef = doc(db, JOIN_REQUESTS_COLLECTION, requestId);
      await setDoc(reqRef, sanitizeForFirestore(joinRecord));
    } catch (err) {
      console.warn('Failed to save join record in Firestore:', err);
    }
  }

  // 5. Log activity
  await logActivityInFirestore({
    id: `act_${Date.now()}`,
    tripId,
    tripTitle,
    userId: applicantUserId || memberId,
    userName: applicantName,
    action: 'MEMBER_ADDED',
    details: `${applicantName}${cleanPhone ? ` (${cleanPhone})` : ''} joined "${tripTitle}" via code ${invitationCode}`,
    timestamp: Date.now(),
  });

  // 6. Notify group creator / admin in Firestore
  if (trip.createdBy) {
    await createNotificationInFirestore({
      userId: trip.createdBy,
      tripId,
      tripTitle,
      type: 'JOIN_REQUEST_APPROVED',
      title: 'New Member Joined!',
      message: `${applicantName}${applicantPhone ? ` (${applicantPhone})` : ''} joined "${tripTitle}" using invitation code.`,
      data: { requestId, applicantName, applicantPhone, applicantUserId: memberId },
    });
  }

  // 7. Save invitation code and trip to AsyncStorage so new user is never asked again
  try {
    await AsyncStorage.setItem('@tripsplit_saved_invitation_code', invitationCode);
    await AsyncStorage.setItem('@tripsplit_last_joined_trip_id', tripId);
    await AsyncStorage.setItem('@tripsplit_active_member_id', memberId);
    await AsyncStorage.setItem('@tripsplit_active_member_name', applicantName);
  } catch (err) {
    console.warn('Failed to save invitation code to AsyncStorage:', err);
  }

  // 8. Trigger phone notification with default sound
  await sendPhoneNotification({
    title: `Joined ${tripTitle}!`,
    body: `You are now a member of ${tripTitle}. All shared expenses are synced.`,
    data: { tripId },
  });

  return { trip: updatedTrip, member: memberObj };
}

/**
 * Subscribes to pending join requests for a trip (Group Admin view).
 */
export function subscribeTripJoinRequests(
  tripId: string,
  callback: (requests: JoinRequest[]) => void
): Unsubscribe {
  if (!isFirebaseConfigured || tripId.startsWith('demo_')) {
    return subscribeLocalJoinRequests(tripId, callback);
  }

  try {
    const q = query(
      collection(db, JOIN_REQUESTS_COLLECTION),
      where('tripId', '==', tripId)
    );

    return onSnapshot(
      q,
      (snap) => {
        const list: JoinRequest[] = [];
        snap.forEach((d) => {
          list.push(d.data() as JoinRequest);
        });
        list.sort((a, b) => b.createdAt - a.createdAt);
        callback(list);
      },
      (err) => {
        console.warn('Join requests subscription error, using local fallback:', err);
        subscribeLocalJoinRequests(tripId, callback);
      }
    );
  } catch {
    return subscribeLocalJoinRequests(tripId, callback);
  }
}

/**
 * Approves a pending join request.
 * Creates group membership for the applicant and synchronizes across devices.
 */
export async function approveJoinRequest(params: {
  request: JoinRequest;
  adminUserId: string;
  adminName: string;
  role?: MemberRole;
}): Promise<void> {
  const { request, adminUserId, adminName, role = 'MEMBER' } = params;

  // 1. Fetch trip
  let trip: Trip | null = null;
  if (isFirebaseConfigured) {
    try {
      const tripRef = doc(db, TRIPS_COLLECTION, request.tripId);
      const snap = await getDoc(tripRef);
      if (snap.exists()) {
        trip = snap.data() as Trip;
      }
    } catch (err) {
      console.warn('Failed to fetch trip for approval from Firestore:', err);
    }
  }

  if (!trip) {
    const localTrips = await getLocalTrips();
    trip = localTrips.find((t) => t.id === request.tripId) || null;
  }

  if (!trip) {
    throw new Error('Trip not found for this join request.');
  }

  // 2. Check if already a member
  const alreadyMember = trip.members.some(
    (m) =>
      (request.applicantUserId && (m.userId === request.applicantUserId || m.id === request.applicantUserId)) ||
      m.name.toLowerCase() === request.applicantName.toLowerCase()
  );

  const updatedRequest: JoinRequest = {
    ...request,
    status: 'APPROVED',
    reviewedBy: adminUserId,
    reviewedByName: adminName,
    reviewedAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveLocalJoinRequest(updatedRequest);

  if (isFirebaseConfigured) {
    try {
      const reqRef = doc(db, JOIN_REQUESTS_COLLECTION, request.id);
      await setDoc(reqRef, sanitizeForFirestore(updatedRequest), { merge: true });
    } catch (err) {
      console.warn('Failed to update join request in Firestore:', err);
    }
  }

  // 3. Add member to trip if not already present
  if (!alreadyMember) {
    const newMemberId = request.applicantUserId || `member_${Date.now()}`;
    const newMember: TripMember = {
      id: newMemberId,
      userId: request.applicantUserId,
      name: request.applicantName,
      role,
      email: request.applicantEmail,
      upiId: request.applicantUpiId,
      totalPaid: 0,
      totalShare: 0,
      netBalance: 0,
      joinedAt: Date.now(),
    };

    await addMemberToTrip(trip, newMember);
  }

  // 4. Log activity
  await logActivityInFirestore({
    id: `act_${Date.now()}`,
    tripId: request.tripId,
    tripTitle: request.tripTitle,
    userId: adminUserId,
    userName: adminName,
    action: 'JOIN_REQUEST_APPROVED',
    details: `${adminName} approved ${request.applicantName} to join the group`,
    timestamp: Date.now(),
  });

  // 5. Notify applicant
  if (request.applicantUserId) {
    await createNotificationInFirestore({
      userId: request.applicantUserId,
      tripId: request.tripId,
      tripTitle: request.tripTitle,
      type: 'JOIN_REQUEST_APPROVED',
      title: 'Join Request Approved!',
      message: `Your request to join "${request.tripTitle}" was approved by ${adminName}. Welcome!`,
    });
  }
}

/**
 * Rejects a pending join request.
 */
export async function rejectJoinRequest(params: {
  request: JoinRequest;
  adminUserId: string;
  adminName: string;
  reason?: string;
}): Promise<void> {
  const { request, adminUserId, adminName, reason } = params;

  const updatedRequest: JoinRequest = {
    ...request,
    status: 'REJECTED',
    reviewedBy: adminUserId,
    reviewedByName: adminName,
    reviewedAt: Date.now(),
    rejectionReason: reason || 'Declined by group administrator',
    updatedAt: Date.now(),
  };

  await saveLocalJoinRequest(updatedRequest);

  if (isFirebaseConfigured) {
    try {
      const reqRef = doc(db, JOIN_REQUESTS_COLLECTION, request.id);
      await setDoc(reqRef, sanitizeForFirestore(updatedRequest), { merge: true });
    } catch (err) {
      console.warn('Failed to update rejected join request in Firestore:', err);
    }
  }

  // Log activity
  await logActivityInFirestore({
    id: `act_${Date.now()}`,
    tripId: request.tripId,
    tripTitle: request.tripTitle,
    userId: adminUserId,
    userName: adminName,
    action: 'JOIN_REQUEST_REJECTED',
    details: `${adminName} declined join request from ${request.applicantName}`,
    timestamp: Date.now(),
  });

  // Notify applicant
  if (request.applicantUserId) {
    await createNotificationInFirestore({
      userId: request.applicantUserId,
      tripId: request.tripId,
      tripTitle: request.tripTitle,
      type: 'JOIN_REQUEST_REJECTED',
      title: 'Join Request Declined',
      message: `Your request to join "${request.tripTitle}" was declined.${reason ? ` Reason: ${reason}` : ''}`,
    });
  }
}
