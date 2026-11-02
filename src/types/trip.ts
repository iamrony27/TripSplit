export interface TripMember {
  id: string;
  userId?: string;
  name: string;
  photoUrl?: string;
  upiId?: string;
  totalPaid: number;
  totalShare: number;
  netBalance: number;
}

export interface Trip {
  id: string;
  title: string;
  description?: string;
  baseCurrency: string;
  createdBy: string;
  members: TripMember[];
  memberIds: string[];
  totalSpend: number;
  createdAt: number;
  updatedAt: number;
  coverPhotoUrl?: string;
  startDate?: string;
  endDate?: string;
}
