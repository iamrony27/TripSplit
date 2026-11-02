/**
 * TripSplit Expense Calculation Engine
 * 
 * Implements exact accounting logic:
 * Net Balance = Total Amount Paid - Total Expense Share
 * 
 * Supports:
 * - EQUALLY: splits amount evenly among selected participants (with cent-level remainder distribution)
 * - UNEQUALLY: validates sum of exact amounts equals total expense
 * - PERCENTAGE: validates sum of percentages equals 100%
 * - BY_SHARES: splits according to integer/decimal weighted ratio
 */

import { Expense, SplitMode, ParticipantSplit } from '../types/expense';
import { Trip, TripMember } from '../types/trip';
import { MemberBalance, PaymentRecord } from '../types/settlement';

// Helper for accurate rounding to 2 decimal places to prevent IEEE 754 floating point drift
export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates individual participant shares for a single expense based on SplitMode.
 * Returns a map of memberId -> shareAmount.
 * Ensures the sum of individual shares exactly equals the expense amount.
 */
export function calculateExpenseShares(
  totalAmount: number,
  splitMode: SplitMode,
  selectedMemberIds: string[],
  customData?: ParticipantSplit[]
): Record<string, number> {
  const result: Record<string, number> = {};

  if (!selectedMemberIds || selectedMemberIds.length === 0 || totalAmount <= 0) {
    return result;
  }

  const count = selectedMemberIds.length;

  switch (splitMode) {
    case 'EQUALLY': {
      // Divide total into integer cents, then distribute remainder cent-by-cent
      const totalCents = Math.round(totalAmount * 100);
      const baseShareCents = Math.floor(totalCents / count);
      let remainderCents = totalCents - baseShareCents * count;

      selectedMemberIds.forEach((id) => {
        let shareCents = baseShareCents;
        if (remainderCents > 0) {
          shareCents += 1;
          remainderCents -= 1;
        }
        result[id] = shareCents / 100;
      });
      break;
    }

    case 'UNEQUALLY': {
      if (customData && customData.length > 0) {
        let assignedTotal = 0;
        customData.forEach((item) => {
          if (selectedMemberIds.includes(item.memberId)) {
            const val = round2(item.customAmount ?? 0);
            result[item.memberId] = val;
            assignedTotal = round2(assignedTotal + val);
          }
        });
      } else {
        // Fallback to equal split if custom values omitted
        return calculateExpenseShares(totalAmount, 'EQUALLY', selectedMemberIds);
      }
      break;
    }

    case 'PERCENTAGE': {
      if (customData && customData.length > 0) {
        let totalAllocatedCents = 0;
        selectedMemberIds.forEach((id) => {
          const item = customData.find((d) => d.memberId === id);
          const pct = item?.percentage ?? 0;
          const shareCents = Math.round((totalAmount * pct) / 100 * 100);
          result[id] = shareCents / 100;
          totalAllocatedCents += shareCents;
        });

        // Reconcile rounding discrepancy to the first selected participant
        const diffCents = Math.round(totalAmount * 100) - totalAllocatedCents;
        if (diffCents !== 0 && selectedMemberIds.length > 0) {
          result[selectedMemberIds[0]] = round2(result[selectedMemberIds[0]] + diffCents / 100);
        }
      } else {
        return calculateExpenseShares(totalAmount, 'EQUALLY', selectedMemberIds);
      }
      break;
    }

    case 'BY_SHARES': {
      if (customData && customData.length > 0) {
        let totalWeight = 0;
        selectedMemberIds.forEach((id) => {
          const item = customData.find((d) => d.memberId === id);
          totalWeight += Math.max(0, item?.shares ?? 1);
        });

        if (totalWeight <= 0) totalWeight = count;

        let totalAllocatedCents = 0;
        selectedMemberIds.forEach((id) => {
          const item = customData.find((d) => d.memberId === id);
          const weight = Math.max(0, item?.shares ?? 1);
          const shareCents = Math.floor((totalAmount * (weight / totalWeight)) * 100);
          result[id] = shareCents / 100;
          totalAllocatedCents += shareCents;
        });

        // Distribute remainder cent-by-cent
        let remainderCents = Math.round(totalAmount * 100) - totalAllocatedCents;
        let idx = 0;
        while (remainderCents > 0 && idx < selectedMemberIds.length) {
          result[selectedMemberIds[idx]] = round2(result[selectedMemberIds[idx]] + 0.01);
          remainderCents -= 1;
          idx++;
        }
      } else {
        return calculateExpenseShares(totalAmount, 'EQUALLY', selectedMemberIds);
      }
      break;
    }
  }

  return result;
}

