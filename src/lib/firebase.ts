import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  User,
} from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

/**
 * Validate required environment variables
 */
const requiredEnvVars = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

for (const key of requiredEnvVars) {
  if (!import.meta.env[key]) {
    throw new Error(`Missing Firebase environment variable: ${key}`);
  }
}

/**
 * Firebase Configuration
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

/**
 * Initialize Firebase (Singleton)
 */
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

/**
 * Analytics (only if supported)
 */
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
});

/**
 * Firebase Authentication
 */
export const auth = getAuth(app);

/**
 * Persist login after refresh
 */
setPersistence(auth, browserLocalPersistence).catch(console.error);

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

  const result = await signInWithPopup(auth, provider);

  return result.user;
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