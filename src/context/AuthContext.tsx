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
  loginWithPhoneNumber,
  PhoneLoginResult,
  createMockFirebaseUser,
} from '../services/firebase/authService';
import {
  getLocalCurrentUser,
  saveLocalUserProfile,
} from '../services/storage/localDatabase';
import { updateMemberUpiInTrips } from '../services/firebase/tripService';
import { UserProfile, SetupWizardData } from '../types/user';

interface AuthContextType {
  firebaseUser: User | null;
  user: UserProfile | null;
  loading: boolean;
  needsSetup: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signInWithPhone: (phoneNumber: string) => Promise<PhoneLoginResult>;
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

  const loadUserProfile = async (targetUser: User | null): Promise<UserProfile | null> => {
    if (!targetUser) {
      setUser(null);
      return null;
    }

    try {
      let profile = await fetchUserProfile(targetUser.uid);
      if (!profile) {
        // Fallback profile if document doesn't exist yet
        profile = {
          id: targetUser.uid,
          email: targetUser.email || '',
          fullName: targetUser.displayName || 'Member',
          country: 'India',
          defaultCurrency: 'INR',
          preferredLanguage: 'English',
          isProfileComplete: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await saveLocalUserProfile(profile);
      }
      setUser(profile);
      return profile;
    } catch (err) {
      console.warn('loadUserProfile error:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    const active = firebaseUser || (await getLocalCurrentUser());
    if (active) {
      await loadUserProfile(active);
    } else {
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Immediately restore cached user session from local storage without waiting
    (async () => {
      try {
        const cachedLocalUser = await getLocalCurrentUser();
        if (mounted && cachedLocalUser) {
          setFirebaseUser(cachedLocalUser);
          await loadUserProfile(cachedLocalUser);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Failed to restore initial local session:', err);
      }
    })();

    // 2. Subscribe to auth state updates (Firebase + Local)
    const unsubscribe = subscribeAuthState(async (currentUser) => {
      if (!mounted) return;
      if (currentUser) {
        setFirebaseUser(currentUser);
        await loadUserProfile(currentUser);
      } else {
        const local = await getLocalCurrentUser();
        if (local) {
          setFirebaseUser(local);
          await loadUserProfile(local);
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const u = await signInWithEmail(email, pass);
      setFirebaseUser(u);
      const profile = await loadUserProfile(u);
      if (profile) {
        setUser(profile);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (email: string, pass: string, fullName: string) => {
    setLoading(true);
    try {
      const profile = await signUpWithEmail(email, pass, fullName);
      const mockUser = createMockFirebaseUser(profile.id, profile.email, profile.fullName);
      setFirebaseUser(mockUser);
      setUser(profile);
    } finally {
      setLoading(false);
    }
  };

  const handleSignInWithPhone = async (phoneNumber: string): Promise<PhoneLoginResult> => {
    setLoading(true);
    try {
      const result = await loginWithPhoneNumber(phoneNumber);
      if (result.success && result.profile) {
        const mockUser = createMockFirebaseUser(
          result.profile.id,
          result.profile.email,
          result.profile.fullName
        );
        setFirebaseUser(mockUser);
        setUser(result.profile);
      }
      return result;
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
        signInWithPhone: handleSignInWithPhone,
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
