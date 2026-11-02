export type NotificationType =
  | 'JOIN_REQUEST_RECEIVED'
  | 'JOIN_REQUEST_APPROVED'
  | 'JOIN_REQUEST_REJECTED'
  | 'EXPENSE_ADDED'
  | 'EXPENSE_EDITED'
  | 'PAYMENT_DECLARED'
  | 'PAYMENT_APPROVED'
  | 'PAYMENT_REJECTED'
  | 'MEMBER_MERGED';

export interface AppNotification {
  id: string;
  userId: string; // Target recipient UID
  tripId: string;
  tripTitle?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: number;
}
