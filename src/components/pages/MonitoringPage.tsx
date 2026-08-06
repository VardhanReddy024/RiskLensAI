import React, { useState } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useInvestigation } from '../../context/InvestigationContext';
import { Transaction } from '../../types';
import { formatCurrency, formatRelativeDate, getRiskColorClasses } from '../../lib/utils';
import { RiskGauge } from '../common/RiskGauge';
import { QuickActionModal } from '../modals/QuickActionModal';
import { 
  Radio, 
  Play, 
  Pause, 
  SearchCode, 
  Clock, 
  ShieldAlert,
  Sparkles,
  Zap,
  SlidersHorizontal
} from 'lucide-react';

interface MonitoringPageProps {
  onNavigateToInvestigation: (transaction: Transaction) => void;
}

export function MonitoringPage({ onNavigateToInvestigation }: MonitoringPageProps) {
  const { transactions, isStreaming, toggleStreaming, streamSpeed, setStreamSpeed, metrics } = useTransactions();
  const { startInvestigation } = useInvestigation();

  const [filterMode, setFilterMode] = useState<'all' | 'flagged' | 'critical'>('all');
  const [selectedTxnForAction, setSelectedTxnForAction] = useState<Transaction | null>(null);

  const displayTransactions = transactions.filter(t => {
    if (filterMode === 'critical') return t.riskTier === 'CRITICAL';
    if (filterMode === 'flagged') return t.riskTier === 'CRITICAL' || t.riskTier === 'HIGH' || t.status === 'flagged';
    return true;
  });

  const handleInvestigate = async (txn: Transaction) => {
    await startInvestigation(txn);
    onNavigateToInvestigation(txn);
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Stream Control Deck */}
      <div className="enterprise-card p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              Real-Time Fraud Telemetry Stream
            </h1>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1.5 shadow-2xs ${
              isStreaming
                ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse'
                : 'bg-slate-100 text-slate-600 border border-slate-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? 'bg-rose-600' : 'bg-slate-400'}`} />
              {isStreaming ? 'STREAMING ACTIVE' : 'STREAM PAUSED'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
            Incoming global authorization requests analyzed instantaneously against 90-day behavioral baselines and Qdrant vectors
          </p>
        </div>

        {/* Streaming Controls */}
        <div className="flex flex-wrap items-center gap-4 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
          
          {/* Speed slider */}
          <div className="flex items-center gap-2.5 text-xs">
            <Clock className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-700">Interval:</span>
            <input
              type="range"
              min="1000"
              max="5000"
              step="500"
              value={streamSpeed}
              onChange={(e) => setStreamSpeed(Number(e.target.value))}
              className="w-24 accent-blue-600 cursor-pointer"
            />
            <span className="font-mono text-slate-700 font-bold">{(streamSpeed / 1000).toFixed(1)}s</span>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 bg-white/90 p-1 rounded-xl border border-slate-200/90 text-xs font-semibold shadow-2xs">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-lg transition-all duration-150 ${
                filterMode === 'all' ? 'bg-blue-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({transactions.length})
            </button>
            <button
              onClick={() => setFilterMode('flagged')}
              className={`px-3 py-1.5 rounded-lg transition-all duration-150 ${
                filterMode === 'flagged' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flagged ({metrics.flaggedCount + metrics.criticalCount})
            </button>
            <button
              onClick={() => setFilterMode('critical')}
              className={`px-3 py-1.5 rounded-lg transition-all duration-150 ${
                filterMode === 'critical' ? 'bg-rose-600 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Critical ({metrics.criticalCount})
            </button>
          </div>

          {/* Toggle Button */}
          <button
            onClick={toggleStreaming}
            className={`btn-premium-primary px-4 py-2 text-xs flex items-center gap-2 ${
              isStreaming ? '!bg-rose-600 hover:!bg-rose-700 shadow-rose-500/30' : '!bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-500/30'
            }`}
          >
            {isStreaming ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isStreaming ? 'Pause Stream' : 'Resume Stream'}</span>
          </button>

        </div>
      </div>

      {/* Live Interventions Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {displayTransactions.slice(0, 18).map((txn) => {
          const colors = getRiskColorClasses(txn.riskTier);
          const isHighAlert = txn.riskTier === 'CRITICAL' || txn.riskTier === 'HIGH';

          return (
            <div
              key={txn.id}
              className={`enterprise-card p-5.5 flex flex-col justify-between ${
                isHighAlert
                  ? 'border-rose-300/80 ring-2 ring-rose-500/10 shadow-rose-500/5'
                  : ''
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {txn.id}
                      </span>
                      {txn.ipAddress.isTor && (
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200">
                          TOR EXIT
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      {formatRelativeDate(txn.timestamp)}
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors.badge}`}>
                    {txn.riskTier} ({txn.riskScore})
                  </span>
                </div>

                {/* Amount & Merchant */}
                <div className="mb-4">
                  <div className="text-2xl font-extrabold font-mono text-slate-900">
                    {formatCurrency(txn.amount, txn.currency)}
                  </div>
                  <div className="text-xs font-bold text-slate-800 mt-1">
                    {txn.merchant}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {txn.merchantCategory} • Customer {txn.customerId}
                  </div>
                </div>

                {/* Key Risk Flags */}
                <div className="space-y-2 py-3 border-t border-slate-100/90 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Location:</span>
                    <span className="font-medium text-slate-800 truncate ml-2">
                      {txn.location.city}, {txn.location.country} ({txn.location.distanceFromHomeKm}km)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Device:</span>
                    <span className="font-medium text-slate-800 truncate ml-2">
                      {txn.device.os} ({txn.device.type})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>3DS Verification:</span>
                    <span className={`font-bold ${txn.paymentMethod.is3DSecure ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {txn.paymentMethod.is3DSecure ? 'Verified (Biometric)' : 'Not Enabled'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3.5 border-t border-slate-100/90 flex items-center gap-2.5">
                <button
                  onClick={() => handleInvestigate(txn)}
                  className="btn-premium-primary flex-1 py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <SearchCode className="w-3.5 h-3.5" />
                  <span>Deep Investigate</span>
                </button>
                <button
                  onClick={() => setSelectedTxnForAction(txn)}
                  className="btn-premium-secondary px-3 py-2 text-xs"
                >
                  Action
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Quick Action Modal */}
      {selectedTxnForAction && (
        <QuickActionModal
          transaction={selectedTxnForAction}
          onClose={() => setSelectedTxnForAction(null)}
        />
      )}

    </div>
  );
}
