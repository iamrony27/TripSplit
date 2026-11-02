import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  sendPasswordReset,
  fetchUserProfile,
  saveSetupWizardData,
  updateUserUpiId,
  subscribeAuthState,
} from '../services/firebase/authService';
import { updateMemberUpiInTrips } from '../services/firebase/tripService';
import { UserProfile, SetupWizardData } from '../types/user';

interface AuthContextType {
  firebaseUser: User | null;
  user: UserProfile | null;
  loading: boolean;
  needsSetup: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  completeSetup: (data: SetupWizardData) => Promise<void>;
  updateUpi: (upiId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    if (!firebaseUser) {
      setUser(null);
      return;
    }
    const profile = await fetchUserProfile(firebaseUser.uid);
    if (profile) {
      setUser(profile);
    } else {
      // Create fallback profile if document doesn't exist yet
      const fallback: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        fullName: firebaseUser.displayName || 'Member',
        country: 'India',
        defaultCurrency: 'INR',
        preferredLanguage: 'English',
        isProfileComplete: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setUser(fallback);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeAuthState(async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        await refreshProfile();
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const u = await signInWithEmail(email, pass);
      const profile = await fetchUserProfile(u.uid);
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, pass: string, fullName: string) => {
    setLoading(true);
    try {
      const profile = await signUpWithEmail(email, pass, fullName);
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOutUser();
      setUser(null);
      setFirebaseUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (email: string) => {
    await sendPasswordReset(email);
  };

  const handleCompleteSetup = async (data: SetupWizardData) => {
    if (!user) return;
    await saveSetupWizardData(user.id, data);
    setUser((prev) => (prev ? { ...prev, ...data, isProfileComplete: true } : null));
  };

  const handleUpdateUpi = async (upiId: string) => {
    if (!user) return;
    await updateUserUpiId(user.id, upiId);
    await updateMemberUpiInTrips(user.id, upiId);
    setUser((prev) => (prev ? { ...prev, upiId } : null));
  };

  const needsSetup = !!user && !user.isProfileComplete;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        needsSetup,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        resetPassword: handleResetPassword,
        completeSetup: handleCompleteSetup,
        updateUpi: handleUpdateUpi,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
