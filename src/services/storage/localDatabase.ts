import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, SetupWizardData } from '../../types/user';
import { Trip, TripMember } from '../../types/trip';
import { Expense } from '../../types/expense';
import { PaymentRecord } from '../../types/settlement';
import { ActivityEvent } from '../../types/activity';
import { GroupInvitation } from '../../types/invitation';
import { JoinRequest } from '../../types/joinRequest';
import { TransactionEditRecord } from '../../types/editHistory';
import { MemberMergeRecord } from '../../types/mergeHistory';
import { AppNotification } from '../../types/notification';

const STORAGE_KEYS = {
  CURRENT_USER: '@tripsplit_local_current_user',
  USER_PROFILES: '@tripsplit_local_user_profiles',
  TRIPS: '@tripsplit_local_trips',
  EXPENSES: '@tripsplit_local_expenses',
  PAYMENTS: '@tripsplit_local_payments',
  ACTIVITIES: '@tripsplit_local_activities',
  INVITATIONS: '@tripsplit_local_invitations',
  JOIN_REQUESTS: '@tripsplit_local_join_requests',
  EDIT_HISTORY: '@tripsplit_local_edit_history',
  MERGE_HISTORY: '@tripsplit_local_merge_history',
  NOTIFICATIONS: '@tripsplit_local_notifications',
};

// Event emitter callbacks for real-time local updates
type Listener<T> = (data: T) => void;
const tripListeners = new Set<Listener<Trip[]>>();
const expenseListeners = new Map<string, Set<Listener<Expense[]>>>();
const paymentListeners = new Map<string, Set<Listener<PaymentRecord[]>>>();
const activityListeners = new Map<string, Set<Listener<ActivityEvent[]>>>();
const authListeners = new Set<Listener<any | null>>();

// --- Auth & Profile Management ---

export async function getLocalCurrentUser(): Promise<any | null> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
  return json ? JSON.parse(json) : null;
}

export async function setLocalCurrentUser(user: any | null): Promise<void> {
  if (user) {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  } else {
    await AsyncStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
  authListeners.forEach((cb) => cb(user));
}

export function subscribeLocalAuth(callback: (user: any | null) => void): () => void {
  authListeners.add(callback);
  getLocalCurrentUser().then(callback);
  return () => {
    authListeners.delete(callback);
  };
}

export async function getLocalUserProfile(userId: string): Promise<UserProfile | null> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILES);
  const profiles: Record<string, UserProfile> = json ? JSON.parse(json) : {};
  return profiles[userId] || null;
}

export async function saveLocalUserProfile(profile: UserProfile): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.USER_PROFILES);
  const profiles: Record<string, UserProfile> = json ? JSON.parse(json) : {};
  profiles[profile.id] = profile;
  await AsyncStorage.setItem(STORAGE_KEYS.USER_PROFILES, JSON.stringify(profiles));
}

// --- Trips Management ---

export async function getLocalTrips(userId?: string): Promise<Trip[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.TRIPS);
  const list: Trip[] = json ? JSON.parse(json) : [];

  // Cross-reference with all saved expenses to ensure totalSpend is always accurately computed
  const expJson = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
  const allExpenses: Expense[] = expJson ? JSON.parse(expJson) : [];

  const enrichedList = list.map((trip) => {
    const tripExps = allExpenses.filter((e) => e.tripId === trip.id);
    if (tripExps.length > 0) {
      const sum = tripExps.reduce((acc, e) => acc + (e.convertedAmount || e.amount || 0), 0);
      return { ...trip, totalSpend: Math.round(sum * 100) / 100 };
    }
    return trip;
  });

  if (userId) {
    return enrichedList.filter((t) => t.memberIds.includes(userId));
  }
  return enrichedList;
}

