import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { Trip, TripMember, MemberRole } from '../types/trip';
import { Expense, SplitMode, ParticipantSplit } from '../types/expense';
import { PaymentRecord, PaymentStatus, MemberBalance, SettlementSuggestion } from '../types/settlement';
import { ActivityEvent } from '../types/activity';
import { JoinRequest } from '../types/joinRequest';
import { GroupInvitation } from '../types/invitation';
import { AppNotification } from '../types/notification';
import {
  createTripInFirestore,
  updateTripInFirestore,
  deleteTripInFirestore,
  subscribeUserTrips,
  addMemberToTrip,
  removeMemberFromTrip,
} from '../services/firebase/tripService';
import {
  createExpenseInFirestore,
  updateExpenseInFirestore,
  deleteExpenseInFirestore,
  subscribeTripExpenses,
} from '../services/firebase/expenseService';
import {
  recordPaymentInFirestore,
  declarePaymentInFirestore,
  approvePaymentInFirestore,
  rejectPaymentInFirestore,
  cancelPaymentDeclaration,
  updatePaymentStatusInFirestore,
  subscribeTripPayments,
} from '../services/firebase/settlementService';
import {
  logActivityInFirestore,
  subscribeTripActivities,
} from '../services/firebase/activityService';
import {
  getOrCreateTripInvitation,
} from '../services/firebase/invitationService';
import {
  subscribeTripJoinRequests,
  approveJoinRequest as approveJoinRequestInService,
  rejectJoinRequest as rejectJoinRequestInService,
} from '../services/firebase/joinRequestService';
import {
  adminEditExpense as adminEditExpenseInService,
} from '../services/firebase/expenseEditService';
import {
  executeMemberMerge,
  previewMemberMerge,
} from '../services/firebase/memberMergeService';
import {
  subscribeUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/firebase/notificationService';
import {
  calculateMemberBalances,
  calculateExpenseShares,
  round2,
} from '../engine/expenseCalculator';
import { simplifyDebts } from '../engine/debtSimplifier';
import { convertCurrency } from '../services/currency/exchangeRateService';

interface TripContextType {
  trips: Trip[];
  activeTrip: Trip | null;
  activeTripId: string | null;
  setActiveTripId: (id: string | null) => void;
  loading: boolean;
  expenses: Expense[];
  payments: PaymentRecord[];
  activities: ActivityEvent[];
  memberBalances: MemberBalance[];
  settlementSuggestions: SettlementSuggestion[];
  totalTripSpend: number;
  isTripAdmin: boolean;
  isGroupOwner: boolean;
  currentMember: TripMember | null;
  currentMemberRole: MemberRole;
  pendingApprovalsCount: number;

  // Join Requests
  joinRequests: JoinRequest[];
  pendingJoinRequestsCount: number;
  approveJoinRequest: (request: JoinRequest, role?: MemberRole) => Promise<void>;
  rejectJoinRequest: (request: JoinRequest, reason?: string) => Promise<void>;

  // Invitations
  getTripInvitation: (tripId?: string) => Promise<GroupInvitation>;

  // Notifications
  notifications: AppNotification[];
  unreadNotificationsCount: number;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;

  // Admin Expense Editing & Member Merging
  adminEditExpense: (params: {
    expenseId: string;
    updates: {
      title?: string;
      amount?: number;
      categoryId?: string;
      paidByMemberId?: string;
      selectedParticipantIds?: string[];
      expenseDate?: string;
      description?: string;
      splitMode?: SplitMode;
      splitsData?: ParticipantSplit[];
    };
    reason?: string;
  }) => Promise<Expense>;
  mergeMembers: (sourceMemberId: string, targetMemberId: string, notes?: string) => Promise<void>;
  previewMerge: (sourceMemberId: string, targetMemberId: string) => Promise<any>;

  // Existing operations
  createNewTrip: (
    title: string,
    description?: string,
    baseCurrency?: string,
    initialMembers?: TripMember[],
    coverPhotoUrl?: string,
    startDate?: string,
    endDate?: string
  ) => Promise<Trip>;
  updateTrip: (tripId: string, updates: Partial<Trip>) => Promise<void>;
  deleteTrip: (tripId: string) => Promise<void>;
  addMember: (tripId: string, member: TripMember) => Promise<void>;
  removeMember: (tripId: string, memberId: string) => Promise<void>;
  addExpense: (
    expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'shares' | 'convertedAmount' | 'exchangeRate'>
  ) => Promise<void>;
  updateExpense: (expenseId: string, updates: Partial<Expense>) => Promise<void>;
  deleteExpense: (expenseId: string) => Promise<void>;
  declarePayment: (
    declaration: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => Promise<void>;
  approvePayment: (paymentId: string) => Promise<void>;
  rejectPayment: (paymentId: string, reason?: string) => Promise<void>;
  cancelPayment: (paymentId: string) => Promise<void>;
  recordPayment: (
    payment: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>;
  updatePaymentStatus: (
    paymentId: string,
    status: PaymentStatus,
    upiTxnId?: string
  ) => Promise<void>;
}

const TripContext = createContext<TripContextType | undefined>(undefined);

export const TripProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTripId, setActiveTripId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Subscribe to User's Trips
  useEffect(() => {
    if (!user) {
      setTrips([]);
      setActiveTripId(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeUserTrips(user.id, (loadedTrips) => {
      setTrips(loadedTrips);
      // Automatically select active trip if none selected or current is deleted
      setActiveTripId((currentId) => {
        if (currentId && loadedTrips.some((t) => t.id === currentId)) {
          return currentId;
        }
        return loadedTrips.length > 0 ? loadedTrips[0].id : null;
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Active Trip Object
  const activeTrip = useMemo(() => {
    return trips.find((t) => t.id === activeTripId) || null;
  }, [trips, activeTripId]);

  // 2. Subscribe to Expenses, Payments, Activities, and Join Requests for Active Trip
  useEffect(() => {
    if (!activeTripId) {
      setExpenses([]);
      setPayments([]);
      setActivities([]);
      setJoinRequests([]);
      return;
    }

    const unsubExpenses = subscribeTripExpenses(activeTripId, (exps) => {
      setExpenses(exps);
    });

    const unsubPayments = subscribeTripPayments(activeTripId, (pays) => {
      setPayments(pays);
    });

    const unsubActivities = subscribeTripActivities(activeTripId, (acts) => {
      setActivities(acts);
    });

    const unsubJoinRequests = subscribeTripJoinRequests(activeTripId, (reqs) => {
      setJoinRequests(reqs);
    });

    return () => {
      unsubExpenses();
      unsubPayments();
      unsubActivities();
      unsubJoinRequests();
    };
  }, [activeTripId]);

  // 3. Subscribe to In-App Notifications for Current User
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const unsubscribe = subscribeUserNotifications(user.id, (notes) => {
      setNotifications(notes);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // 4. Dynamic Accounting & Debt Simplification Engine
  const memberBalances = useMemo(() => {
    if (!activeTrip) return [];
    return calculateMemberBalances(activeTrip.members, expenses, payments);
  }, [activeTrip, expenses, payments]);

  const settlementSuggestions = useMemo(() => {
    if (!activeTrip || memberBalances.length === 0) return [];
    return simplifyDebts(memberBalances, activeTrip.baseCurrency || 'INR');
  }, [activeTrip, memberBalances]);

  const totalTripSpend = useMemo(() => {
    return expenses.reduce((acc, curr) => acc + (curr.convertedAmount || curr.amount), 0);
  }, [expenses]);

  const currentMember = useMemo(() => {
    if (!activeTrip || !user) return null;
    return (
      activeTrip.members.find(
        (m) =>
          m.userId === user.id ||
          m.id === user.id ||
          m.id === `member_${user.id}` ||
          (user.fullName && m.name.toLowerCase() === user.fullName.toLowerCase())
      ) || null
    );
  }, [activeTrip, user]);

  const isGroupOwner = useMemo(() => {
    if (!activeTrip || !user) return false;
    return Boolean(
      activeTrip.createdBy === user.id ||
      activeTrip.createdBy === `member_${user.id}` ||
      (currentMember && activeTrip.createdBy === currentMember.id)
    );
  }, [activeTrip, user, currentMember]);

  const isTripAdmin = useMemo(() => {
    if (!activeTrip || !user) return false;
    if (isGroupOwner) return true;
    return Boolean(
      currentMember && (currentMember.role === 'ADMIN' || currentMember.role === 'CREATOR')
    );
  }, [activeTrip, user, isGroupOwner, currentMember]);

  const currentMemberRole = useMemo<MemberRole>(() => {
    if (isGroupOwner) return 'CREATOR';
    return currentMember?.role || 'MEMBER';
  }, [isGroupOwner, currentMember]);

  const pendingApprovalsCount = useMemo(() => {
    return payments.filter(
      (p) => p.status === 'PENDING_ADMIN_APPROVAL' || p.status === 'PENDING'
    ).length;
  }, [payments]);

  const pendingJoinRequestsCount = useMemo(() => {
    return joinRequests.filter((r) => r.status === 'PENDING').length;
  }, [joinRequests]);

  const unreadNotificationsCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  // 5. Invitations
  const getTripInvitation = async (tripId?: string): Promise<GroupInvitation> => {
    const targetTrip = tripId ? trips.find((t) => t.id === tripId) : activeTrip;
    if (!targetTrip || !user) throw new Error('No active trip or user found.');
    return getOrCreateTripInvitation(
      targetTrip.id,
      targetTrip.title,
      user.id,
      user.fullName || 'Admin'
    );
  };

  // 6. Join Requests Operations
  const approveJoinRequest = async (request: JoinRequest, role: MemberRole = 'MEMBER') => {
    if (!user) throw new Error('User not authenticated');
    await approveJoinRequestInService({
      request,
      adminUserId: user.id,
      adminName: user.fullName || 'Admin',
      role,
    });
  };

  const rejectJoinRequest = async (request: JoinRequest, reason?: string) => {
    if (!user) throw new Error('User not authenticated');
    await rejectJoinRequestInService({
      request,
      adminUserId: user.id,
      adminName: user.fullName || 'Admin',
      reason,
    });
  };

  // 7. Admin Expense Editing
  const adminEditExpense = async (params: {
    expenseId: string;
    updates: {
      title?: string;
      amount?: number;
      categoryId?: string;
      paidByMemberId?: string;
      selectedParticipantIds?: string[];
      expenseDate?: string;
      description?: string;
      splitMode?: SplitMode;
      splitsData?: ParticipantSplit[];
    };
    reason?: string;
  }): Promise<Expense> => {
    if (!activeTrip || !user) throw new Error('No active trip or user');
    if (!isTripAdmin) throw new Error('Only a group administrator can edit transactions.');

    return adminEditExpenseInService({
      expenseId: params.expenseId,
      tripId: activeTrip.id,
      adminUserId: user.id,
      adminName: user.fullName || 'Admin',
      reason: params.reason,
      updates: params.updates,
    });
  };

  // 8. Member Profile Merging
  const mergeMembers = async (sourceMemberId: string, targetMemberId: string, notes?: string) => {
    if (!activeTrip || !user) throw new Error('No active trip or user');
    if (!isTripAdmin) throw new Error('Only a group administrator can merge member profiles.');

    await executeMemberMerge({
      tripId: activeTrip.id,
      sourceMemberId,
      targetMemberId,
      adminUserId: user.id,
      adminName: user.fullName || 'Admin',
      notes,
    });
  };

  const previewMerge = async (sourceMemberId: string, targetMemberId: string) => {
    if (!activeTrip) throw new Error('No active trip');
    return previewMemberMerge({
      tripId: activeTrip.id,
      sourceMemberId,
      targetMemberId,
    });
  };

  // 9. Notifications Operations
  const markNotificationRead = async (notificationId: string) => {
    await markNotificationAsRead(notificationId, user?.id);
  };

  const markAllNotificationsRead = async () => {
    if (user?.id) {
      await markAllNotificationsAsRead(user.id);
    }
  };

  // 10. Standard Trip Operations
  const createNewTrip = async (
    title: string,
    description: string = '',
    baseCurrency: string = 'INR',
    initialMembers: TripMember[] = [],
    coverPhotoUrl?: string,
    startDate?: string,
    endDate?: string
  ): Promise<Trip> => {
    if (!user) throw new Error('User not logged in');

    const tripId = `trip_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const creatorMember: TripMember = {
      id: `member_${user.id}`,
      userId: user.id,
      name: user.fullName || 'Organizer',
      role: 'CREATOR',
      upiId: user.upiId,
      totalPaid: 0,
      totalShare: 0,
      netBalance: 0,
      joinedAt: Date.now(),
    };

    const allMembers = [creatorMember, ...(initialMembers || [])];
    const memberIds = Array.from(new Set(allMembers.map((m) => m.userId || m.id)));

    const newTrip: Trip = {
      id: tripId,
      title: title.trim(),
      description: description.trim(),
      baseCurrency,
      createdBy: user.id,
      members: allMembers,
      memberIds,
      totalSpend: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      coverPhotoUrl,
      startDate,
      endDate,
    };

    await createTripInFirestore(newTrip);

    // Seed initial invitation code for the group
    await getOrCreateTripInvitation(tripId, newTrip.title, user.id, user.fullName || 'Organizer');

    await logActivityInFirestore({
      id: `act_${Date.now()}`,
      tripId: newTrip.id,
      tripTitle: newTrip.title,
      userId: user.id,
      userName: user.fullName || 'Organizer',
      action: 'TRIP_CREATED',
      details: `Created new group "${newTrip.title}"`,
      timestamp: Date.now(),
    });

    setActiveTripId(newTrip.id);
    return newTrip;
  };

  const updateTrip = async (tripId: string, updates: Partial<Trip>) => {
    await updateTripInFirestore(tripId, updates);
  };

  const deleteTrip = async (tripId: string) => {
    await deleteTripInFirestore(tripId);
    if (activeTripId === tripId) {
      const remaining = trips.filter((t) => t.id !== tripId);
      setActiveTripId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  const addMember = async (tripId: string, member: TripMember) => {
    const targetTrip = trips.find((t) => t.id === tripId);
    if (!targetTrip) throw new Error('Trip not found');

    await addMemberToTrip(targetTrip, member);

    if (user) {
      await logActivityInFirestore({
        id: `act_${Date.now()}`,
        tripId,
        tripTitle: targetTrip.title,
        userId: user.id,
        userName: user.fullName,
        action: 'MEMBER_ADDED',
        details: `Added ${member.name} to "${targetTrip.title}"`,
        timestamp: Date.now(),
      });
    }
  };

  const removeMember = async (tripId: string, memberId: string) => {
    const targetTrip = trips.find((t) => t.id === tripId);
    if (!targetTrip) throw new Error('Trip not found');

    const memberName = targetTrip.members.find((m) => m.id === memberId)?.name || 'Member';
    await removeMemberFromTrip(targetTrip, memberId);

    if (user) {
      await logActivityInFirestore({
        id: `act_${Date.now()}`,
        tripId,
        tripTitle: targetTrip.title,
        userId: user.id,
        userName: user.fullName,
        action: 'MEMBER_REMOVED',
        details: `Removed ${memberName} from "${targetTrip.title}"`,
        timestamp: Date.now(),
      });
    }
  };

  const addExpense = async (
    expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'shares' | 'convertedAmount' | 'exchangeRate'>
  ) => {
    if (!activeTrip || !user) throw new Error('No active trip or user');

    const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const { convertedAmount, exchangeRate } = convertCurrency(
      expenseData.amount,
      expenseData.originalCurrency,
      activeTrip.baseCurrency || 'INR'
    );

    const shares = calculateExpenseShares(
      expenseData.amount,
      expenseData.splitMode,
      expenseData.selectedParticipantIds,
      expenseData.splitsData
    );

    const newExpense: Expense = {
      ...expenseData,
      id: expenseId,
      convertedAmount,
      exchangeRate,
      shares,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await createExpenseInFirestore(newExpense);

    const payer = activeTrip.members.find((m) => m.id === expenseData.paidByMemberId)?.name || 'Someone';
    await logActivityInFirestore({
      id: `act_${Date.now()}`,
      tripId: activeTrip.id,
      tripTitle: activeTrip.title,
      userId: user.id,
      userName: user.fullName,
      action: 'EXPENSE_ADDED',
      details: `${payer} added "${expenseData.title}"`,
      amount: expenseData.amount,
      currency: expenseData.originalCurrency,
      timestamp: Date.now(),
    });
  };

  const updateExpense = async (expenseId: string, updates: Partial<Expense>) => {
    await updateExpenseInFirestore(expenseId, { ...updates, tripId: activeTripId || undefined });
  };

  const deleteExpense = async (expenseId: string) => {
    const expense = expenses.find((e) => e.id === expenseId);
    await deleteExpenseInFirestore(expenseId, activeTripId || undefined);

    if (activeTrip && user && expense) {
      await logActivityInFirestore({
        id: `act_${Date.now()}`,
        tripId: activeTrip.id,
        tripTitle: activeTrip.title,
        userId: user.id,
        userName: user.fullName,
        action: 'EXPENSE_DELETED',
        details: `${user.fullName} deleted "${expense.title}"`,
        timestamp: Date.now(),
      });
    }
  };

  const declarePayment = async (
    declarationData: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ) => {
    if (!activeTrip || !user) throw new Error('No active trip or user');

    const paymentId = `pay_dec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const fromName =
      declarationData.payerName ||
      activeTrip.members.find((m) => m.id === declarationData.fromMemberId)?.name ||
      user.fullName ||
      'Member';
    const toName =
      declarationData.receiverName ||
      activeTrip.members.find((m) => m.id === declarationData.toMemberId)?.name ||
      'Member';

    const declaration: PaymentRecord = {
      ...declarationData,
      id: paymentId,
      paymentId,
      tripId: activeTrip.id,
      groupId: activeTrip.id,
      payerUid: user.id,
      payerName: fromName,
      receiverName: toName,
      status: 'PENDING_ADMIN_APPROVAL',
      paidDate: declarationData.paidDate || new Date().toISOString(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await declarePaymentInFirestore(declaration);

    await logActivityInFirestore({
      id: `act_${Date.now()}`,
      tripId: activeTrip.id,
      tripTitle: activeTrip.title,
      userId: user.id,
      userName: user.fullName,
      action: 'PAYMENT_DECLARED',
      details: `${fromName} declared a payment of ${declaration.currency} ${declaration.amount.toFixed(2)} to ${toName}${declaration.upiTxnId ? ` (Ref: ${declaration.upiTxnId})` : ''}`,
      amount: declaration.amount,
      currency: declaration.currency,
      timestamp: Date.now(),
    });
  };

  const approvePayment = async (paymentId: string) => {
    if (!activeTrip || !user) throw new Error('No active trip or user');

    const approved = await approvePaymentInFirestore({
      paymentId,
      tripId: activeTrip.id,
      adminUserId: user.id,
      adminName: user.fullName || 'Admin',
      isTripAdmin,
      currentMemberId: currentMember?.id,
    });

    await logActivityInFirestore({
      id: `act_${Date.now()}`,
      tripId: activeTrip.id,
      tripTitle: activeTrip.title,
      userId: user.id,
      userName: user.fullName,
      action: 'PAYMENT_APPROVED',
      details: `Admin ${user.fullName} approved payment of ${approved.currency} ${approved.amount.toFixed(2)} from ${approved.payerName || 'Member'} to ${approved.receiverName || 'Member'}`,
      amount: approved.amount,
      currency: approved.currency,
      timestamp: Date.now(),
    });
  };

  const rejectPayment = async (paymentId: string, reason?: string) => {
    if (!activeTrip || !user) throw new Error('No active trip or user');

    const rejected = await rejectPaymentInFirestore({
      paymentId,
      tripId: activeTrip.id,
      adminUserId: user.id,
      adminName: user.fullName || 'Admin',
      isTripAdmin,
      reason,
    });

    await logActivityInFirestore({
      id: `act_${Date.now()}`,
      tripId: activeTrip.id,
      tripTitle: activeTrip.title,
      userId: user.id,
      userName: user.fullName,
      action: 'PAYMENT_REJECTED',
      details: `Admin ${user.fullName} rejected payment declaration of ${rejected.currency} ${rejected.amount.toFixed(2)} from ${rejected.payerName || 'Member'}${reason ? ` (${reason})` : ''}`,
      amount: rejected.amount,
      currency: rejected.currency,
      timestamp: Date.now(),
    });
  };

  const cancelPayment = async (paymentId: string) => {
    if (!activeTrip || !user) throw new Error('No active trip or user');
    await cancelPaymentDeclaration(paymentId, activeTrip.id, user.id, currentMember?.id);
  };

  const recordPayment = async (
    paymentData: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!activeTrip || !user) throw new Error('No active trip or user');

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPayment: PaymentRecord = {
      ...paymentData,
      id: paymentId,
      paymentId,
      tripId: activeTrip.id,
      groupId: activeTrip.id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await recordPaymentInFirestore(newPayment);

    const from = activeTrip.members.find((m) => m.id === paymentData.fromMemberId)?.name || 'Someone';
    const to = activeTrip.members.find((m) => m.id === paymentData.toMemberId)?.name || 'Someone';

    await logActivityInFirestore({
      id: `act_${Date.now()}`,
      tripId: activeTrip.id,
      tripTitle: activeTrip.title,
      userId: user.id,
      userName: user.fullName,
      action: 'PAYMENT_RECORDED',
      details: `${from} recorded payment of ${paymentData.currency} ${paymentData.amount.toFixed(2)} to ${to}`,
      amount: paymentData.amount,
      currency: paymentData.currency,
      timestamp: Date.now(),
    });
  };

  const updatePaymentStatus = async (
    paymentId: string,
    status: PaymentStatus,
    upiTxnId?: string
  ) => {
    await updatePaymentStatusInFirestore(paymentId, status, upiTxnId);
  };

  return (
    <TripContext.Provider
      value={{
        trips,
        activeTrip,
        activeTripId,
        setActiveTripId,
        loading,
        expenses,
        payments,
        activities,
        memberBalances,
        settlementSuggestions,
        totalTripSpend,
        isTripAdmin,
        isGroupOwner,
        currentMember,
        currentMemberRole,
        pendingApprovalsCount,

        joinRequests,
        pendingJoinRequestsCount,
        approveJoinRequest,
        rejectJoinRequest,

        getTripInvitation,

        notifications,
        unreadNotificationsCount,
        markNotificationRead,
        markAllNotificationsRead,

        adminEditExpense,
        mergeMembers,
        previewMerge,

        createNewTrip,
        updateTrip,
        deleteTrip,
        addMember,
        removeMember,
        addExpense,
        updateExpense,
        deleteExpense,
        declarePayment,
        approvePayment,
        rejectPayment,
        cancelPayment,
        recordPayment,
        updatePaymentStatus,
      }}
    >
      {children}
    </TripContext.Provider>
  );
};

export const useTrips = () => {
  const context = useContext(TripContext);
  if (!context) {
    throw new Error('useTrips must be used within a TripProvider');
  }
  return context;
};
