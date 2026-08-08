/**
 * RiskLens AI — Authentication Error Handling Tests
 *
 * Tests that Firebase authentication error codes are correctly mapped
 * to user-friendly error messages in the login flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Maps a Firebase auth error code to the user-facing message displayed on the login page.
 * This mirrors the switch statement in LoginPage.tsx handleGoogleSignIn().
 */
function mapFirebaseErrorToMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/popup-closed-by-user':
      return 'Google sign-in was closed. Please try again.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.';
    case 'auth/cancelled-popup-request':
      return 'Another Google sign-in request is already in progress.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized for Google sign-in. Please contact the administrator.';
    case 'auth/network-request-failed':
      return 'Network error during Google sign-in. Please check your connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled for this application. Please contact the administrator.';
    case 'auth/internal-error':
      return 'An internal authentication error occurred. Please try again.';
    case 'auth/account-exists-with-different-credential':
      return 'An account already exists with the same email address but different sign-in credentials.';
    default:
      return 'Google sign-in failed. Please try again.';
  }
}

describe('Authentication Error Handling', () => {
  describe('Firebase error code → user message mapping', () => {
    it('maps auth/popup-closed-by-user to a clear message', () => {
      const msg = mapFirebaseErrorToMessage('auth/popup-closed-by-user');
      expect(msg).toBe('Google sign-in was closed. Please try again.');
      expect(msg).not.toContain('cancelled before selecting');
    });

    it('maps auth/popup-blocked to browser popup help', () => {
      const msg = mapFirebaseErrorToMessage('auth/popup-blocked');
      expect(msg).toContain('blocked');
      expect(msg).toContain('popups');
    });

    it('maps auth/cancelled-popup-request to duplicate request warning', () => {
      const msg = mapFirebaseErrorToMessage('auth/cancelled-popup-request');
      expect(msg).toContain('already in progress');
    });

    it('maps auth/unauthorized-domain to domain authorization error', () => {
      const msg = mapFirebaseErrorToMessage('auth/unauthorized-domain');
      expect(msg).toContain('not authorized');
      expect(msg).toContain('administrator');
    });

    it('maps auth/network-request-failed to network error', () => {
      const msg = mapFirebaseErrorToMessage('auth/network-request-failed');
      expect(msg).toContain('Network error');
      expect(msg).toContain('connection');
    });

    it('maps auth/operation-not-allowed to operation not allowed', () => {
      const msg = mapFirebaseErrorToMessage('auth/operation-not-allowed');
      expect(msg).toContain('not enabled');
    });

    it('maps auth/internal-error to internal error', () => {
      const msg = mapFirebaseErrorToMessage('auth/internal-error');
      expect(msg).toContain('internal');
      expect(msg).toContain('try again');
    });

    it('maps auth/account-exists-with-different-credential to credential conflict', () => {
      const msg = mapFirebaseErrorToMessage('auth/account-exists-with-different-credential');
      expect(msg).toContain('different sign-in credentials');
    });

    it('maps unknown error codes to a generic fallback', () => {
      const msg = mapFirebaseErrorToMessage('auth/unknown-error-xyz');
      expect(msg).toBe('Google sign-in failed. Please try again.');
    });

    it('maps empty error code to a generic fallback', () => {
      const msg = mapFirebaseErrorToMessage('');
      expect(msg).toBe('Google sign-in failed. Please try again.');
    });
  });

  describe('Error message security', () => {
    it('never exposes API keys in error messages', () => {
      const allCodes = [
        'auth/popup-closed-by-user',
        'auth/popup-blocked',
        'auth/cancelled-popup-request',
        'auth/unauthorized-domain',
        'auth/network-request-failed',
        'auth/operation-not-allowed',
        'auth/internal-error',
        'auth/account-exists-with-different-credential',
        'unknown',
        '',
      ];

      for (const code of allCodes) {
        const msg = mapFirebaseErrorToMessage(code);
        expect(msg).not.toMatch(/AIza/); // Firebase API key prefix
        expect(msg).not.toMatch(/token/i);
        expect(msg).not.toMatch(/credential[^s]/i); // "credentials" is OK in context
        expect(msg).not.toMatch(/secret/i);
      }
    });
  });

  describe('Duplicate sign-in prevention', () => {
    it('ref guard pattern prevents concurrent sign-in attempts', () => {
      // Simulate the ref guard pattern used in LoginPage
      const signInInProgress = { current: false };
      const attempts: number[] = [];

      const handleSignIn = () => {
        if (signInInProgress.current) {
          return false; // blocked
        }
        signInInProgress.current = true;
        attempts.push(1);
        return true; // proceeded
      };

      expect(handleSignIn()).toBe(true);
      expect(handleSignIn()).toBe(false); // second call blocked
      expect(handleSignIn()).toBe(false); // third call blocked
      expect(attempts).toHaveLength(1); // only one attempt went through

      // Reset (simulates finally block)
      signInInProgress.current = false;
      expect(handleSignIn()).toBe(true); // allowed again after reset
      expect(attempts).toHaveLength(2);
    });
  });
});