export async function syncTripTotalSpend(tripId: string): Promise<number> {
  const expJson = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
  const allExpenses: Expense[] = expJson ? JSON.parse(expJson) : [];
  const tripExps = allExpenses.filter((e) => e.tripId === tripId);
  const sum = Math.round(tripExps.reduce((acc, e) => acc + (e.convertedAmount || e.amount || 0), 0) * 100) / 100;

  const tripsJson = await AsyncStorage.getItem(STORAGE_KEYS.TRIPS);
  if (tripsJson) {
    const list: Trip[] = JSON.parse(tripsJson);
    const idx = list.findIndex((t) => t.id === tripId);
    if (idx >= 0 && list[idx].totalSpend !== sum) {
      list[idx].totalSpend = sum;
      list[idx].updatedAt = Date.now();
      await AsyncStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(list));
      notifyTripListeners();
    }
  }
  return sum;
}

export async function saveLocalTrip(trip: Trip): Promise<void> {
  const list = await getLocalTrips();
  const index = list.findIndex((t) => t.id === trip.id);
  if (index >= 0) {
    list[index] = trip;
  } else {
    list.unshift(trip);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(list));
  notifyTripListeners();
}

export async function deleteLocalTrip(tripId: string): Promise<void> {
  let list = await getLocalTrips();
  list = list.filter((t) => t.id !== tripId);
  await AsyncStorage.setItem(STORAGE_KEYS.TRIPS, JSON.stringify(list));
  notifyTripListeners();
}

export function subscribeLocalTrips(
  userId: string,
  callback: (trips: Trip[]) => void
): () => void {
  tripListeners.add(callback);
  getLocalTrips(userId).then(callback);
  return () => {
    tripListeners.delete(callback);
  };
}

function notifyTripListeners() {
  getLocalTrips().then((all) => {
    tripListeners.forEach((cb) => cb(all));
  });
}

// --- Expenses Management ---

export async function getLocalExpenses(tripId: string): Promise<Expense[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
  const all: Expense[] = json ? JSON.parse(json) : [];
  return all
    .filter((e) => e.tripId === tripId)
    .sort((a, b) => {
      if (b.expenseDate !== a.expenseDate) return b.expenseDate.localeCompare(a.expenseDate);
      return b.createdAt - a.createdAt;
    });
}

export async function saveLocalExpense(expense: Expense): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
  const all: Expense[] = json ? JSON.parse(json) : [];
  const index = all.findIndex((e) => e.id === expense.id);
  if (index >= 0) {
    all[index] = expense;
  } else {
    all.unshift(expense);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(all));
  notifyExpenseListeners(expense.tripId);
  await syncTripTotalSpend(expense.tripId);
}

export async function deleteLocalExpense(expenseId: string, tripId: string): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.EXPENSES);
  let all: Expense[] = json ? JSON.parse(json) : [];
  all = all.filter((e) => e.id !== expenseId);
  await AsyncStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(all));
  notifyExpenseListeners(tripId);
  await syncTripTotalSpend(tripId);
}

export function subscribeLocalExpenses(
  tripId: string,
  callback: (expenses: Expense[]) => void
): () => void {
  if (!expenseListeners.has(tripId)) {
    expenseListeners.set(tripId, new Set());
  }
  expenseListeners.get(tripId)!.add(callback);
  getLocalExpenses(tripId).then(callback);
  return () => {
    expenseListeners.get(tripId)?.delete(callback);
  };
}

function notifyExpenseListeners(tripId: string) {
  getLocalExpenses(tripId).then((list) => {
    expenseListeners.get(tripId)?.forEach((cb) => cb(list));
  });
}

// --- Settlements & Payments ---

export async function getLocalPayments(tripId: string): Promise<PaymentRecord[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
  const all: PaymentRecord[] = json ? JSON.parse(json) : [];
  return all.filter((p) => p.tripId === tripId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveLocalPayment(payment: PaymentRecord): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.PAYMENTS);
  const all: PaymentRecord[] = json ? JSON.parse(json) : [];
  const index = all.findIndex((p) => p.id === payment.id);
  if (index >= 0) {
    all[index] = payment;
  } else {
    all.unshift(payment);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(all));
  notifyPaymentListeners(payment.tripId);
}

