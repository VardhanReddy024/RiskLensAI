import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithGoogle as firebaseSignInWithGoogle, 
  signOutFromFirebase, 
  FirebaseUser 
} from '../lib/firebase';

/**
 * Checks if the application is currently running inside Google AI Studio preview or cloud container
 */
export function isGoogleAIStudioEnvironment(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname.toLowerCase();
  
  // Specific to Google AI Studio Dev and Preview Cloud Run instances
  const isAIStudioSubdomain = hostname.startsWith('ais-dev-') || hostname.startsWith('ais-pre-');
  const isAIStudioDomain = hostname.includes('ai.studio') || hostname.includes('aistudio.google.com');
  const isGoogleUserContent = hostname.includes('googleusercontent.com') && window.parent !== window;
  
  return isAIStudioSubdomain || isAIStudioDomain || isGoogleUserContent;
}

/**
 * Generates a dynamic Google-style profile avatar SVG or URL from a display name
 */
export function generateGoogleAvatar(name: string): string {
  if (!name) return 'https://ui-avatars.com/api/?name=Senior+Analyst&background=2563eb&color=fff&bold=true&rounded=true';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=2563eb&color=fff&bold=true&rounded=true&size=128`;
}

/**
 * Derives a clean display name from an email address
 */
export function deriveDisplayNameFromEmail(email: string): string {
  if (!email) return 'Senior Fraud Analyst';
  const namePart = email.split('@')[0];
  return namePart
    .split(/[._-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Factory for creating standard Senior Fraud Analyst UserProfile
 */
export function createSeniorAnalystProfile(
  uid: string,
  email: string,
  displayName: string,
  avatarUrl?: string,
  connection: 'Connected via Google AI Studio' | 'Connected via Firebase Authentication' = 'Connected via Firebase Authentication'
): UserProfile {
  const finalName = displayName || deriveDisplayNameFromEmail(email) || 'Senior Fraud Analyst';
  const finalAvatar = avatarUrl || generateGoogleAvatar(finalName);
  
  return {
    uid: uid || `GOOGLE-UID-${Math.abs(email.split('').reduce((acc, char) => (acc << 5) - acc + char.charCodeAt(0), 0))}`,
    email,
    displayName: finalName,
    role: 'Senior Fraud Analyst',
    roleId: 'senior_fraud_analyst',
    avatarUrl: finalAvatar,
    department: 'Financial Crime & Enterprise Fraud Intelligence',
    connection,
    status: 'Online',
    permissions: {
      canApprove: true,
      canReject: true,
      canModifyRules: true,
      canExportReports: true,
      canTriggerSAR: true,
      canInvestigate: true,
      canLiveMonitor: true,
      canIngestData: true,
      canExecutePlaybooks: true,
    },
    lastLogin: new Date().toISOString(),
  };
}

/**
 * Resolves the Google account for the Google AI Studio runtime
 */
function resolveGoogleStudioUser(): UserProfile {
  let email = 'reddyvardhankumar.r@gmail.com';
  let displayName = 'Reddy Vardhan Kumar';
  let avatarUrl = '';

  if (typeof window !== 'undefined') {
    try {
      const storedUser = localStorage.getItem('risklens_auth_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.email) email = parsed.email;
        if (parsed.displayName) displayName = parsed.displayName;
        if (parsed.avatarUrl) avatarUrl = parsed.avatarUrl;
      }
    } catch {
      // ignore storage errors
    }
  }

  return createSeniorAnalystProfile(
    `STUDIO-UID-${email}`,
    email,
    displayName,
    avatarUrl,
    'Connected via Google AI Studio'
  );
}

interface AuthContextType {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isStudioEnvironment: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isStudio = isGoogleAIStudioEnvironment();
  
  const allowDevFallback = import.meta.env.VITE_ALLOW_DEV_AUTH_FALLBACK === 'true';

  // Initial state setup: In studio or explicit opt-in dev fallback, restore persisted session if available
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (isStudio) {
      return resolveGoogleStudioUser();
    }
    if (allowDevFallback && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('risklens_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) return parsed;
        }
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (isStudio) return true;
    if (allowDevFallback && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('risklens_auth_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) return true;
        }
      } catch {
        // ignore
      }
    }
    return false;
  });

  const [isLoading, setIsLoading] = useState<boolean>(!isStudio);

  // Sync with Firebase Authentication state for standalone/external deployments
  useEffect(() => {
    if (isStudio) {
      const studioUser = resolveGoogleStudioUser();
      setCurrentUser(studioUser);
      setIsAuthenticated(true);
      setIsLoading(false);
      try {
        localStorage.setItem('risklens_auth_user', JSON.stringify(studioUser));
      } catch {
        // ignore
      }
      return;
    }

    // Listen to Firebase Auth state on external deployments (Vercel, Cloud Run, localhost, Firebase Hosting)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser && firebaseUser.email) {
        const profile = createSeniorAnalystProfile(
          firebaseUser.uid,
          firebaseUser.email,
          firebaseUser.displayName || deriveDisplayNameFromEmail(firebaseUser.email),
          firebaseUser.photoURL || undefined,
          'Connected via Firebase Authentication'
        );
        setCurrentUser(profile);
        setIsAuthenticated(true);
        try {
          localStorage.setItem('risklens_auth_user', JSON.stringify(profile));
        } catch {
          // ignore
        }
      } else {
        // Only if opt-in dev fallback is enabled, check stored local session
        if (allowDevFallback && typeof window !== 'undefined') {
          const stored = localStorage.getItem('risklens_auth_user');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed && parsed.email) {
                setCurrentUser(parsed);
                setIsAuthenticated(true);
                setIsLoading(false);
                return;
              }
            } catch {
              // ignore
            }
          }
        }

        // Firebase has no active session
        setCurrentUser(null);
        setIsAuthenticated(false);
        try {
          localStorage.removeItem('risklens_auth_user');
        } catch {
          // ignore
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [isStudio, allowDevFallback]);

  /**
   * Google Sign-In Flow
   * In external environments, always forces the Google Account Chooser
   */
  const loginWithGoogle = async (): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      if (isStudio) {
        const studioUser = resolveGoogleStudioUser();
        setCurrentUser(studioUser);
        setIsAuthenticated(true);
        try {
          localStorage.setItem('risklens_auth_user', JSON.stringify(studioUser));
        } catch {
          // ignore
        }
        setIsLoading(false);
        return studioUser;
      }

      // External Firebase Auth Google Sign-In with fresh GoogleAuthProvider (prompt: 'select_account')
      try {
        const fbUser = await firebaseSignInWithGoogle();
        if (!fbUser || !fbUser.email) {
          throw new Error('Authentication was cancelled or failed. No account was selected.');
        }

        const profile = createSeniorAnalystProfile(
          fbUser.uid,
          fbUser.email,
          fbUser.displayName || deriveDisplayNameFromEmail(fbUser.email),
          fbUser.photoURL || undefined,
          'Connected via Firebase Authentication'
        );

        setCurrentUser(profile);
        setIsAuthenticated(true);
        try {
          localStorage.setItem('risklens_auth_user', JSON.stringify(profile));
        } catch {
          // ignore
        }
        setIsLoading(false);
        return profile;
      } catch (fbErr: any) {
        const errorCode = fbErr?.code || '';
        // If user actively cancelled popup or browser blocked popup, rethrow so LoginPage displays helpful prompt
        const isUserAction = [
          'auth/popup-closed-by-user',
          'auth/popup-blocked',
          'auth/cancelled-popup-request',
          'auth/account-exists-with-different-credential',
        ].includes(errorCode);

        if (isUserAction) {
          throw fbErr;
        }

        // Only fall back to local analyst session if explicitly opt-in via VITE_ALLOW_DEV_AUTH_FALLBACK=true
        if (allowDevFallback) {
          const isLocalHost =
            typeof window !== 'undefined' &&
            (window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1' ||
              window.location.hostname === '[::1]');

          if (isLocalHost) {
            console.warn('[RiskLens AI] Opt-in local dev fallback active. Authenticating local Senior Fraud Analyst session.');
            const localUser = resolveGoogleStudioUser();
            setCurrentUser(localUser);
            setIsAuthenticated(true);
            try {
              localStorage.setItem('risklens_auth_user', JSON.stringify(localUser));
            } catch {
              // ignore
            }
            setIsLoading(false);
            return localUser;
          }
        }

        // Rethrow real Firebase error so user and UI see the exact issue
        throw fbErr;
      }
    } catch (err: unknown) {
      setIsLoading(false);
      throw err;
    }
  };

  /**
   * Secure Logout Flow
   */
  const logout = async (): Promise<void> => {
    try {
      await signOutFromFirebase();
    } catch (err) {
      console.warn('Firebase signOut notice:', err);
    }
    try {
      localStorage.removeItem('risklens_auth_user');
      sessionStorage.removeItem('risklens_auth_user');
    } catch {
      // ignore
    }
    setCurrentUser(null);
    setIsAuthenticated(false);
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
    setCurrentUser(prev => {
      if (!prev) return null;
      const updated: UserProfile = {
        ...prev,
        ...updates,
        avatarUrl: updates.avatarUrl || (updates.displayName ? generateGoogleAvatar(updates.displayName) : prev.avatarUrl),
      };
      try {
        localStorage.setItem('risklens_auth_user', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ 
      currentUser, 
      isAuthenticated, 
      isStudioEnvironment: isStudio, 
      isLoading,
      loginWithGoogle, 
      logout, 
      updateUserProfile 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
