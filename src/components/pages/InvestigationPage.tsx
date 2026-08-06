import React, { useState, useEffect, useRef } from 'react';
import { useInvestigation } from '../../context/InvestigationContext';
import { useTransactions } from '../../context/TransactionContext';
import { useAuth } from '../../context/AuthContext';
import { Transaction, InvestigationDossier, AgentMetric } from '../../types';
import { RiskGauge } from '../common/RiskGauge';
import { ShapWaterfall } from '../common/ShapWaterfall';
import { AgentStatusBadge } from '../common/AgentStatusBadge';
import { QuickActionModal } from '../modals/QuickActionModal';
import { ExportDossierModal } from '../modals/ExportDossierModal';
import { FraudGraphModule } from '../graph/FraudGraphModule';
import { formatCurrency, formatRelativeDate, getRiskColorClasses } from '../../lib/utils';
import { 
  ShieldAlert, 
  Sparkles, 
  Database, 
  Layers, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  FileText, 
  Send, 
  Bot, 
  User, 
  Download, 
  Activity, 
  MapPin, 
  Smartphone, 
  Globe, 
  CreditCard,
  ShieldCheck,
  Zap,
  Network
} from 'lucide-react';

interface InvestigationPageProps {
  initialTransaction?: Transaction | null;
  onNavigateToDashboard: () => void;
}