export function subscribeLocalPayments(
  tripId: string,
  callback: (payments: PaymentRecord[]) => void
): () => void {
  if (!paymentListeners.has(tripId)) {
    paymentListeners.set(tripId, new Set());
  }
  paymentListeners.get(tripId)!.add(callback);
  getLocalPayments(tripId).then(callback);
  return () => {
    paymentListeners.get(tripId)?.delete(callback);
  };
}

function notifyPaymentListeners(tripId: string) {
  getLocalPayments(tripId).then((list) => {
    paymentListeners.get(tripId)?.forEach((cb) => cb(list));
  });
}

// --- Activities Management ---

export async function getLocalActivities(tripId: string): Promise<ActivityEvent[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES);
  const all: ActivityEvent[] = json ? JSON.parse(json) : [];
  return all.filter((a) => a.tripId === tripId).sort((a, b) => b.timestamp - a.timestamp);
}

export async function saveLocalActivity(activity: ActivityEvent): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.ACTIVITIES);
  const all: ActivityEvent[] = json ? JSON.parse(json) : [];
  all.unshift(activity);
  await AsyncStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify(all));
  notifyActivityListeners(activity.tripId);
}

export function subscribeLocalActivities(
  tripId: string,
  callback: (activities: ActivityEvent[]) => void
): () => void {
  if (!activityListeners.has(tripId)) {
    activityListeners.set(tripId, new Set());
  }
  activityListeners.get(tripId)!.add(callback);
  getLocalActivities(tripId).then(callback);
  return () => {
    activityListeners.get(tripId)?.delete(callback);
  };
}

function notifyActivityListeners(tripId: string) {
  getLocalActivities(tripId).then((list) => {
    activityListeners.get(tripId)?.forEach((cb) => cb(list));
  });
}

// --- Seed Demo Data for Instant Exploration ---

