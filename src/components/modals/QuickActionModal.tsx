import React, { useState } from 'react';
import { Transaction, ActionRecommendation } from '../../types';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../lib/utils';
import { 
  X, 
  ShieldAlert, 
  CheckCircle, 
  PauseCircle, 
  ArrowUpRight, 
  XCircle, 
  Lock, 
  Sparkles
} from 'lucide-react';

interface QuickActionModalProps {
  transaction: Transaction;
  recommendation?: ActionRecommendation;
  onClose: () => void;
  onSuccess?: () => void;
}

export function QuickActionModal({
  transaction,
  recommendation,
  onClose,
  onSuccess,
}: QuickActionModalProps) {
  const { resolveTransaction } = useTransactions();
  const { currentUser } = useAuth();
  
  const [selectedAction, setSelectedAction] = useState<'APPROVE' | 'HOLD' | 'ESCALATE' | 'REJECT'>(
    recommendation?.action || (transaction.riskScore >= 60 ? 'REJECT' : 'APPROVE')
  );
  const [notes, setNotes] = useState<string>(
    recommendation?.reasonCode 
      ? `Authorized action based on ${recommendation.recommendedPlaybook}. Reason: ${recommendation.reasonCode}`
      : `Manual action applied by ${currentUser?.displayName || 'Senior Fraud Analyst'} (${currentUser?.role || 'Senior Fraud Analyst'}).`
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await resolveTransaction(transaction.id, selectedAction, notes);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const ACTION_CONFIG = {
    APPROVE: {
      label: 'Approve Transaction',
      desc: 'Clear all risk holds and allow straight-through payment authorization.',
      icon: CheckCircle,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20',
      border: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    },
    HOLD: {
      label: 'Step-Up Verification (Hold)',
      desc: 'Place on 15-min hold and dispatch Biometric FIDO2 / Push challenge.',
      icon: PauseCircle,
      color: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-500/20',
      border: 'border-amber-200 bg-amber-50/70 text-amber-900',
    },
    ESCALATE: {
      label: 'Escalate to Tier-3 SIU',
      desc: 'Assign ticket to Special Investigations Unit for deep forensic tracing.',
      icon: ArrowUpRight,
      color: 'bg-purple-600 hover:bg-purple-700 text-white shadow-purple-500/20',
      border: 'border-purple-200 bg-purple-50/70 text-purple-900',
    },
    REJECT: {
      label: 'Reject & Freeze Card',
      desc: 'Decline transaction instantly, freeze compromised payment token, and flag SAR.',
      icon: XCircle,
      color: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/20',
      border: 'border-rose-200 bg-rose-50/70 text-rose-900',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-150">
      <div className="enterprise-card p-0 shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-700 shadow-2xs border border-blue-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Execute Decision Action
              </h3>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {transaction.id} • {formatCurrency(transaction.amount, transaction.currency)}
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6">
          
          {/* AI Recommendation Banner */}
          {recommendation && (
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-start gap-3 shadow-2xs">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-900">
                <span className="font-bold">AI Agent Recommendation: </span>
                <span className="font-semibold">{recommendation.action} ({recommendation.urgency} Urgency)</span>.
                <div className="text-blue-700 mt-0.5 font-medium">{recommendation.recommendedPlaybook}</div>
              </div>
            </div>
          )}

          {/* Action Selector Grid */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Select Enforcement Action
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.keys(ACTION_CONFIG) as Array<keyof typeof ACTION_CONFIG>).map((actKey) => {
                const cfg = ACTION_CONFIG[actKey];
                const Icon = cfg.icon;
                const isSelected = selectedAction === actKey;
                return (
                  <button
                    type="button"
                    key={actKey}
                    onClick={() => setSelectedAction(actKey)}
                    className={`p-3.5 rounded-2xl border text-left transition-all duration-150 ${
                      isSelected
                        ? `${cfg.border} ring-2 ring-blue-500/20 shadow-xs`
                        : 'border-slate-200/80 hover:border-slate-300 bg-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold text-slate-900">{cfg.label}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                      {cfg.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Audit Notes Field */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Investigator Audit Justification & Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-sans text-slate-800 bg-slate-50/50 leading-relaxed"
              placeholder="Provide reason for approval, hold, or rejection for compliance record..."
              required
            />
          </div>

          {/* Operator Role Tag */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100/90">
            <span className="flex items-center gap-1.5 font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Signed as: <strong className="text-slate-700">{currentUser?.displayName || 'Senior Fraud Analyst'}</strong> ({currentUser?.role || 'Senior Fraud Analyst'})
            </span>
            <span className="text-[11px] text-slate-400">Immutable Audit Trail</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-premium-secondary px-4 py-2.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl shadow-md transition-all ${
                ACTION_CONFIG[selectedAction].color
              }`}
            >
              {isSubmitting ? 'Recording Audit...' : `Confirm ${selectedAction}`}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
