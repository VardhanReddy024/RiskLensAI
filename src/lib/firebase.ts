import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  inMemoryPersistence,
  setPersistence,
  User,
} from "firebase/auth";

/**
 * Firebase Configuration
 * All values are loaded from Vite environment variables (VITE_ prefix).
 * Never log or expose these values in browser console.
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "risklens-ai-ae0ac.firebaseapp.com",
  projectId:
    import.meta.env.VITE_FIREBASE_PROJECT_ID ||
    "risklens-ai-ae0ac",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "risklens-ai-ae0ac.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    "1069484804213",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:1069484804213:web:71c8b7fa345c0cb945903c",
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
    "G-R8EKPXWHBE",
};

// Dev-only validation: warn if API key is missing (without exposing the value)
if (!firebaseConfig.apiKey && import.meta.env.DEV) {
  console.warn(
    "[RiskLens AI] VITE_FIREBASE_API_KEY is not configured. Firebase authentication will not work."
  );
}

/**
 * Initialize Firebase (singleton — only once)
 */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Firebase Auth
 */
export const auth = getAuth(app);

if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch(() => {
    setPersistence(auth, inMemoryPersistence).catch(() => { });
  });
}

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
  const provider = getGoogleProvider();

  try {
    const result = await signInWithPopup(auth, provider);
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
  await signOut(auth);
}

/**
 * Auth State Listener
 */
export { onAuthStateChanged };

export type { User as FirebaseUser };

export default app;