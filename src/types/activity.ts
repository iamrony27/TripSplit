export type ActivityAction =
  | 'TRIP_CREATED'
  | 'MEMBER_ADDED'
  | 'MEMBER_REMOVED'
  | 'EXPENSE_ADDED'
  | 'EXPENSE_UPDATED'
  | 'EXPENSE_DELETED'
  | 'PAYMENT_RECORDED'
  | 'PAYMENT_DECLARED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'SETTLEMENT_UPDATED'
  | 'PROFILE_UPDATED';

export interface ActivityEvent {
  id: string;
  tripId: string;
  tripTitle?: string;
  userId: string;
  userName: string;
  action: ActivityAction;
  details: string;
  amount?: number;
  currency?: string;
  timestamp: number;
}
