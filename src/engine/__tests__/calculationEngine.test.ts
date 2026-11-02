import {
  calculateExpenseShares,
  calculateMemberBalances,
  round2,
} from '../expenseCalculator';
import { simplifyDebts } from '../debtSimplifier';
import { Expense } from '../../types/expense';
import { TripMember } from '../../types/trip';
import { PaymentRecord } from '../../types/settlement';

describe('TripSplit Calculation Engine Tests', () => {
  test('round2 correctly rounds to 2 decimal places without IEEE 754 float drift', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(100.004)).toBe(100);
    expect(round2(100.005)).toBe(100.01);
  });

  test('Equal split distributes cents accurately when not evenly divisible', () => {
    const total = 100;
    const members = ['m1', 'm2', 'm3'];
    const shares = calculateExpenseShares(total, 'EQUALLY', members);

    expect(shares['m1'] + shares['m2'] + shares['m3']).toBe(100);
    expect(shares['m1']).toBe(33.34);
    expect(shares['m2']).toBe(33.33);
    expect(shares['m3']).toBe(33.33);
  });

  test('Percentage split reconciles to exact total', () => {
    const total = 500;
    const members = ['m1', 'm2'];
    const custom = [
      { memberId: 'm1', selected: true, amount: 0, percentage: 60 },
      { memberId: 'm2', selected: true, amount: 0, percentage: 40 },
    ];
    const shares = calculateExpenseShares(total, 'PERCENTAGE', members, custom);
    expect(shares['m1']).toBe(300);
    expect(shares['m2']).toBe(200);
  });

  test('Net balance formula: Net Balance = Total Paid - Total Share', () => {
    const members: TripMember[] = [
      { id: 'sarah', name: 'Sarah', totalPaid: 0, totalShare: 0, netBalance: 0 },
      { id: 'rohan', name: 'Rohan', totalPaid: 0, totalShare: 0, netBalance: 0 },
      { id: 'ananya', name: 'Ananya', totalPaid: 0, totalShare: 0, netBalance: 0 },
    ];

    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: 'trip-1',
        title: 'Dinner',
        amount: 3000,
        originalCurrency: 'INR',
        convertedAmount: 3000,
        exchangeRate: 1,
        paidByMemberId: 'sarah', // Sarah paid ₹3000
        selectedParticipantIds: ['sarah', 'rohan', 'ananya'],
        splitMode: 'EQUALLY',
        shares: { sarah: 1000, rohan: 1000, ananya: 1000 },
        categoryId: 'food',
        expenseDate: '2026-10-15',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const balances = calculateMemberBalances(members, expenses);
    const sarahBal = balances.find((b) => b.memberId === 'sarah')!;
    const rohanBal = balances.find((b) => b.memberId === 'rohan')!;
    const ananyaBal = balances.find((b) => b.memberId === 'ananya')!;

    // Sarah paid 3000, share 1000 -> net +2000
    expect(sarahBal.netBalance).toBe(2000);
    // Rohan paid 0, share 1000 -> net -1000
    expect(rohanBal.netBalance).toBe(-1000);
    // Ananya paid 0, share 1000 -> net -1000
    expect(ananyaBal.netBalance).toBe(-1000);

    // Sum of net balances must equal 0
    expect(sarahBal.netBalance + rohanBal.netBalance + ananyaBal.netBalance).toBe(0);
  });

  test('Recorded payments reduce outstanding debts accurately', () => {
    const members: TripMember[] = [
      { id: 'sarah', name: 'Sarah', totalPaid: 0, totalShare: 0, netBalance: 0 },
      { id: 'rohan', name: 'Rohan', totalPaid: 0, totalShare: 0, netBalance: 0 },
    ];

    const expenses: Expense[] = [
      {
        id: 'e1',
        tripId: 'trip-1',
        title: 'Lunch',
        amount: 1000,
        originalCurrency: 'INR',
        convertedAmount: 1000,
        exchangeRate: 1,
        paidByMemberId: 'sarah',
        selectedParticipantIds: ['sarah', 'rohan'],
        splitMode: 'EQUALLY',
        shares: { sarah: 500, rohan: 500 },
        categoryId: 'food',
        expenseDate: '2026-10-15',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    // Rohan pays Sarah ₹500 via UPI
    const payments: PaymentRecord[] = [
      {
        id: 'p1',
        tripId: 'trip-1',
        fromMemberId: 'rohan',
        toMemberId: 'sarah',
        amount: 500,
        currency: 'INR',
        status: 'PAID',
        paidDate: '2026-10-15',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];

    const balances = calculateMemberBalances(members, expenses, payments);
    expect(balances.find((b) => b.memberId === 'sarah')!.netBalance).toBe(0);
    expect(balances.find((b) => b.memberId === 'rohan')!.netBalance).toBe(0);
  });
});

describe('Smart Debt Simplification Tests', () => {
  test('Simplifies circular debts (A owes B 500, B owes C 300, C owes A 100)', () => {
    // Net:
    // A: -500 + 100 = -400
    // B: +500 - 300 = +200
    // C: +300 - 100 = +200
    const balances = [
      { memberId: 'A', name: 'Alice', totalPaid: 100, totalShare: 500, netBalance: -400 },
      { memberId: 'B', name: 'Bob', totalPaid: 500, totalShare: 300, netBalance: 200 },
      { memberId: 'C', name: 'Charlie', totalPaid: 300, totalShare: 100, netBalance: 200 },
    ];

    const suggestions = simplifyDebts(balances, 'INR');

    // Expected: 2 transfers instead of 3 circular ones
    expect(suggestions.length).toBe(2);

    // Alice should pay Bob 200 and Charlie 200
    const aliceToBob = suggestions.find((s) => s.fromMemberId === 'A' && s.toMemberId === 'B');
    const aliceToCharlie = suggestions.find((s) => s.fromMemberId === 'A' && s.toMemberId === 'C');

    expect(aliceToBob).toBeDefined();
    expect(aliceToBob?.amount).toBe(200);

    expect(aliceToCharlie).toBeDefined();
    expect(aliceToCharlie?.amount).toBe(200);
  });

  test('Handles 0 net balance members gracefully without generating transfers', () => {
    const balances = [
      { memberId: 'A', name: 'Alice', totalPaid: 200, totalShare: 200, netBalance: 0 },
      { memberId: 'B', name: 'Bob', totalPaid: 500, totalShare: 300, netBalance: 200 },
      { memberId: 'C', name: 'Charlie', totalPaid: 100, totalShare: 300, netBalance: -200 },
    ];

    const suggestions = simplifyDebts(balances, 'INR');
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].fromMemberId).toBe('C');
    expect(suggestions[0].toMemberId).toBe('B');
    expect(suggestions[0].amount).toBe(200);
  });
});
