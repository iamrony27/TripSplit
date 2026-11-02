import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { Trip, TripMember } from '../types/trip';
import { Expense } from '../types/expense';
import { PaymentRecord, PaymentStatus, MemberBalance, SettlementSuggestion } from '../types/settlement';
import { ActivityEvent } from '../types/activity';
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
  updatePaymentStatusInFirestore,
  subscribeTripPayments,
} from '../services/firebase/settlementService';
import {
  logActivityInFirestore,
  subscribeTripActivities,
} from '../services/firebase/activityService';
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

  // 2. Subscribe to Expenses, Payments, and Activities for Active Trip
  useEffect(() => {
    if (!activeTripId) {
      setExpenses([]);
      setPayments([]);
      setActivities([]);
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

    return () => {
      unsubExpenses();
      unsubPayments();
      unsubActivities();
    };
  }, [activeTripId]);

  // 3. Dynamic Accounting & Debt Simplification Engine
  const memberBalances = useMemo(() => {
    if (!activeTrip) return [];
    return calculateMemberBalances(activeTrip.members, expenses, payments);
  }, [activeTrip, expenses, payments]);

  const settlementSuggestions = useMemo(() => {
    if (!activeTrip || memberBalances.length === 0) return [];
    return simplifyDebts(memberBalances, activeTrip.baseCurrency || 'INR');
  }, [activeTrip, memberBalances]);

  const totalTripSpend = useMemo(() => {
    return round2(expenses.reduce((sum, e) => sum + (e.convertedAmount ?? e.amount), 0));
  }, [expenses]);

  // 4. Operations
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
      upiId: user.upiId,
      totalPaid: 0,
      totalShare: 0,
      netBalance: 0,
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
      startDate: startDate || new Date().toISOString().split('T')[0],
      endDate: endDate || '',
    };

    await createTripInFirestore(newTrip);

    // Log Activity
    await logActivityInFirestore({
      id: `act_${Date.now()}`,
      tripId,
      tripTitle: title,
      userId: user.id,
      userName: user.fullName,
      action: 'TRIP_CREATED',
      details: `${user.fullName} created trip "${title}"`,
      timestamp: Date.now(),
    });

    setActiveTripId(tripId);
    return newTrip;
  };

  const updateTrip = async (tripId: string, updates: Partial<Trip>) => {
    await updateTripInFirestore(tripId, updates);
  };

  const deleteTrip = async (tripId: string) => {
    await deleteTripInFirestore(tripId);
    if (activeTripId === tripId) {
      setActiveTripId(null);
    }
  };

  const addMember = async (tripId: string, member: TripMember) => {
    const target = trips.find((t) => t.id === tripId);
    if (!target) return;
    await addMemberToTrip(target, member);

    if (user) {
      await logActivityInFirestore({
        id: `act_${Date.now()}`,
        tripId,
        tripTitle: target.title,
        userId: user.id,
        userName: user.fullName,
        action: 'MEMBER_ADDED',
        details: `${member.name} joined the trip`,
        timestamp: Date.now(),
      });
    }
  };

  const removeMember = async (tripId: string, memberId: string) => {
    const target = trips.find((t) => t.id === tripId);
    if (!target) return;
    const removedName = target.members.find((m) => m.id === memberId)?.name || 'Member';
    await removeMemberFromTrip(target, memberId);

    if (user) {
      await logActivityInFirestore({
        id: `act_${Date.now()}`,
        tripId,
        tripTitle: target.title,
        userId: user.id,
        userName: user.fullName,
        action: 'MEMBER_REMOVED',
        details: `${removedName} was removed from the trip`,
        timestamp: Date.now(),
      });
    }
  };

  const addExpense = async (
    expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt' | 'shares' | 'convertedAmount' | 'exchangeRate'>
  ) => {
    if (!activeTrip || !user) throw new Error('No active trip or user');

    const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // Currency conversion
    const baseCurrency = activeTrip.baseCurrency || 'INR';
    const { convertedAmount, exchangeRate } = convertCurrency(
      expenseData.amount,
      expenseData.originalCurrency,
      baseCurrency
    );

    // Compute exact participant shares using Engine
    const shares = calculateExpenseShares(
      convertedAmount,
      expenseData.splitMode,
      expenseData.selectedParticipantIds,
      expenseData.splitsData
    );

    const expense: Expense = {
      ...expenseData,
      id: expenseId,
      convertedAmount,
      exchangeRate,
      shares,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await createExpenseInFirestore(expense);

    // Update trip spend
    await updateTripInFirestore(activeTrip.id, {
      totalSpend: round2(totalTripSpend + convertedAmount),
    });

    // Log Activity
    const payer = activeTrip.members.find((m) => m.id === expenseData.paidByMemberId)?.name || 'Someone';
    await logActivityInFirestore({
      id: `act_${Date.now()}`,
      tripId: activeTrip.id,
      tripTitle: activeTrip.title,
      userId: user.id,
      userName: user.fullName,
      action: 'EXPENSE_ADDED',
      details: `${payer} added "${expenseData.title}" (${baseCurrency} ${convertedAmount.toFixed(2)})`,
      amount: convertedAmount,
      currency: baseCurrency,
      timestamp: Date.now(),
    });
  };

  const updateExpense = async (expenseId: string, updates: Partial<Expense>) => {
    if (!activeTrip) return;

    if (updates.amount !== undefined || updates.splitMode || updates.selectedParticipantIds || updates.splitsData) {
      const existing = expenses.find((e) => e.id === expenseId);
      if (existing) {
        const merged = { ...existing, ...updates };
        const baseCurrency = activeTrip.baseCurrency || 'INR';
        const { convertedAmount } = convertCurrency(
          merged.amount,
          merged.originalCurrency,
          baseCurrency,
          merged.exchangeRate
        );
        const shares = calculateExpenseShares(
          convertedAmount,
          merged.splitMode,
          merged.selectedParticipantIds,
          merged.splitsData
        );
        updates.convertedAmount = convertedAmount;
        updates.shares = shares;
      }
    }

    await updateExpenseInFirestore(expenseId, updates);
  };

  const deleteExpense = async (expenseId: string) => {
    const existing = expenses.find((e) => e.id === expenseId);
    await deleteExpenseInFirestore(expenseId);

    if (activeTrip && existing && user) {
      await logActivityInFirestore({
        id: `act_${Date.now()}`,
        tripId: activeTrip.id,
        tripTitle: activeTrip.title,
        userId: user.id,
        userName: user.fullName,
        action: 'EXPENSE_DELETED',
        details: `Expense "${existing.title}" was deleted`,
        timestamp: Date.now(),
      });
    }
  };

  const recordPayment = async (
    paymentData: Omit<PaymentRecord, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!activeTrip || !user) throw new Error('No active trip or user');

    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payment: PaymentRecord = {
      ...paymentData,
      id: paymentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await recordPaymentInFirestore(payment);

    const fromName = activeTrip.members.find((m) => m.id === paymentData.fromMemberId)?.name || 'Member';
    const toName = activeTrip.members.find((m) => m.id === paymentData.toMemberId)?.name || 'Member';

    await logActivityInFirestore({
      id: `act_${Date.now()}`,
      tripId: activeTrip.id,
      tripTitle: activeTrip.title,
      userId: user.id,
      userName: user.fullName,
      action: 'PAYMENT_RECORDED',
      details: `${fromName} paid ${toName} ${paymentData.currency} ${paymentData.amount.toFixed(2)}`,
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
        createNewTrip,
        updateTrip,
        deleteTrip,
        addMember,
        removeMember,
        addExpense,
        updateExpense,
        deleteExpense,
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
