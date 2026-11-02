export interface MemberMergeRecord {
  id: string;
  tripId: string;
  tripTitle: string;
  sourceMemberId: string; // The duplicate / offline member profile
  sourceMemberName: string;
  targetMemberId: string; // The surviving member profile
  targetMemberName: string;
  mergedByUserId: string;
  mergedByName: string;
  mergedAt: number;
  expensesReassignedCount: number;
  paymentsReassignedCount: number;
  notes?: string;
}