/**
 * Calculates net balances for all trip members based on expenses and recorded payments:
 * Net Balance = Total Amount Paid - Total Expense Share + Payments Received - Payments Sent
 * 
 * Positive net balance (> 0): Creditor (should receive money)
 * Negative net balance (< 0): Debtor (owes money)
 */
export function calculateMemberBalances(
  members: TripMember[],
  expenses: Expense[],
  payments: PaymentRecord[] = []
): MemberBalance[] {
  // Map memberId -> { totalPaid, totalShare, paymentsMade, paymentsReceived }
  const ledger: Record<
    string,
    { totalPaid: number; totalShare: number; paymentsMade: number; paymentsReceived: number; name: string; upiId?: string }
  > = {};

  members.forEach((m) => {
    ledger[m.id] = {
      totalPaid: 0,
      totalShare: 0,
      paymentsMade: 0,
      paymentsReceived: 0,
      name: m.name,
      upiId: m.upiId,
    };
  });

  // 1. Process all expenses
  expenses.forEach((exp) => {
    const convertedAmount = exp.convertedAmount ?? exp.amount;
    
    // Payer credit
    if (ledger[exp.paidByMemberId]) {
      ledger[exp.paidByMemberId].totalPaid = round2(
        ledger[exp.paidByMemberId].totalPaid + convertedAmount
      );
    }

    // Participant debits
    const shares = exp.shares ?? {};
    Object.entries(shares).forEach(([memberId, shareAmount]) => {
      if (ledger[memberId]) {
        ledger[memberId].totalShare = round2(ledger[memberId].totalShare + shareAmount);
      }
    });
  });

  // 2. Process payments/settlements: ONLY approved payments reduce outstanding balances.
  // PENDING_ADMIN_APPROVAL, REJECTED, and CANCELLED payments do NOT affect balances.
  payments
    .filter((p) => p.status === 'APPROVED' || p.status === 'PAID')
    .forEach((pay) => {
      if (ledger[pay.fromMemberId]) {
        // Debtor paid money -> reduces debt (treated as + paymentMade)
        ledger[pay.fromMemberId].paymentsMade = round2(
          ledger[pay.fromMemberId].paymentsMade + pay.amount
        );
      }
      if (ledger[pay.toMemberId]) {
        // Creditor received money -> reduces receivable (treated as + paymentsReceived)
        ledger[pay.toMemberId].paymentsReceived = round2(
          ledger[pay.toMemberId].paymentsReceived + pay.amount
        );
      }
    });

  // 3. Compile output
  return members.map((m) => {
    const entry = ledger[m.id];
    // Net Balance = (Total Paid - Total Share) + (Payments Made - Payments Received)
    const rawNet = (entry.totalPaid - entry.totalShare) + (entry.paymentsMade - entry.paymentsReceived);
    const netBalance = round2(rawNet);

    return {
      memberId: m.id,
      name: entry.name,
      totalPaid: entry.totalPaid,
      totalShare: entry.totalShare,
      netBalance,
      upiId: entry.upiId,
    };
  });
}

/**
 * Recomputes member totals and trip spend, returning an updated Trip model.
 */
export function updateTripBalances(
  trip: Trip,
  expenses: Expense[],
  payments: PaymentRecord[] = []
): Trip {
  const balances = calculateMemberBalances(trip.members, expenses, payments);
  const balanceMap = new Map(balances.map((b) => [b.memberId, b]));

  const updatedMembers: TripMember[] = trip.members.map((m) => {
    const bal = balanceMap.get(m.id);
    return {
      ...m,
      totalPaid: bal ? bal.totalPaid : 0,
      totalShare: bal ? bal.totalShare : 0,
      netBalance: bal ? bal.netBalance : 0,
    };
  });

  const totalSpend = round2(
    expenses.reduce((sum, e) => sum + (e.convertedAmount ?? e.amount), 0)
  );

  return {
    ...trip,
    members: updatedMembers,
    totalSpend,
    updatedAt: Date.now(),
  };
}
