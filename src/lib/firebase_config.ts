/**
 * Firebase Client Configuration & Persistence Layer
 * Provides robust persistent storage and role authentication state.
 *
 * NOTE: Actual Firebase initialization config is in firebase.ts using Vite env vars.
 * This file provides the type interface and storage keys only.
 */

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Storage keys for local caching
export const STORAGE_KEYS = {
  TRANSACTIONS: 'risklens_transactions_v1',
  ACTIVE_INVESTIGATION: 'risklens_active_investigation_v1',
  SYSTEM_SETTINGS: 'risklens_system_settings_v1',
  USER_PROFILE: 'risklens_user_profile_v1',
  AUDIT_LOGS: 'risklens_audit_logs_v1',
};
