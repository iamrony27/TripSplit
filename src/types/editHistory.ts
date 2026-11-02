export interface TransactionEditRecord {
  id: string;
  expenseId: string;
  tripId: string;
  originalTitle: string;
  originalAmount: number;
  originalCurrency: string;
  originalPaidByMemberId: string;
  originalPaidByName?: string;
  originalSelectedParticipantIds: string[];
  originalExpenseDate: string;
  originalCategoryId: string;
  originalDescription?: string;

  updatedTitle: string;
  updatedAmount: number;
  updatedCurrency: string;
  updatedPaidByMemberId: string;
  updatedPaidByName?: string;
  updatedSelectedParticipantIds: string[];
  updatedExpenseDate: string;
  updatedCategoryId: string;
  updatedDescription?: string;

  editedByUserId: string;
  editedByName: string;
  editedAt: number;
  reason?: string;
}
