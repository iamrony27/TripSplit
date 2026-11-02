export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID';

export interface SettlementSuggestion {
  id: string; // derived unique key: `${fromMemberId}_${toMemberId}`
  fromMemberId: string;
  toMemberId: string;
  fromName: string;
  toName: string;
  toUpiId?: string;
  amount: number; // outstanding amount to be settled
  currency: string;
}

export interface PaymentRecord {
  id: string;
  tripId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidDate?: string;      // ISO string
  upiTxnId?: string;      // Optional UPI reference / UTR
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MemberBalance {
  memberId: string;
  name: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number; // netBalance = totalPaid - totalShare
  upiId?: string;
}
