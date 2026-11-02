export interface GroupInvitation {
  id: string; // Document ID: 'inv_' + code
  code: string; // 8-10 uppercase alphanumeric characters (e.g. 'TRIP8X4K')
  tripId: string;
  tripTitle: string;
  createdBy: string;
  createdByName: string;
  createdAt: number;
  expiresAt?: number;
  isRevoked: boolean;
  maxUses?: number;
  useCount: number;
}