export async function seedDemoDataIfEmpty(
  userId: string,
  userName: string,
  userUpiId: string = '7074018142@ptsbi'
): Promise<Trip> {
  const existing = await getLocalTrips(userId);
  if (existing.length > 0) {
    return existing[0];
  }

  const tripId = 'demo_trip_goa_2026';
  const members: TripMember[] = [
    {
      id: userId,
      name: userName,
      upiId: userUpiId,
      totalPaid: 12000,
      totalShare: 5850,
      netBalance: 6150,
    },
    {
      id: 'member_rahul',
      name: 'Rahul Sharma',
      upiId: 'rahul@upi',
      totalPaid: 3600,
      totalShare: 5850,
      netBalance: -2250,
    },
    {
      id: 'member_priya',
      name: 'Priya Patel',
      upiId: 'priya@okhdfcbank',
      totalPaid: 1800,
      totalShare: 3850,
      netBalance: -2050,
    },
    {
      id: 'member_amit',
      name: 'Amit Verma',
      upiId: 'amit@paytm',
      totalPaid: 6000,
      totalShare: 7850,
      netBalance: -1850,
    },
  ];

  const demoTrip: Trip = {
    id: tripId,
    title: 'Goa Beach Getaway 🌴',
    description: 'Annual group road trip to North Goa with beaches, water sports, and seaside dining.',
    coverPhotoUrl: 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&auto=format&fit=crop&q=80',
    baseCurrency: 'INR',
    createdBy: userId,
    createdAt: Date.now() - 5 * 86400000,
    updatedAt: Date.now(),
    startDate: '2026-03-10',
    endDate: '2026-03-15',
    members,
    memberIds: members.map((m) => m.id),
    totalSpend: 23400,
  };

  await saveLocalTrip(demoTrip);

  const demoExpenses: Expense[] = [
    {
      id: 'exp_resort_1',
      tripId,
      title: 'Beach Resort Stay (3 Nights)',
      amount: 12000,
      originalCurrency: 'INR',
      convertedAmount: 12000,
      exchangeRate: 1,
      paidByMemberId: userId,
      selectedParticipantIds: [userId, 'member_rahul', 'member_priya', 'member_amit'],
      splitMode: 'EQUALLY',
      shares: {
        [userId]: 3000,
        member_rahul: 3000,
        member_priya: 3000,
        member_amit: 3000,
      },
      categoryId: 'hotel',
      expenseDate: '2026-03-10',
      description: 'Deluxe sea-facing villas booking confirmation',
      createdAt: Date.now() - 4 * 86400000,
      updatedAt: Date.now() - 4 * 86400000,
    },
    {
      id: 'exp_dinner_2',
      tripId,
      title: "Fisherman's Wharf Seafood",
      amount: 3600,
      originalCurrency: 'INR',
      convertedAmount: 3600,
      exchangeRate: 1,
      paidByMemberId: 'member_rahul',
      selectedParticipantIds: [userId, 'member_rahul', 'member_priya', 'member_amit'],
      splitMode: 'EQUALLY',
      shares: {
        [userId]: 900,
        member_rahul: 900,
        member_priya: 900,
        member_amit: 900,
      },
      categoryId: 'restaurant',
      expenseDate: '2026-03-11',
      description: 'Fresh grilled pomfret, prawns, and drinks',
      createdAt: Date.now() - 3 * 86400000,
      updatedAt: Date.now() - 3 * 86400000,
    },
    {
      id: 'exp_taxi_3',
      tripId,
      title: 'Prepaid Airport Cab',
      amount: 1800,
      originalCurrency: 'INR',
      convertedAmount: 1800,
      exchangeRate: 1,
      paidByMemberId: 'member_priya',
      selectedParticipantIds: [userId, 'member_rahul', 'member_priya', 'member_amit'],
      splitMode: 'EQUALLY',
      shares: {
        [userId]: 450,
        member_rahul: 450,
        member_priya: 450,
        member_amit: 450,
      },
      categoryId: 'transport',
      expenseDate: '2026-03-10',
      description: 'Airport to Candolim transfer',
      createdAt: Date.now() - 4 * 86400000,
      updatedAt: Date.now() - 4 * 86400000,
    },
    {
      id: 'exp_sports_4',
      tripId,
      title: 'Scuba Diving & Jet Ski Package',
      amount: 6000,
      originalCurrency: 'INR',
      convertedAmount: 6000,
      exchangeRate: 1,
      paidByMemberId: 'member_amit',
      selectedParticipantIds: [userId, 'member_rahul', 'member_amit'], // Priya opted out
      splitMode: 'EQUALLY',
      shares: {
        [userId]: 2000,
        member_rahul: 2000,
        member_amit: 2000,
      },
      categoryId: 'entertainment',
      expenseDate: '2026-03-12',
      description: 'Baga beach water sports combo',
      createdAt: Date.now() - 2 * 86400000,
      updatedAt: Date.now() - 2 * 86400000,
    },
  ];

  for (const exp of demoExpenses) {
    await saveLocalExpense(exp);
  }

  // Seed sample activity
  await saveLocalActivity({
    id: 'act_demo_1',
    tripId,
    tripTitle: demoTrip.title,
    userId: userId,
    userName: userName,
    action: 'TRIP_CREATED',
    details: `Created trip "${demoTrip.title}"`,
    timestamp: demoTrip.createdAt,
  });

  return demoTrip;
}

// --- Invitations Management ---
export async function getLocalInvitations(): Promise<GroupInvitation[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.INVITATIONS);
  return json ? JSON.parse(json) : [];
}

export async function saveLocalInvitation(invitation: GroupInvitation): Promise<void> {
  const list = await getLocalInvitations();
  const idx = list.findIndex((i) => i.id === invitation.id || i.code === invitation.code);
  if (idx >= 0) {
    list[idx] = invitation;
  } else {
    list.unshift(invitation);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.INVITATIONS, JSON.stringify(list));
}

