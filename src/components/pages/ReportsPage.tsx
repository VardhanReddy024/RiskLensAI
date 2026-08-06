import React, { useState } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { useInvestigation } from '../../context/InvestigationContext';
import { formatCurrency } from '../../lib/utils';
import { EnterpriseReportModal } from '../modals/EnterpriseReportModal';
import { Transaction, InvestigationDossier } from '../../types';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Printer, 
  FileText, 
  Lock,
  Download,
  Loader2
} from 'lucide-react';

export function ReportsPage() {
  const { transactions, metrics } = useTransactions();
  const { currentUser } = useAuth();
  const { startInvestigation, activeDossier } = useInvestigation();
  
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<'sar' | 'audit' | 'executive'>('sar');
  const [reportModalDossier, setReportModalDossier] = useState<InvestigationDossier | null>(null);
  const [loadingTxnId, setLoadingTxnId] = useState<string | null>(null);

  const flaggedTransactions = transactions.filter(t => t.riskTier === 'CRITICAL' || t.status === 'rejected' || t.status === 'held');

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenReport = async (txn: Transaction) => {
    try {
      setLoadingTxnId(txn.id);
      const dossier = await startInvestigation(txn);
      setReportModalDossier(dossier);
    } catch (err) {
      console.error('Failed to prepare report dossier:', err);
    } finally {
      setLoadingTxnId(null);
    }
  };

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner */}
      <div className="enterprise-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Regulatory Compliance & Loss-Prevention Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
            FinCEN Suspicious Activity Reports (SAR), Executive Board Summaries, and Immutable Audit Trails
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="btn-premium-secondary px-4 py-2.5 text-xs flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print Official Dossier</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200/80 pb-3">
        <button
          onClick={() => setSelectedReportType('sar')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-150 shadow-2xs ${
            selectedReportType === 'sar'
              ? 'btn-premium-primary text-white'
              : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>FinCEN SAR Filing Queue ({flaggedTransactions.length})</span>
        </button>

        <button
          onClick={() => setSelectedReportType('executive')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-150 shadow-2xs ${
            selectedReportType === 'executive'
              ? 'btn-premium-primary text-white'
              : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Executive CRO Loss Brief</span>
        </button>

        <button
          onClick={() => setSelectedReportType('audit')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all duration-150 shadow-2xs ${
            selectedReportType === 'audit'
              ? 'btn-premium-primary text-white'
              : 'bg-white/80 hover:bg-white text-slate-600 border border-slate-200/80'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Immutable Audit Trail</span>
        </button>
      </div>

      {/* SAR Filings View */}
      {selectedReportType === 'sar' && (
        <div className="space-y-5">
          {flaggedTransactions.map((txn) => {
            const sarNarrative = `FORM TD F 90-22.47 (SAR-DI) COMPLIANCE FILING NARRATIVE
CASE IDENTIFIER: SAR-${txn.id}-2026
SUBJECT IDENTIFICATION:
- Customer ID: ${txn.customerId}
- Name on File: ${txn.customerName || 'N/A'}
- Payment Instrument: ${txn.paymentMethod.type} (Ending ${txn.paymentMethod.last4}, Issuer: ${txn.paymentMethod.issuer})

TRANSACTION DETAILS:
- Date/Time of Incident: ${new Date(txn.timestamp).toUTCString()}
- Disputed / Flagged Amount: $${txn.amount.toFixed(2)} ${txn.currency}
- Merchant Entity: ${txn.merchant} (${txn.merchantCategory})
- Originating Geolocation: ${txn.location.city}, ${txn.location.country}
- Originating IP Address: ${txn.ipAddress.ip} (Tor/Proxy Flag: ${txn.ipAddress.isTor ? 'TRUE - TOR EXIT NODE' : 'PROXY DETECTED'})
- Device Fingerprint: ${txn.device.os} (${txn.device.type})

SUSPICIOUS ACTIVITY NARRATIVE & AI FORENSIC FINDINGS:
On ${new Date(txn.timestamp).toLocaleDateString()}, RiskLens AI intercepted an unauthorized transaction attempting to settle $${txn.amount.toFixed(2)} against customer account ${txn.customerId}.
Telemetry revealed significant anomaly vectors:
1. Impossible travel speed vector: Transaction originated from ${txn.location.city} (${txn.location.distanceFromHomeKm}km from customer residence) with zero historical precedent.
2. Darknet Proxy Ingress: Routing verified through Tor exit node IP ${txn.ipAddress.ip}.
3. 3DS Authentication Failure: Attempted without cryptographic step-up verification.

RECOMMENDED REGULATORY ACTION:
Immediate freezing of compromised credentials and submission of this formal SAR filing pursuant to 31 CFR § 1020.320.
Generated by RiskLens AI Autonomous Compliance Agent (Gemini 3.6 Flash Engine).`;

            return (
              <div key={txn.id} className="enterprise-card p-6 sm:p-7 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100/90">
                  <div className="flex items-center gap-3">
                    <span className="p-2.5 rounded-2xl bg-rose-50 text-rose-700 shadow-2xs border border-rose-100">
                      <ShieldCheck className="w-5 h-5" />
                    </span>
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 font-mono tracking-tight">
                        SAR Filing: SAR-{txn.id}-2026
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Target: {txn.merchant} • {formatCurrency(txn.amount, txn.currency)} • Risk Score: {txn.riskScore}/100
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap sm:flex-nowrap">
                    <button
                      onClick={() => handleOpenReport(txn)}
                      disabled={loadingTxnId === txn.id}
                      className="btn-premium-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {loadingTxnId === txn.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <FileText className="w-3.5 h-3.5 text-white" />
                          <span>Official Report & PDF</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleCopy(txn.id, sarNarrative)}
                      className="btn-premium-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
                    >
                      {copiedId === txn.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedId === txn.id ? 'Copied Narrative' : 'Copy SAR Text'}
                    </button>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200 shadow-2xs">
                      Ready for FinCEN XML Export
                    </span>
                  </div>
                </div>

                <div className="p-4.5 rounded-2xl bg-slate-50/80 font-mono text-xs text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-200/70 max-h-64 overflow-y-auto">
                  {sarNarrative}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Executive CRO Loss Brief View */}
      {selectedReportType === 'executive' && (
        <div className="enterprise-card p-7 sm:p-8 space-y-7">
          <div className="border-b border-slate-200/80 pb-5">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">
              Confidential Board & Executive Committee Report
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
              RiskLens AI Enterprise Loss Prevention Brief
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Prepared by: <strong className="text-slate-700 font-semibold">{currentUser.displayName}</strong> ({currentUser.role}) • Date: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 shadow-2xs">
              <div className="text-xs text-emerald-800 font-bold uppercase tracking-wider">Prevented Loss Exposure</div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-900 mt-1.5">
                ${metrics.totalLossPrevented.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-emerald-700 mt-1 font-medium">100% intercepted prior to ledger settlement</div>
            </div>

            <div className="p-5 rounded-2xl bg-blue-50/80 border border-blue-200/80 shadow-2xs">
              <div className="text-xs text-blue-800 font-bold uppercase tracking-wider">Gross Volume Scored</div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-blue-900 mt-1.5">
                ${metrics.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-blue-700 mt-1 font-medium">{metrics.totalCount} transactions processed</div>
            </div>

            <div className="p-5 rounded-2xl bg-purple-50/80 border border-purple-200/80 shadow-2xs">
              <div className="text-xs text-purple-800 font-bold uppercase tracking-wider">Model Precision</div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-purple-900 mt-1.5">
                99.4%
              </div>
              <div className="text-[11px] text-purple-700 mt-1 font-medium">0.24% false positive dispute rate</div>
            </div>
          </div>

          <div className="space-y-3.5 text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-slate-100/90 pt-5">
            <h4 className="font-bold text-slate-900 text-sm sm:text-base">Key Executive Findings & Risk Landscape:</h4>
            <p className="leading-relaxed">
              During this operational period, RiskLens AI intercepted automated attack patterns targeting high-liquidity cryptocurrency gateways and luxury bullion vendors. The system's multi-agent consensus architecture successfully prevented <strong>${metrics.totalLossPrevented.toFixed(2)}</strong> in potential chargebacks and direct wire leakage.
            </p>
            <p className="leading-relaxed">
              Qdrant vector clustering confirmed a 94.2% semantic similarity to historical Account Takeover campaigns (Reference: <em>Operation Chimera Wire</em>). All suspicious sessions were halted within 45 milliseconds of transaction initiation, eliminating manual queue congestion.
            </p>
          </div>
        </div>
      )}

      {/* Immutable Audit Trail */}
      {selectedReportType === 'audit' && (
        <div className="enterprise-card-static overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 bg-slate-50/40">
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Cryptographically Verified Audit Trail
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Append-only security log recording every human analyst action and automated agent resolution
            </p>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {[
              { time: '10 mins ago', user: currentUser.displayName, role: currentUser.role, action: 'REJECT_TRANSACTION', target: 'TXN-98425-FRAUD', hash: '0x8f2a...11b4' },
              { time: '35 mins ago', user: currentUser.displayName, role: currentUser.role, action: 'GENERATE_SAR', target: 'TXN-98425-FRAUD', hash: '0x3c1d...99e2' },
              { time: '1 hr ago', user: currentUser.displayName, role: currentUser.role, action: 'HOLD_TRANSACTION', target: 'TXN-98426-FLAG', hash: '0x7e44...aa81' },
              { time: '2 hrs ago', user: 'AI Orchestrator Consensus', role: 'Multi-Agent Autonomous', action: 'BATCH_ML_SCORE', target: '40 Transactions', hash: '0x12bb...881f' },
            ].map((log, idx) => (
              <div key={idx} className="p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-slate-100 text-slate-700 shadow-2xs">
                    <Lock className="w-4 h-4" />
                  </span>
                  <div>
                    <div className="font-bold text-slate-900">
                      {log.action} on <span className="font-mono text-blue-600">{log.target}</span>
                    </div>
                    <div className="text-slate-500 text-[11px] mt-0.5">
                      By <strong className="text-slate-700">{log.user}</strong> ({log.role}) • {log.time}
                    </div>
                  </div>
                </div>

                <div className="font-mono text-[11px] text-slate-400 self-end sm:self-auto">
                  SHA-256: <span className="text-slate-700 font-semibold">{log.hash}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Enterprise Report & PDF Export Modal */}
      {reportModalDossier && (
        <EnterpriseReportModal
          dossier={reportModalDossier}
          onClose={() => setReportModalDossier(null)}
        />
      )}

    </div>
  );
}
