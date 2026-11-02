/**
 * TripSplit Smart Debt Simplification Algorithm
 * 
 * Implements the Minimum Cash Flow greedy algorithm:
 * Reduces complex N-way circular debts into the minimum possible direct transfers.
 * Example:
 *   A owes B ₹500, B owes C ₹300, C owes A ₹100
 *   -> Net balances: A: -₹400, B: +₹200, C: +₹200
 *   -> Simplified transfers:
 *      A pays B ₹200
 *      A pays C ₹200
 *   (Reduced 3 transactions to 2 transfers, zeroing everyone out)
 */

import { MemberBalance, SettlementSuggestion, PaymentRecord } from '../types/settlement';
import { round2 } from './expenseCalculator';

interface ParticipantNode {
  memberId: string;
  name: string;
  upiId?: string;
  amount: number; // always positive magnitude
}

/**
 * Generates an optimal, minimum-transaction settlement plan from member net balances.
 * 
 * @param balances List of member balances (calculated via calculateMemberBalances)
 * @param currency Trip base currency string (e.g. 'INR')
 * @returns Array of optimized direct SettlementSuggestion objects
 */
export function simplifyDebts(
  balances: MemberBalance[],
  currency: string = 'INR'
): SettlementSuggestion[] {
  const debtors: ParticipantNode[] = [];
  const creditors: ParticipantNode[] = [];

  // 1. Separate members into debtors (owes money) and creditors (gets money)
  balances.forEach((m) => {
    const net = round2(m.netBalance);
    if (net < -0.009) {
      debtors.push({
        memberId: m.memberId,
        name: m.name,
        upiId: m.upiId,
        amount: Math.abs(net),
      });
    } else if (net > 0.009) {
      creditors.push({
        memberId: m.memberId,
        name: m.name,
        upiId: m.upiId,
        amount: net,
      });
    }
  });

  const suggestions: SettlementSuggestion[] = [];

  // Sort descending by magnitude to prioritize settling largest debts first
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let debtorIdx = 0;
  let creditorIdx = 0;

  // 2. Greedy matching between largest debtor and largest creditor
  while (debtorIdx < debtors.length && creditorIdx < creditors.length) {
    const debtor = debtors[debtorIdx];
    const creditor = creditors[creditorIdx];

    const transferAmount = round2(Math.min(debtor.amount, creditor.amount));

    if (transferAmount > 0.009) {
      suggestions.push({
        id: `${debtor.memberId}_${creditor.memberId}`,
        fromMemberId: debtor.memberId,
        toMemberId: creditor.memberId,
        fromName: debtor.name,
        toName: creditor.name,
        toUpiId: creditor.upiId,
        amount: transferAmount,
        currency,
      });

      debtor.amount = round2(debtor.amount - transferAmount);
      creditor.amount = round2(creditor.amount - transferAmount);
    }

    if (debtor.amount <= 0.009) {
      debtorIdx++;
    }
    if (creditor.amount <= 0.009) {
      creditorIdx++;
    }
  }

  return suggestions;
}

/**
 * Calculates how many total transactions were reduced by the smart debt graph.
 * @param rawTransactionCount Estimated count before simplification
 * @param simplifiedCount Count of suggestions
 */
export function calculateReductionPercentage(
  rawTransactionCount: number,
  simplifiedCount: number
): { reductionPct: number; savedTransfers: number } {
  if (rawTransactionCount <= simplifiedCount || rawTransactionCount <= 0) {
    return { reductionPct: 0, savedTransfers: 0 };
  }
  const savedTransfers = rawTransactionCount - simplifiedCount;
  const reductionPct = Math.round((savedTransfers / rawTransactionCount) * 100);
  return { reductionPct, savedTransfers };
}
