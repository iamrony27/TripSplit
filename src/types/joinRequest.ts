export type JoinRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface JoinRequest {
  id: string;
  tripId: string;
  tripTitle: string;
  invitationCode: string;
  applicantUserId?: string; // If applicant is an authenticated user
  applicantName: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantUpiId?: string;
  status: JoinRequestStatus;
  createdAt: number;
  updatedAt: number;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: number;
  rejectionReason?: string;
}