// --- Join Requests Management ---
const joinRequestListeners = new Map<string, Set<Listener<JoinRequest[]>>>();

export async function getLocalJoinRequests(tripId?: string): Promise<JoinRequest[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.JOIN_REQUESTS);
  const list: JoinRequest[] = json ? JSON.parse(json) : [];
  if (tripId) {
    return list.filter((r) => r.tripId === tripId);
  }
  return list;
}

export async function saveLocalJoinRequest(request: JoinRequest): Promise<void> {
  const list = await getLocalJoinRequests();
  const idx = list.findIndex((r) => r.id === request.id);
  if (idx >= 0) {
    list[idx] = request;
  } else {
    list.unshift(request);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.JOIN_REQUESTS, JSON.stringify(list));
  const listeners = joinRequestListeners.get(request.tripId);
  if (listeners) {
    const tripRequests = list.filter((r) => r.tripId === request.tripId);
    listeners.forEach((cb) => cb(tripRequests));
  }
}

export function subscribeLocalJoinRequests(
  tripId: string,
  callback: (requests: JoinRequest[]) => void
): () => void {
  if (!joinRequestListeners.has(tripId)) {
    joinRequestListeners.set(tripId, new Set());
  }
  const set = joinRequestListeners.get(tripId)!;
  set.add(callback);
  getLocalJoinRequests(tripId).then(callback);
  return () => {
    set.delete(callback);
  };
}

// --- Transaction Edit History Management ---
export async function getLocalEditHistory(expenseId?: string): Promise<TransactionEditRecord[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.EDIT_HISTORY);
  const list: TransactionEditRecord[] = json ? JSON.parse(json) : [];
  if (expenseId) {
    return list.filter((e) => e.expenseId === expenseId);
  }
  return list;
}

export async function saveLocalEditRecord(record: TransactionEditRecord): Promise<void> {
  const list = await getLocalEditHistory();
  list.unshift(record);
  await AsyncStorage.setItem(STORAGE_KEYS.EDIT_HISTORY, JSON.stringify(list));
}

// --- Member Merge History Management ---
export async function getLocalMergeHistory(tripId?: string): Promise<MemberMergeRecord[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.MERGE_HISTORY);
  const list: MemberMergeRecord[] = json ? JSON.parse(json) : [];
  if (tripId) {
    return list.filter((m) => m.tripId === tripId);
  }
  return list;
}

export async function saveLocalMergeRecord(record: MemberMergeRecord): Promise<void> {
  const list = await getLocalMergeHistory();
  list.unshift(record);
  await AsyncStorage.setItem(STORAGE_KEYS.MERGE_HISTORY, JSON.stringify(list));
}

// --- In-App Notifications Management ---
const notificationListeners = new Map<string, Set<Listener<AppNotification[]>>>();

export async function getLocalNotifications(userId: string): Promise<AppNotification[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  const list: AppNotification[] = json ? JSON.parse(json) : [];
  return list.filter((n) => n.userId === userId || n.userId === 'all');
}

export async function saveLocalNotification(notification: AppNotification): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
  const list: AppNotification[] = json ? JSON.parse(json) : [];
  const idx = list.findIndex((n) => n.id === notification.id);
  if (idx >= 0) {
    list[idx] = notification;
  } else {
    list.unshift(notification);
  }
  await AsyncStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(list));
  const set = notificationListeners.get(notification.userId);
  if (set) {
    const userNotes = list.filter((n) => n.userId === notification.userId || n.userId === 'all');
    set.forEach((cb) => cb(userNotes));
  }
}

export function subscribeLocalNotifications(
  userId: string,
  callback: (notifications: AppNotification[]) => void
): () => void {
  if (!notificationListeners.has(userId)) {
    notificationListeners.set(userId, new Set());
  }
  const set = notificationListeners.get(userId)!;
  set.add(callback);
  getLocalNotifications(userId).then(callback);
  return () => {
    set.delete(callback);
  };
}

