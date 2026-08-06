/**
 * Firebase Client Configuration & Persistence Layer
 * Provides robust persistent storage and role authentication state.
 */

export interface FirebaseAppConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export const firebaseConfig: FirebaseAppConfig = {
  apiKey: "AIzaSyFakeKeyRiskLensProdApp2026",
  authDomain: "risklens-ai-prod.firebaseapp.com",
  projectId: "risklens-ai-prod",
  storageBucket: "risklens-ai-prod.appspot.com",
  messagingSenderId: "811124449712",
  appId: "1:811124449712:web:a9b019ac0d35842ea"
};

// Storage keys for local caching
export const STORAGE_KEYS = {
  TRANSACTIONS: 'risklens_transactions_v1',
  ACTIVE_INVESTIGATION: 'risklens_active_investigation_v1',
  SYSTEM_SETTINGS: 'risklens_system_settings_v1',
  USER_PROFILE: 'risklens_user_profile_v1',
  AUDIT_LOGS: 'risklens_audit_logs_v1',
};
