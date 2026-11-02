export type PaymentStatus =
  | 'PENDING_DECLARATION'
  | 'PENDING_ADMIN_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'PAID' // Backwards compatibility alias for APPROVED
  | 'PENDING'; // Backwards compatibility alias for PENDING_ADMIN_APPROVAL

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
  paymentId?: string; // alias to id
  tripId: string;
  groupId?: string; // alias to tripId
  settlementId?: string;
  fromMemberId: string;
  payerUid?: string;
  payerName?: string;
  toMemberId: string;
  receiverUid?: string;
  receiverName?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidDate?: string; // ISO string
  upiTxnId?: string; // UPI reference / UTR
  upiTransactionReference?: string; // alias to upiTxnId
  note?: string;
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: number;
  rejectedBy?: string;
  rejectedByName?: string;
  rejectedAt?: number;
  rejectionReason?: string;
  isSynced?: boolean; // For offline sync tracking
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
