import React from 'react';
import { Transaction } from '../../types';
import { RiskGauge } from '../common/RiskGauge';
import { getRiskColorClasses } from '../../lib/utils';
import { ShieldAlert, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface RazorpayRiskCardProps {
  transaction: Transaction;
}

export function RazorpayRiskCard({ transaction }: RazorpayRiskCardProps) {
  const tier = transaction.riskTier || transaction.riskLevel || 'LOW';
  const score = transaction.riskScore ?? 0;
  const colors = getRiskColorClasses(tier);
  const decision = transaction.riskDecision || (score >= 75 ? 'REJECT' : (score >= 60 ? 'REVIEW' : (score >= 30 ? 'REVIEW' : 'ALLOW')));

  const getDecisionBadge = (dec: string) => {
    switch (dec) {
      case 'ALLOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ALLOW (Approved)
          </span>
        );
      case 'REVIEW':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3.5 h-3.5" />
            REVIEW (Hold / Triage)
          </span>
        );
      case 'MITIGATE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            MITIGATE (Step-up Auth)
          </span>
        );
      case 'REJECT':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" />
            REJECT (Escalated / Blocked)
          </span>
        );
    }
  };

  const factors = transaction.riskFactors && transaction.riskFactors.length > 0
    ? transaction.riskFactors
    : transaction.flagReasons && transaction.flagReasons.length > 0
    ? transaction.flagReasons
    : ['Standard payment behavioral baseline', 'Verified cardholder velocity', 'Valid geographic signature'];

  return (
    <div className="enterprise-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Risk Intelligence Verdict</h4>
        <div className="flex items-center gap-2">
          {getDecisionBadge(decision)}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-50/70 border border-slate-100">
        <div className="shrink-0">
          <RiskGauge score={score} tier={tier} confidence={transaction.confidenceScore} size="lg" />
        </div>
        <div className="space-y-1.5 flex-1 min-w-0 text-center sm:text-left">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <span className="text-sm font-extrabold text-slate-900">
              Risk Score: <span className="font-mono text-base">{score} / 100</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${colors.badge}`}>
              {tier}
            </span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            Computed by RiskLens ML engine upon Razorpay webhook ingestion. Confidence: <strong>{Math.round((transaction.confidenceScore || 0.9) * 100)}%</strong>.
          </p>
          {transaction.estimatedLossPrevented ? (
            <p className="text-xs font-semibold text-rose-600">
              Direct Exposure Protected: ₹{transaction.estimatedLossPrevented.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-2">
          Risk Drivers & Signals
        </span>
        <ul className="space-y-1.5">
          {factors.map((factor, idx) => (
            <li key={idx} className="text-xs text-slate-700 bg-white/80 p-2.5 rounded-lg border border-slate-200/60 flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
              <span className="font-medium">{factor}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
