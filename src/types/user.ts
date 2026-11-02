export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  photoUrl?: string;
  country: string;
  defaultCurrency: string;
  preferredLanguage: string;
  upiId?: string;
  isProfileComplete: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface SetupWizardData {
  fullName: string;
  photoUrl?: string;
  country: string;
  defaultCurrency: string;
  preferredLanguage: string;
  upiId?: string;
}
