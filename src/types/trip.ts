export type MemberRole = 'CREATOR' | 'ADMIN' | 'MEMBER' | 'VIEWER';

export interface TripMember {
  id: string;
  userId?: string;
  name: string;
  role?: MemberRole;
  email?: string;
  photoUrl?: string;
  upiId?: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
  joinedAt?: number;
}

export interface Trip {
  id: string;
  title: string;
  description?: string;
  baseCurrency: string;
  createdBy: string;
  members: TripMember[];
  memberIds: string[];
  invitationCode?: string; // Active group invitation code
  totalSpend: number;
  createdAt: number;
  updatedAt: number;
  coverPhotoUrl?: string;
  startDate?: string;
  endDate?: string;
}
