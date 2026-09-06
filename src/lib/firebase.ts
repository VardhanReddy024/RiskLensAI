import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  browserLocalPersistence,
  inMemoryPersistence,
  setPersistence,
  User,
  Auth,
  Unsubscribe,
} from "firebase/auth";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";

/**
 * Firebase Configuration
 * All values are loaded from Vite environment variables (VITE_ prefix).
 * Never log or expose these values in browser console.
 * Never use fake credential fallbacks in production.
 */
const isProduction = import.meta.env.PROD || import.meta.env.MODE === 'production';
const rawApiKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
const rawProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';

export const isFirebaseConfigured: boolean = Boolean(
  rawApiKey &&
  rawApiKey.trim().length > 0 &&
  !rawApiKey.includes('FakeKey') &&
  !rawApiKey.includes('placeholder') &&
  !rawApiKey.includes('your_firebase_api_key') &&
  rawProjectId &&
  rawProjectId.trim().length > 0
);

if (isProduction && !isFirebaseConfigured) {
  console.error(
    '[RiskLens AI] Production deployment missing required Firebase credentials (VITE_FIREBASE_API_KEY or VITE_FIREBASE_PROJECT_ID). Firebase authentication will not be functional until environment variables are supplied.'
  );
} else if (!isProduction && !isFirebaseConfigured) {
  console.warn(
    '[RiskLens AI] VITE_FIREBASE_API_KEY is not configured in your environment (.env or .env.local). Real Firebase Google sign-in requires this key.'
  );
}

const firebaseConfig = {
  apiKey: rawApiKey,
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (rawProjectId ? `${rawProjectId}.firebaseapp.com` : 'risklens-ai-ae0ac.firebaseapp.com'),
  projectId: rawProjectId || 'risklens-ai-ae0ac',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    (rawProjectId ? `${rawProjectId}.firebasestorage.app` : 'risklens-ai-ae0ac.firebasestorage.app'),
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1069484804213',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || '1:1069484804213:web:71c8b7fa345c0cb945903c',
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-R8EKPXWHBE',
};

/**
 * Initialize Firebase (singleton — only once when configured)
 */
let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    authInstance = getAuth(app);
    if (typeof window !== "undefined") {
      setPersistence(authInstance, browserLocalPersistence).catch(() => {
        if (authInstance) {
          setPersistence(authInstance, inMemoryPersistence).catch(() => { });
        }
      });
    }
  } catch (initError: unknown) {
    console.error('[RiskLens AI] Firebase initialization error:', initError);
    app = null;
    authInstance = null;
  }
}

let analyticsInstance: Analytics | null = null;
if (isFirebaseConfigured && app && typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported && app) {
      analyticsInstance = getAnalytics(app);
    }
  }).catch(() => {});
}

export const auth = authInstance;
export const analytics = analyticsInstance;

/**
 * Google Provider
 */
export function getGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  provider.addScope("email");
  provider.addScope("profile");

  return provider;
}

/**
 * Google Sign In
 */
export async function signInWithGoogle(): Promise<User> {
  if (!isFirebaseConfigured || !authInstance) {
    throw {
      code: "auth/configuration-not-found",
      message: isProduction
        ? "Firebase Authentication is not configured. Missing required VITE_FIREBASE_API_KEY or VITE_FIREBASE_PROJECT_ID environment variable."
        : "Firebase Authentication is not configured. Please provide VITE_FIREBASE_API_KEY in your .env or .env.local file.",
    };
  }
  const provider = getGoogleProvider();

  try {
    const result = await signInWithPopup(authInstance, provider);
    return result.user;
  } catch (e: unknown) {
    // Log only safe diagnostic info — never log tokens, credentials, or API keys
    const firebaseError = e as { code?: string; message?: string };
    console.error("Firebase authentication error:", {
      code: firebaseError.code || "unknown",
      message: firebaseError.message || "Unknown error",
    });

    throw e;
  }
}

/**
 * Logout
 */
export async function signOutFromFirebase(): Promise<void> {
  if (authInstance) {
    try {
      await signOut(authInstance);
    } catch {
      // ignore
    }
  }
}

/**
 * Safe Auth State Listener
 * If Firebase is unconfigured or null, immediately triggers observer with null and returns a no-op unregister.
 */
export function onAuthStateChanged(
  authRef: Auth | null,
  nextOrObserver: any,
  error?: any,
  completed?: any
): Unsubscribe {
  if (!authRef) {
    if (typeof nextOrObserver === 'function') {
      nextOrObserver(null);
    } else if (nextOrObserver && typeof nextOrObserver.next === 'function') {
      nextOrObserver.next(null);
    }
    return () => {};
  }
  return firebaseOnAuthStateChanged(authRef, nextOrObserver, error, completed);
}

export type { User as FirebaseUser };

export default app;