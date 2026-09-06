/**
 * WebhookStatusPanel
 *
 * Displays the Razorpay + RiskLens integration status.
 * Source: /api/health (public endpoint — zero secrets returned).
 *
 * SECURITY: Never displays RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET,
 * DATABASE_URL, GEMINI_API_KEY, or any backend credential.
 */

import React from 'react';
import {
  Wifi,
  WifiOff,
  Link2,
  CheckCircle2,
  AlertCircle,
  Database,
  Cpu,
  Sparkles,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useWebhookStatus } from '../../hooks/useWebhookStatus';
import { formatRelativeDate } from '../../lib/utils';

export function WebhookStatusPanel() {
  const { status, isLoading, refresh } = useWebhookStatus();

  const isUp = status.backendStatus === 'UP';
  const isUnknown = status.backendStatus === 'UNKNOWN';

  return (
    <div className="enterprise-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl ${isUp ? 'bg-emerald-50' : 'bg-slate-100'}`}>
            {isUp ? (
              <Wifi className="w-4 h-4 text-emerald-600" />
            ) : (
              <WifiOff className="w-4 h-4 text-slate-400" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Razorpay Integration Status</h3>
            <p className="text-[11px] text-slate-500 font-medium">Webhook events · HMAC-SHA256 verification</p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="p-2 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200/60"
          title="Refresh status"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Webhook Endpoint */}
        <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Link2 className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Webhook Endpoint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
              isUnknown
                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                : isUp
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : 'bg-rose-100 text-rose-700 border border-rose-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isUnknown ? 'bg-slate-400' : isUp ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {isUnknown ? 'CHECKING' : isUp ? 'CONNECTED' : 'NOT CONNECTED'}
            </span>
          </div>
          {status.razorpayWebhookEndpoint && (
            <p className="text-[10px] text-slate-400 font-mono mt-2 truncate leading-relaxed" title={status.razorpayWebhookEndpoint}>
              {status.razorpayWebhookEndpoint.replace('https://', '').split('/').slice(0, 1)}…
            </p>
          )}
        </div>

        {/* Backend Database */}
        <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Database</span>
          </div>
          <div className="flex items-center gap-1.5">
            {status.dbStatus === 'connected' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : status.dbStatus === 'fallback_memory' ? (
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
            )}
            <span className="text-xs font-semibold text-slate-700">
              {isUnknown
                ? '—'
                : status.dbStatus === 'connected'
                ? (status.dbAdapter === 'postgres' ? 'Managed PostgreSQL' : status.dbAdapter === 'firestore' ? 'Cloud Firestore' : 'Persistent Storage')
                : status.dbStatus === 'fallback_memory'
                ? 'In-Memory Fallback'
                : 'Disconnected'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1.5">
            {isUnknown
              ? '—'
              : status.dbStatus === 'connected'
              ? `${status.transactionCount} transactions stored`
              : status.dbStatus === 'fallback_memory'
              ? `${status.transactionCount} transactions (Degraded / Ephemeral)`
              : 'Database offline'}
          </p>
        </div>

        {/* ML Engine & Services */}
        <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Risk Engine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${status.services.ml_engine ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="text-xs font-semibold text-slate-700">
              {isUnknown ? '—' : status.services.ml_engine ? 'ML Engine Active' : 'ML Engine Offline'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${status.services.orchestrator ? 'bg-emerald-500' : 'bg-slate-300'}`} />
            <span className="text-[10px] text-slate-400 font-medium">
              {isUnknown ? '—' : status.services.orchestrator ? '8-Agent Orchestrator Active' : 'Orchestrator Offline'}
            </span>
          </div>
        </div>

        {/* AI (Gemini) Status */}
        <div className="bg-slate-50/70 rounded-xl p-3.5 border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">AI Investigation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${status.services.gemini ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-xs font-semibold text-slate-700">
              {isUnknown ? '—' : status.services.gemini ? 'Gemini configured' : 'Unavailable (Gemini not configured)'}
            </span>
          </div>
          {status.lastChecked && (
            <p className="text-[10px] text-slate-400 font-medium mt-1.5">
              Checked {formatRelativeDate(status.lastChecked.toISOString())}
            </p>
          )}
        </div>
      </div>

      {/* Webhook URL (safe — public URL, no secrets) */}
      {status.razorpayWebhookEndpoint && (
        <div className="mt-4 p-3 rounded-xl bg-blue-50/60 border border-blue-100/80 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block mb-0.5">Webhook URL (configure in Razorpay Dashboard)</span>
            <code className="text-xs font-mono text-blue-800 truncate block">
              {status.razorpayWebhookEndpoint}
            </code>
          </div>
          <a
            href={status.razorpayWebhookEndpoint}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-1.5 rounded-lg hover:bg-blue-100 text-blue-600 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}
    </div>
  );
}
