export type SplitMode = 'EQUALLY' | 'UNEQUALLY' | 'PERCENTAGE' | 'BY_SHARES';

export interface ParticipantSplit {
  memberId: string;
  selected: boolean;
  amount: number;       // Final calculated share in original currency
  customAmount?: number; // When splitMode === 'UNEQUALLY'
  percentage?: number;   // When splitMode === 'PERCENTAGE'
  shares?: number;       // When splitMode === 'BY_SHARES'
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;               // Total original amount
  originalCurrency: string;     // e.g. 'INR', 'USD', 'EUR'
  convertedAmount: number;      // Amount in trip baseCurrency
  exchangeRate: number;         // Conversion rate at time of creation (immutable)
  paidByMemberId: string;       // TripMember id who paid
  selectedParticipantIds: string[]; // Members included in split
  splitMode: SplitMode;
  shares: Record<string, number>; // memberId -> converted share amount
  splitsData?: ParticipantSplit[]; // Detailed split input data
  categoryId: string;
  expenseDate: string;          // ISO date string (YYYY-MM-DD), editable
  createdAt: number;
  updatedAt: number;
  description?: string;         // Optional note
  receiptUrl?: string;          // Optional receipt image link
}

export interface ExpenseCategory {
  id: string;
  name: string;
  icon: string; // Material symbol or MaterialCommunityIcon name
  color: string;
  isCustom?: boolean;
}
