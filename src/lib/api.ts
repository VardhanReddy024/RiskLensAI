/**
 * RiskLens AI - Centralized Client API & Environment Configuration
 *
 * AUTHORITATIVE PRODUCTION BACKEND:
 * https://rvardhan791--risklens-ai-backend-run-server.modal.run
 *
 * Local development resolves cleanly to "" / window.location.origin (e.g. http://localhost:3000).
 */

export const PRODUCTION_MODAL_API_URL = 'https://rvardhan791--risklens-ai-backend-run-server.modal.run';
export const PRODUCTION_MODAL_WEBHOOK_URL = `${PRODUCTION_MODAL_API_URL}/api/webhooks/razorpay`;

/**
 * Determines the authoritative API base URL based on runtime environment.
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    const cleaned = envUrl.trim().replace(/\/+$/, '');
    if (!cleaned.includes('onrender.com')) {
      return cleaned;
    }
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname || '';
    const isLocalOrPreview =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.includes('ais-') ||
      hostname.includes('cloudshell');

    if (!isLocalOrPreview && (hostname.includes('vercel.app') || hostname.includes('risklens'))) {
      return PRODUCTION_MODAL_API_URL;
    }
  }

  return '';
}

export const API_BASE_URL = getApiBaseUrl();

export function getWebhookUrl(): string {
  const base = getApiBaseUrl();
  if (base && !base.includes('onrender.com')) {
    return `${base}/api/webhooks/razorpay`;
  }
  if (typeof window !== 'undefined' && window.location.origin) {
    const isLocalOrPreview =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('ais-');

    if (isLocalOrPreview) {
      return `${window.location.origin}/api/webhooks/razorpay`;
    }
  }
  return PRODUCTION_MODAL_WEBHOOK_URL;
}

export const WEBHOOK_URL = getWebhookUrl();

/**
 * Resolves a valid Firebase ID token for the current user.
 *
 * Strategy (in priority order):
 * 1. If Firebase auth is configured and a user is already signed in, get their token.
 * 2. If Firebase auth is configured but auth.currentUser is null, wait up to 3s for
 *    the auth state to resolve (handles the transient null window on page load).
 * 3. In non-production environments, fall back to a dev TEST_TOKEN derived from the
 *    locally stored user profile — only when VITE_ALLOW_DEV_AUTH_FALLBACK=true.
 *
 * This prevents the 401 race condition where the Copilot or Investigation request
 * fires before Firebase has finished restoring its persisted auth session.
 */
async function resolveAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  try {
    const { auth } = await import('./firebase');

    // Case 1: Firebase user already available — fast path
    if (auth?.currentUser) {
      return await auth.currentUser.getIdToken();
    }

    // Case 2: Firebase is configured but auth state hasn't resolved yet.
    // Wait for onAuthStateChanged to fire with a real user (max 3 seconds).
    if (auth) {
      const token = await new Promise<string | null>((resolve) => {
        let resolved = false;
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        }, 3000);

        const { onAuthStateChanged } = auth.constructor
          ? { onAuthStateChanged: null }
          : { onAuthStateChanged: null };

        // Import onAuthStateChanged directly from firebase/auth
        import('firebase/auth').then(({ onAuthStateChanged: fbOnAuthStateChanged }) => {
          const unsubscribe = fbOnAuthStateChanged(auth, (user) => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              unsubscribe();
              if (user) {
                user.getIdToken().then(resolve).catch(() => resolve(null));
              } else {
                resolve(null);
              }
            }
          });
        }).catch(() => {
          if (!resolved) {
            resolved = true;
            clearTimeout(timeout);
            resolve(null);
          }
        });
      });

      if (token) return token;
    }

    // Case 3: Non-production dev fallback (only when explicitly opted-in)
    if (!import.meta.env.PROD) {
      const storedUser = localStorage.getItem('risklens_auth_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        // Use an explicit token field if present (e.g. stored during login)
        if (parsed?.token) return parsed.token;
        // Dev TEST_TOKEN only when VITE_ALLOW_DEV_AUTH_FALLBACK=true
        if (import.meta.env.VITE_ALLOW_DEV_AUTH_FALLBACK === 'true' && parsed?.email) {
          return `TEST_TOKEN_${parsed.email}`;
        }
      }
    }
  } catch {
    // Ignore import or storage errors
  }

  return null;
}

/**
 * Authenticated API fetch proxy.
 * Automatically attaches a valid Bearer token to every request.
 * Never logs tokens or secrets.
 */
export const apiFetch = async (url: string, options?: RequestInit): Promise<Response> => {
  const headers = new Headers(options?.headers);

  if (!headers.has('Authorization')) {
    const token = await resolveAuthToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  const resolvedBase = getApiBaseUrl();
  const fullUrl = url.startsWith('http') ? url : `${resolvedBase}${url}`;

  return fetch(fullUrl, {
    ...options,
    headers,
  });
};

// ---------------------------------------------------------------------------
// Typed Razorpay / Transaction API helpers
// ---------------------------------------------------------------------------

export const razorpayApi = {
  getTransactions: () => apiFetch('/api/transactions'),
  getTransactionById: (id: string) => apiFetch(`/api/transactions/${id}`),
  getAnalyticsMetrics: () => apiFetch('/api/analytics/metrics'),
};

/**
 * Fetch backend health status (public endpoint, no auth required).
 */
export const getBackendHealth = () => {
  const base = getApiBaseUrl();
  return fetch(`${base}/api/health`, { method: 'GET' });
};

/**
 * Fetch backend readiness status (public endpoint, no auth required).
 */
export const getBackendReadiness = () => {
  const base = getApiBaseUrl();
  return fetch(`${base}/api/health/ready`, { method: 'GET' });
};
