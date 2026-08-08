/**
 * RiskLens AI - Enterprise React Error Boundary & Recovery Suite
 * 
 * Provides:
 * - Runtime rendering exception interception
 * - Clean, high-contrast recovery screen
 * - Instant "Retry" action
 * - "Return to Dashboard" navigation recovery
 * - Collapsible diagnostic stack trace for debugging
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AlertOctagon, RotateCcw, LayoutDashboard, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    // In production, send diagnostic telemetries
    if (typeof console !== 'undefined' && console.error) {
      console.error('[RiskLens AI UI Exception]', error, errorInfo);
    }
  }

  public handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public handleReturnDashboard = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  public toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Header / Icon */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 shrink-0">
                <AlertOctagon className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20 rounded-full">
                    Fault Intercepted
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Security Baseline Intact
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  RiskLens AI Application Exception
                </h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  An unexpected UI rendering exception was captured. The server-side transaction engine, AI agents, and immutable audit logs remain fully operational.
                </p>
              </div>
            </div>

            {/* Error Message Callout */}
            <div className="p-4 bg-slate-950/80 border border-slate-800/80 rounded-xl font-mono text-xs text-red-300 break-words">
              {this.state.error?.message || 'Unknown runtime UI exception'}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                type="button"
                id="error-boundary-retry-button"
                onClick={this.handleRetry}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-blue-600/20 active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" />
                Retry Operation
              </button>

              <button
                type="button"
                id="error-boundary-dashboard-button"
                onClick={this.handleReturnDashboard}
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium rounded-xl transition-colors border border-slate-700 active:scale-[0.98]"
              >
                <LayoutDashboard className="w-4 h-4" />
                Return to Dashboard
              </button>
            </div>

            {/* Technical Diagnostics Collapsible */}
            <div className="border-t border-slate-800/80 pt-4">
              <button
                type="button"
                onClick={this.toggleDetails}
                className="flex items-center justify-between w-full text-left text-xs text-slate-400 hover:text-slate-200 transition-colors py-1"
              >
                <span className="font-medium">Technical Diagnostic Details</span>
                {this.state.showDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-4 bg-black/60 border border-slate-800 rounded-lg overflow-x-auto max-h-60 text-slate-400 font-mono text-[11px] space-y-3">
                  <div>
                    <span className="text-slate-300 font-bold block mb-1">Stack Trace:</span>
                    <pre className="whitespace-pre-wrap">{this.state.error?.stack || 'No stack trace available'}</pre>
                  </div>
                  {this.state.errorInfo && (
                    <div className="border-t border-slate-800 pt-2">
                      <span className="text-slate-300 font-bold block mb-1">Component Hierarchy:</span>
                      <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