export function InvestigationPage({ initialTransaction, onNavigateToDashboard }: InvestigationPageProps) {
  const { 
    activeDossier, 
    isInvestigating, 
    startInvestigation, 
    sendCopilotMessage, 
    isSendingMessage 
  } = useInvestigation();
  const { transactions } = useTransactions();
  const { currentUser } = useAuth();

  const [chatInput, setChatInput] = useState<string>('');
  const [selectedAgentForModal, setSelectedAgentForModal] = useState<AgentMetric | null>(null);
  const [showActionModal, setShowActionModal] = useState<boolean>(false);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [investigationViewMode, setInvestigationViewMode] = useState<'dossier' | 'graph'>('dossier');

  const hasInitializedRef = useRef<boolean>(false);

  // If no active dossier, pick the first flagged transaction or initialTransaction on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    if (!activeDossier && !isInvestigating) {
      const target = initialTransaction || transactions.find(t => t.riskTier === 'CRITICAL' || t.riskTier === 'HIGH') || transactions[0];
      if (target) {
        hasInitializedRef.current = true;
        startInvestigation(target);
      }
    }
  }, [initialTransaction, activeDossier, isInvestigating, transactions, startInvestigation]);

  // When initialTransaction explicitly changes from outside
  useEffect(() => {
    if (initialTransaction && activeDossier?.transaction.id !== initialTransaction.id && !isInvestigating) {
      startInvestigation(initialTransaction);
    }
  }, [initialTransaction?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isSendingMessage) return;
    const msg = chatInput;
    setChatInput('');
    await sendCopilotMessage(msg);
  };

  const handleSelectAnotherTransaction = async (txn: Transaction) => {
    await startInvestigation(txn);
  };

  if (isInvestigating && !activeDossier) {
    return (
      <div className="min-h-[520px] flex flex-col items-center justify-center p-8 enterprise-card text-center space-y-5">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-blue-50/90 flex items-center justify-center text-blue-600 shadow-md">
            <Layers className="w-8 h-8 animate-spin" />
          </div>
          <Sparkles className="w-5 h-5 text-amber-500 absolute -top-1 -right-1 animate-bounce" />
        </div>
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Orchestrating Multi-Agent AI Investigation Engine...
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1.5 leading-relaxed">
            Running XGBoost ML inference, querying Qdrant vector memory, evaluating AML compliance rules, and synthesizing Gemini explainability rationale.
          </p>
        </div>
      </div>
    );
  }

  if (!activeDossier) {
    return (
      <div className="p-12 text-center enterprise-card space-y-4">
        <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">No Active Investigation Selected</h3>
        <p className="text-xs text-slate-500">Please select a transaction from the dashboard or queue to begin.</p>
        <button
          onClick={onNavigateToDashboard}
          className="btn-premium-primary px-5 py-2.5 text-xs inline-flex items-center gap-2"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { transaction, recommendation, explainability, compliance, similarCases, orchestrator } = activeDossier;
  const colors = getRiskColorClasses(transaction.riskTier);

  return (
    <div className="space-y-8 pb-16">
      
      {/* Top Banner: Case Header & Quick Resolution Trigger */}
      <div className="enterprise-card p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-slate-900 text-white shrink-0 shadow-sm ring-1 ring-slate-800">
            <ShieldAlert className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Case Dossier: <span className="font-mono text-blue-600">{transaction.id}</span>
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border shadow-2xs ${colors.badge}`}>
                {transaction.riskTier} RISK ({transaction.riskScore}/100)
              </span>
              <span className="text-xs text-slate-400 font-mono font-medium">
                {activeDossier.id}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
              Customer: <strong className="text-slate-800 font-semibold">{transaction.customerName || transaction.customerId}</strong> • Merchant: <strong className="text-slate-800 font-semibold">{transaction.merchant}</strong> • Amount: <strong className="font-mono text-slate-900 font-bold">{formatCurrency(transaction.amount, transaction.currency)}</strong>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100/90 border border-slate-200/90 rounded-xl p-1 shadow-2xs">
            <button
              onClick={() => setInvestigationViewMode('dossier')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                investigationViewMode === 'dossier'
                  ? 'bg-white text-blue-700 shadow-xs border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Dossier View</span>
            </button>
            <button
              onClick={() => setInvestigationViewMode('graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                investigationViewMode === 'graph'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Relationship Graph</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-blue-400/30 text-blue-100">
                NEW
              </span>
            </button>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="btn-premium-secondary px-4 py-2 text-xs flex items-center gap-2 border-blue-200 hover:border-blue-300 shadow-xs"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-800">Enterprise Report & PDF</span>
          </button>
          
          <button
            onClick={() => setShowActionModal(true)}
            className="btn-premium-primary px-4.5 py-2 text-xs flex items-center gap-2"
          >
            <Lock className="w-4 h-4 text-amber-300" />
            <span>Execute Action ({recommendation.action})</span>
          </button>
        </div>
      </div>

      {investigationViewMode === 'graph' ? (
        <div className="pt-2">
          <FraudGraphModule initialTransaction={transaction} />
        </div>
      ) : (
        <>
          {/* 8 Autonomous AI Agents Consensus Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Multi-Agent AI Investigation Consensus Pipeline
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-600 bg-white/90 border border-slate-200/80 px-2.5 py-0.5 rounded-full font-semibold shadow-2xs">
                Pipeline Latency: {orchestrator.totalDurationMs}ms
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {orchestrator.metrics.map((m) => (
                <AgentStatusBadge
                  key={m.id}
                  metric={m}
                  onClick={() => setSelectedAgentForModal(m)}
                  isActive={selectedAgentForModal?.id === m.id}
                />
              ))}
            </div>
          </div>

      {/* Middle Grid: Core ML Explainability & Evidence Deep Dive */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (8 cols): SHAP Waterfall + Gemini Plain-English Narrative */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Machine Learning & SHAP Breakdown Card */}
          <div className="enterprise-card p-6 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100/90 mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 shadow-2xs border border-rose-100">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    Feature Attribution & Decision Boundary
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Calculated by XGBoost Gradient Boosted Trees Ensemble (AUC: 0.984)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <RiskGauge score={transaction.riskScore} tier={transaction.riskTier} confidence={transaction.confidenceScore} size="sm" showLabel={false} />
                <div className="text-right">
                  <span className="text-lg font-extrabold font-mono text-slate-900">
                    {transaction.riskScore}/100
                  </span>
                  <div className="text-[11px] font-semibold text-slate-500">
                    {(transaction.confidenceScore * 100).toFixed(0)}% Model Confidence
                  </div>
                </div>
              </div>
            </div>

            <ShapWaterfall factors={explainability.shapValues} />
          </div>

          {/* Gemini Plain-English Explainability Narrative */}
          <div className="enterprise-card p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-50 text-purple-600 shadow-2xs border border-purple-100">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    Plain-English Explainability & Forensic Rationale
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generated autonomously by Google Gemini 3.6 Flash Explainability Agent
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                Auditable Rationale
              </span>
            </div>

            {/* Plain English Summary Block */}
            <div className="p-4.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 text-xs text-slate-800 leading-relaxed space-y-2">
              <div className="font-bold text-slate-900 uppercase tracking-wider text-[10px]">
                Investigator Executive Rationale
              </div>
              <p className="leading-relaxed text-slate-700">{explainability.plainEnglishSummary}</p>
            </div>

            {/* Key Drivers vs Mitigating Factors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Key Risk Drivers */}
              <div className="p-4.5 rounded-2xl bg-rose-50/50 border border-rose-200/70">
                <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-rose-900 uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Key Suspicious Drivers ({explainability.keyRiskDrivers.length})</span>
                </div>
                <ul className="space-y-1.5 text-xs text-rose-900/90">
                  {explainability.keyRiskDrivers.map((driver, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{driver}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Mitigating Factors */}
              <div className="p-4.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/70">
                <div className="flex items-center gap-2 mb-2.5 text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Mitigating Legitimate Evidence ({explainability.mitigatingFactors.length})</span>
                </div>
                <ul className="space-y-1.5 text-xs text-emerald-900/90">
                  {explainability.mitigatingFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            {/* Compliance & Regulatory Checklist */}
            <div className="p-4.5 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Regulatory Compliance & AML Mandate Evaluation
                </span>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] shadow-2xs ${
                  compliance.sarRequired ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {compliance.sarRequired ? 'SAR FILING REQUIRED' : 'COMPLIANCE CLEAR'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">AML Trigger</div>
                  <div className={`font-bold mt-1 ${compliance.amlTriggered ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {compliance.amlTriggered ? 'FLAGGED' : 'PASSED'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">OFAC Sanctions</div>
                  <div className={`font-bold mt-1 ${compliance.sanctionsMatch ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {compliance.sanctionsMatch ? 'MATCHED' : 'CLEARED'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">Reg E Protection</div>
                  <div className="font-bold mt-1 text-slate-800">
                    {compliance.regECompliant ? 'ACTIVE HOLD' : 'STANDARD'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-white/90 border border-slate-200/80 shadow-2xs">
                  <div className="text-[10px] text-slate-400 uppercase font-bold">PSD3 / SCA 3DS</div>
                  <div className={`font-bold mt-1 ${transaction.paymentMethod.is3DSecure ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {transaction.paymentMethod.is3DSecure ? 'AUTHENTICATED' : 'STEP-UP REQ'}
                  </div>
                </div>
              </div>

              {compliance.triggeredRules.length > 0 && (
                <div className="pt-2.5 border-t border-slate-200/60 text-xs text-slate-600 space-y-1">
                  <span className="font-semibold text-slate-800">Triggered Rules:</span>
                  {compliance.triggeredRules.map((rule, idx) => (
                    <div key={idx} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold">›</span>
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

          {/* Qdrant Vector Semantic Similar Fraud Cases */}
          <div className="enterprise-card p-6 sm:p-7 space-y-4">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100/90">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs border border-indigo-100">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                    Qdrant Vector Similar Case Retrieval
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dense vector nearest-neighbor search across indexed historical fraud incidents
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200 shadow-2xs">
                Index: {similarCases.vectorIndex}
              </span>
            </div>

            <div className="space-y-3">
              {similarCases.topMatches.map((c) => (
                <div
                  key={c.id}
                  className="p-4.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 transition-all text-xs space-y-2 hover:shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-indigo-700">{c.caseNumber}</span>
                      <span className="font-bold text-slate-900">{c.title}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-[11px]">
                        {(c.similarityScore * 100).toFixed(1)}% Vector Similarity
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-600 leading-relaxed">
                    {c.vectorEmbeddingSummary || c.keyTakeaway}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>Typology: <strong className="text-slate-700">{c.fraudType}</strong></span>
                      <span>Action: <strong className="text-emerald-600">{c.historicalActionTaken}</strong></span>
                    </div>
                    <span className="font-mono font-bold text-emerald-700">
                      Loss Prevented: ${c.preventedLossAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right Column (4 cols): Telemetry Specs + Interactive AI Copilot Chat */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Transaction Metadata & Device Telemetry Card */}
          <div className="enterprise-card p-5.5 space-y-3.5 text-xs">
            <h3 className="font-bold text-slate-900 pb-2.5 border-b border-slate-100/90 uppercase tracking-wider text-[11px]">
              Raw Transaction Telemetry
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  Amount:
                </span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(transaction.amount, transaction.currency)}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Location:
                </span>
                <span className="font-medium text-slate-800 text-right">
                  {transaction.location.city}, {transaction.location.country} ({transaction.location.distanceFromHomeKm}km)
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  IP & Proxy:
                </span>
                <span className="font-medium text-slate-800 text-right">
                  {transaction.ipAddress.ip} {transaction.ipAddress.isTor ? '(Tor Exit)' : (transaction.ipAddress.isProxy ? '(Proxy)' : '(Clean ISP)')}
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  Device & OS:
                </span>
                <span className="font-medium text-slate-800 text-right">
                  {transaction.device.os} ({transaction.device.type})
                </span>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Card Token:
                </span>
                <span className="font-mono text-slate-800">
                  •••• {transaction.paymentMethod.last4} ({transaction.paymentMethod.issuer})
                </span>
              </div>
            </div>
          </div>

          {/* Interactive RiskLens AI Copilot Chat */}
          <div className="enterprise-card p-0 flex flex-col h-[540px] overflow-hidden">
            
            {/* Copilot Header */}
            <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    RiskLens AI Copilot
                  </h4>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Forensic Assistant • Powered by Gemini
                  </p>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Chat Messages Log */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/30 text-xs">
              {activeDossier.chatHistory.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex items-start gap-2.5 ${
                    msg.sender === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    msg.sender === 'user' ? 'bg-slate-900 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {msg.sender === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none shadow-2xs'
                      : 'bg-white border border-slate-200/90 text-slate-800 shadow-2xs rounded-tl-none'
                  }`}>
                    {msg.agentName && (
                      <div className="font-bold text-[10px] text-blue-600 mb-1">
                        {msg.agentName}
                      </div>
                    )}
                    <p className="text-[11px] whitespace-pre-wrap">{msg.message}</p>
                    <div className={`text-[9px] mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'} text-right`}>
                      {formatRelativeDate(msg.timestamp)}
                    </div>
                  </div>
                </div>
              ))}

              {isSendingMessage && (
                <div className="flex items-center gap-2 text-slate-400 text-xs italic">
                  <Bot className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Synthesizing multi-agent forensic insight...</span>
                </div>
              )}
            </div>

            {/* Quick Prompt Suggestions */}
            <div className="px-3 py-2 border-t border-slate-100 bg-white/90 flex items-center gap-1.5 overflow-x-auto shrink-0 text-[11px]">
              <button
                type="button"
                onClick={() => sendCopilotMessage("Why was this transaction flagged?")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 transition-colors font-medium"
              >
                Why flagged?
              </button>
              <button
                type="button"
                onClick={() => sendCopilotMessage("What is the IP proxy threat risk?")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 transition-colors font-medium"
              >
                IP Reputation
              </button>
              <button
                type="button"
                onClick={() => sendCopilotMessage("Should I freeze the customer card token?")}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 shrink-0 transition-colors font-medium"
              >
                Freeze card?
              </button>
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask investigator copilot anything..."
                className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800"
              />
              <button
                type="submit"
                disabled={isSendingMessage || !chatInput.trim()}
                className="btn-premium-primary p-2 text-white disabled:opacity-50 transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

          </div>

          {/* Quick Transaction Switcher */}
          <div className="enterprise-card p-5 space-y-2.5 text-xs">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
              Switch Active Case in Queue
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {transactions.filter(t => t.id !== transaction.id).slice(0, 5).map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelectAnotherTransaction(t)}
                  className="w-full p-2.5 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors border border-slate-200/70"
                >
                  <div>
                    <div className="font-bold text-slate-900 font-mono text-[11px]">{t.id}</div>
                    <div className="text-[10px] text-slate-500 truncate">{t.merchant} • {formatCurrency(t.amount, t.currency)}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    t.riskTier === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {t.riskScore}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
      </>
      )}

      {/* Quick Action Modal */}
      {showActionModal && (
        <QuickActionModal
          transaction={transaction}
          recommendation={recommendation}
          onClose={() => setShowActionModal(false)}
        />
      )}

      {/* Export Dossier Modal */}
      {showExportModal && (
        <ExportDossierModal
          dossier={activeDossier}
          onClose={() => setShowExportModal(false)}
        />
      )}

    </div>
  );
}
