/**
 * RiskLens AI - Client Runtime Configuration & Environment Access
 * 
 * Features:
 * - Strongly typed configuration interface
 * - Safe environment variable accessor for Vite (import.meta.env)
 * - Safe fallbacks for dev, preview, and test environments
 * - Feature flags and service endpoints configuration
 */

export interface ClientConfig {
  env: 'development' | 'production' | 'test';
  appName: string;
  version: string;
  apiUrl: string;
  enableAnalytics: boolean;
  firebase: {
    apiKey?: string;
    authDomain?: string;
    projectId?: string;
    storageBucket?: string;
    messagingSenderId?: string;
    appId?: string;
    measurementId?: string;
  };
  features: {
    qdrantGraph: boolean;
    copilotStream: boolean;
    realTimeMonitoring: boolean;
    advancedDevOps: boolean;
  };
}

/**
 * Loads, normalizes, and validates client-side environment configurations
 */
export function loadClientConfig(): ClientConfig {
  const metaEnv = typeof import.meta !== 'undefined' && (import.meta as any).env ? (import.meta as any).env : {};

  const env = (metaEnv.MODE || metaEnv.VITE_APP_ENV || 'development') as 'development' | 'production' | 'test';

  return {
    env,
    appName: metaEnv.VITE_APP_NAME || 'RiskLens AI',
    version: '2.4.0-prod',
    apiUrl: metaEnv.VITE_API_URL || '',
    enableAnalytics: metaEnv.VITE_ENABLE_ANALYTICS === 'true' || env === 'production',
    firebase: {
      apiKey: metaEnv.VITE_FIREBASE_API_KEY,
      authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
      storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: metaEnv.VITE_FIREBASE_APP_ID,
      measurementId: metaEnv.VITE_FIREBASE_MEASUREMENT_ID,
    },
    features: {
      qdrantGraph: true,
      copilotStream: true,
      realTimeMonitoring: true,
      advancedDevOps: true,
    },
  };
}

export const clientConfig = loadClientConfig();
