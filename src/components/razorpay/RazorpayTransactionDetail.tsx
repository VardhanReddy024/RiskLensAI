import React from 'react';
import { Transaction } from '../../types';
import { RazorpayRiskCard } from './RazorpayRiskCard';
import { formatCurrency, formatTimestamp, getRiskColorClasses } from '../../lib/utils';
import { 
  X, 
  CreditCard, 
  SearchCode, 
  Network, 
  ShieldCheck, 
  MapPin, 
  Smartphone, 
  Globe, 
  FileText,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

interface RazorpayTransactionDetailProps {
  transaction: Transaction | null;
  onClose: () => void;
  onInvestigate: (transaction: Transaction) => void;
  onOpenGraph?: (transaction: Transaction) => void;
}

export function RazorpayTransactionDetail({
  transaction,
  onClose,
  onInvestigate,
  onOpenGraph,
}: RazorpayTransactionDetailProps) {
  if (!transaction) return null;

  const tier = transaction.riskTier || transaction.riskLevel || 'LOW';
  const colors = getRiskColorClasses(tier);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl overflow-y-auto flex flex-col border-l border-slate-200">
        
        {/* Top Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-200 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 truncate font-mono">
                  {transaction.providerPaymentId || transaction.id}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-extrabold uppercase">
                  Razorpay
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate">
                {transaction.merchant} • {formatTimestamp(transaction.timestamp)}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          
          {/* Risk Card */}
          <RazorpayRiskCard transaction={transaction} />

          {/* Payment Information Section */}
          <div className="enterprise-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                Payment Gateway Telemetry
              </h4>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                transaction.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                transaction.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                transaction.status === 'held' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {transaction.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Payment ID</span>
                <p className="font-mono font-bold text-slate-800 break-all">{transaction.providerPaymentId || transaction.id}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Order ID</span>
                <p className="font-mono font-bold text-slate-800 break-all">{transaction.providerOrderId || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Amount & Currency</span>
                <p className="font-mono font-bold text-slate-900 text-sm">
                  {formatCurrency(transaction.amount, transaction.currency || 'INR')} ({transaction.currency || 'INR'})
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Event ID</span>
                <p className="font-mono font-bold text-slate-800 truncate">{transaction.providerEventId || '—'}</p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Payment Method</span>
                <p className="font-semibold text-slate-800">
                  {transaction.paymentMethod?.type} {transaction.paymentMethod?.last4 ? `(•••• ${transaction.paymentMethod.last4})` : ''}
                </p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Tenant Isolation</span>
                <p className="font-mono font-semibold text-slate-700">{transaction.tenantId || 'tenant_razorpay_merchant'}</p>
              </div>
            </div>
          </div>

          {/* Telemetry & Device Intelligence */}
          <div className="enterprise-card p-5 space-y-4">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-3">
              <Globe className="w-4 h-4 text-purple-600" />
              Network & Device Attribution
            </h4>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Geo Location
                </span>
                <p className="font-semibold text-slate-800">
                  {transaction.location?.city}, {transaction.location?.country} ({transaction.location?.distanceFromHomeKm} km)
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  Device OS & Type
                </span>
                <p className="font-semibold text-slate-800">
                  {transaction.device?.os} · {transaction.device?.type}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">IP Risk Score</span>
                <p className="font-semibold text-slate-800">
                  {transaction.ipAddress?.ip} {transaction.ipAddress?.isTor ? '(Tor Exit)' : transaction.ipAddress?.isProxy ? '(Proxy/VPN)' : ''}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">Device Fingerprint</span>
                <p className="font-semibold text-slate-800">
                  {transaction.device?.fingerprintScore}/100 trust rating
                </p>
              </div>
            </div>
          </div>

          {/* AI Autonomous Swarm Status */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
                  Multi-Agent Swarm Status
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
                8 Specialized Agents
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              This transaction is indexed in the continuous surveillance graph. Launch a comprehensive multi-agent investigation to evaluate cross-entity links, behavioral baselines, AML compliance, and SAR filing narratives.
            </p>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="btn-premium-secondary px-4 py-2.5 text-xs"
          >
            Close
          </button>

          <div className="flex items-center gap-3">
            {onOpenGraph && (
              <button
                onClick={() => onOpenGraph(transaction)}
                className="btn-premium-secondary px-4 py-2.5 text-xs flex items-center gap-1.5"
              >
                <Network className="w-3.5 h-3.5 text-purple-600" />
                <span>Relationship Graph</span>
              </button>
            )}

            <button
              onClick={() => onInvestigate(transaction)}
              className="btn-premium-primary px-5 py-2.5 text-xs flex items-center gap-2 shadow-blue-500/20"
            >
              <SearchCode className="w-4 h-4" />
              <span>Launch AI Investigation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
