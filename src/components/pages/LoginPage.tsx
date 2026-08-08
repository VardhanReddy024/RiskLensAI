import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginPageProps {
  onSuccess: () => void;
  onNavigateHome: () => void;
}

export function LoginPage({ onSuccess, onNavigateHome }: LoginPageProps) {
  const { loginWithGoogle, isLoading, isAuthenticated } = useAuth();
  const [signingIn, setSigningIn] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const signInInProgress = useRef<boolean>(false);

  // If user is already authenticated (or becomes authenticated), redirect immediately to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      onSuccess();
    }
  }, [isAuthenticated, onSuccess]);

  const handleGoogleSignIn = async () => {
    // Prevent duplicate popup requests
    if (signInInProgress.current) {
      return;
    }

    signInInProgress.current = true;
    setSigningIn(true);
    setError(null);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      const errorCode = firebaseError.code || '';

      switch (errorCode) {
        case 'auth/popup-closed-by-user':
          setError('Google sign-in was closed. Please try again.');
          break;
        case 'auth/popup-blocked':
          setError('Your browser blocked the Google sign-in popup. Please allow popups for this site and try again.');
          break;
        case 'auth/cancelled-popup-request':
          setError('Another Google sign-in request is already in progress.');
          break;
        case 'auth/unauthorized-domain':
          setError('This domain is not authorized for Google sign-in. Please contact the administrator.');
          break;
        case 'auth/network-request-failed':
          setError('Network error during Google sign-in. Please check your connection and try again.');
          break;
        case 'auth/operation-not-allowed':
          setError('Google sign-in is not enabled for this application. Please contact the administrator.');
          break;
        case 'auth/internal-error':
          setError('An internal authentication error occurred. Please try again.');
          break;
        case 'auth/account-exists-with-different-credential':
          setError('An account already exists with the same email address but different sign-in credentials.');
          break;
        default:
          setError('Google sign-in failed. Please try again.');
          break;
      }
      setSigningIn(false);
    } finally {
      signInInProgress.current = false;
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 sm:px-6 py-12">
      
      {/* Back button to public Landing Page */}
      <div className="w-full max-w-md mb-6">
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors p-1 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Public Showcase</span>
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.08)] p-7 sm:p-9 relative overflow-hidden">
        
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

        {/* Brand Header */}
        <div className="text-center space-y-3 pb-6 border-b border-slate-100">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center shadow-[0_4px_16px_rgba(79,70,229,0.3)] text-white">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              RiskLens <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">AI</span>
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Predict Fraud. Prevent Loss. Protect Trust.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[11px] font-bold text-blue-700">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Enterprise Production Gateway</span>
          </div>
        </div>

        {/* Role & Access Info */}
        <div className="py-6 space-y-4">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Assigned Operational Role</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-mono text-[10px] font-extrabold">
                Senior Fraud Analyst
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Authenticated Google workspace credentials automatically receive Senior Fraud Analyst privileges across AI Consensus, Live Stream Surveillance, and SAR Dossier Generation.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Primary Action: Continue with Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={signingIn || isLoading}
            className="w-full py-3.5 px-4 rounded-2xl bg-white hover:bg-slate-50 border-2 border-slate-200 hover:border-slate-300 text-slate-800 font-bold text-sm shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
          >
            {/* Google Vector Icon */}
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            <span>{signingIn ? 'Opening Account Chooser...' : 'Continue with Google'}</span>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Security Disclaimers */}
        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Lock className="w-3.5 h-3.5 text-slate-400" />
            <span>Encrypted with OAuth 2.0 & Firebase Auth</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Single-sign-on enforces continuous session validation with immutable SAR audit verification.
          </p>
        </div>

      </div>

    </div>
  );
}
