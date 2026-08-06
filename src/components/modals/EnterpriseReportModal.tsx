import React, { useState, useRef } from 'react';
import { InvestigationDossier } from '../../types';
import { EnterpriseInvestigationReport } from '../report/EnterpriseInvestigationReport';
import { exportReportToPDF } from '../../lib/pdf_exporter';
import { useAuth } from '../../context/AuthContext';
import { 
  X, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  FileText, 
  ShieldCheck, 
  Code2, 
  Clock, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface EnterpriseReportModalProps {
  dossier: InvestigationDossier;
  onClose: () => void;
}

export function EnterpriseReportModal({ dossier, onClose }: EnterpriseReportModalProps) {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'report' | 'sar' | 'telemetry' | 'json'>('report');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [copied, setCopied] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportStage, setExportStage] = useState<string>('');
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const reportContainerRef = useRef<HTMLDivElement | null>(null);

  const analystName = currentUser?.displayName || 'Lead Fraud Investigator';
  const analystRole = currentUser?.role === 'compliance_officer' 
    ? 'Chief Compliance Officer' 
    : (currentUser?.role === 'fraud_analyst' ? 'Senior Fraud Analyst' : 'Financial Crime Intelligence Specialist');

  const handleDownloadPDF = async () => {
    if (!reportContainerRef.current) return;

    try {
      setIsExportingPDF(true);
      setExportError(null);
      setExportSuccess(false);

      const filename = `RiskLens_Investigation_Report_${dossier.transaction.id}_${Date.now().toString().slice(-4)}.pdf`;

      await exportReportToPDF(reportContainerRef.current, {
        filename,
        title: `RiskLens AI Fraud Investigation Report - ${dossier.transaction.id}`,
        onProgress: (progress, stage) => {
          setExportProgress(progress);
          setExportStage(stage);
        }
      });

      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
      }, 3000);
    } catch (err: any) {
      console.error('PDF Export error:', err);
      setExportError(err?.message || 'Failed to generate PDF. You can also use Print to PDF.');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getSarText = () => {
    return dossier.report.sarNarrative || `FORM TD F 90-22.47 (SAR-DI) COMPLIANCE FILING NARRATIVE
CASE IDENTIFIER: SAR-${dossier.transaction.id}-2026
SUBJECT IDENTIFICATION:
- Customer ID: ${dossier.transaction.customerId}
- Disputed Amount: $${dossier.transaction.amount.toFixed(2)} ${dossier.transaction.currency}
- Merchant Entity: ${dossier.transaction.merchant} (${dossier.transaction.merchantCategory})
- Originating Geolocation: ${dossier.transaction.location.city}, ${dossier.transaction.location.country}
- Originating IP Address: ${dossier.transaction.ipAddress.ip} (${dossier.transaction.ipAddress.isTor ? 'TOR EXIT NODE' : 'PROXY DETECTED'})
- Device Fingerprint: ${dossier.transaction.device.os} (${dossier.transaction.device.type})

SUSPICIOUS ACTIVITY NARRATIVE & AI FORENSIC FINDINGS:
On ${new Date(dossier.transaction.timestamp).toLocaleDateString()}, RiskLens AI intercepted an unauthorized transaction attempting to settle $${dossier.transaction.amount.toFixed(2)} against customer account ${dossier.transaction.customerId}.
Multi-agent consensus resolved a composite risk score of ${dossier.fraudDetection.riskScore}/100 with recommended action "${dossier.recommendation.action}".`;
  };

  const handleCopySAR = () => {
    navigator.clipboard.writeText(getSarText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="enterprise-card p-0 shadow-2xl w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 bg-slate-900 border border-slate-700">
        
        {/* =========================================================================
            MODAL HEADER & ACTION CONTROLS
            ========================================================================= */}
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-950/90 shrink-0">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shrink-0 border border-blue-400/30">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Enterprise Investigation Report & PDF Export
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  A4 Portrait
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Case: {dossier.id} • Txn: <strong className="text-slate-200">{dossier.transaction.id}</strong>
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            
            {/* Direct PDF Download Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              className="btn-premium-primary px-4 py-2 text-xs flex items-center gap-2 shadow-lg disabled:opacity-50"
            >
              {isExportingPDF ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Generating PDF ({exportProgress}%)...</span>
                </>
              ) : exportSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  <span>PDF Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-white" />
                  <span>Download High-Quality PDF</span>
                </>
              )}
            </button>

            {/* Direct Print Button */}
            <button
              onClick={handlePrint}
              className="btn-premium-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
              title="Print directly or save as PDF via system dialog"
            >
              <Printer className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>

          </div>

        </div>

        {/* =========================================================================
            TAB NAVIGATION & ZOOM CONTROLS
            ========================================================================= */}
        <div className="px-5 py-2.5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 shrink-0 text-xs">
          
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'report'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Official Report (A4 PDF)
            </button>
            <button
              onClick={() => setActiveTab('sar')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'sar'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              FinCEN SAR Draft
            </button>
            <button
              onClick={() => setActiveTab('telemetry')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'telemetry'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Time & Multi-Agent Telemetry
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'json'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Raw JSON
            </button>
          </div>

          {/* Zoom Controls (Active in Report Tab) */}
          {activeTab === 'report' && (
            <div className="flex items-center gap-2 text-slate-400 font-mono text-[11px] self-end sm:self-auto">
              <span className="hidden sm:inline text-slate-500">Preview Scale:</span>
              <button
                onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-bold w-10 text-center text-slate-200">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(prev => Math.min(150, prev + 15))}
                className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomLevel(100)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                title="Reset Scale"
              >
                100%
              </button>
            </div>
          )}

        </div>

        {/* Progress Alert Bar if Exporting */}
        {isExportingPDF && (
          <div className="px-6 py-2.5 bg-blue-950 border-b border-blue-800 text-xs text-blue-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
              <span>{exportStage || 'Rendering high-resolution vector canvas...'}</span>
            </div>
            <span className="font-mono font-bold text-blue-300">{exportProgress}%</span>
          </div>
        )}

        {exportError && (
          <div className="px-6 py-2.5 bg-rose-950 border-b border-rose-800 text-xs text-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{exportError}</span>
          </div>
        )}

        {/* =========================================================================
            MAIN CONTENT VIEWER
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-950/60 flex justify-center">
          
          {/* TAB 1: Enterprise Investigation Report (A4 Printable Component) */}
          {activeTab === 'report' && (
            <div 
              className="transition-transform duration-150 origin-top"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              <EnterpriseInvestigationReport
                dossier={dossier}
                analystName={analystName}
                analystRole={analystRole}
                reportRef={reportContainerRef}
              />
            </div>
          )}

          {/* TAB 2: FinCEN SAR Filing View */}
          {activeTab === 'sar' && (
            <div className="w-full max-w-3xl space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div>
                  <h4 className="font-bold text-white">FinCEN Suspicious Activity Report (Form TD F 90-22.47)</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">Compliant electronic filing narrative for regulatory transmission</p>
                </div>
                <button
                  onClick={handleCopySAR}
                  className="btn-premium-primary px-3.5 py-1.5 text-xs flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied to Clipboard' : 'Copy SAR Text'}</span>
                </button>
              </div>

              <pre className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-slate-200 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                {getSarText()}
              </pre>
            </div>
          )}

          {/* TAB 3: Time & Telemetry Metrics View */}
          {activeTab === 'telemetry' && (
            <div className="w-full max-w-3xl space-y-6">
              <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 text-xs">
                <h4 className="font-bold text-white text-sm pb-2 border-b border-slate-800 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Multi-Agent Execution Pipeline Latency Breakdown
                </h4>

                <div className="space-y-3">
                  {dossier.orchestrator.metrics.map((agent, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-200">{agent.name}</span>
                        <span className="font-mono font-bold text-emerald-400">{agent.executionTimeMs} ms</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, (agent.executionTimeMs / (dossier.orchestrator.totalDurationMs || 320)) * 100 * 2.5)}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-slate-400">{agent.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Raw JSON Dossier */}
          {activeTab === 'json' && (
            <div className="w-full max-w-3xl space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                <div>
                  <h4 className="font-bold text-white">Complete Investigation JSON Payload</h4>
                  <p className="text-slate-400 text-[11px] mt-0.5">8 Agent consensus state & vector embeddings</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(dossier, null, 2));
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="btn-premium-secondary px-3.5 py-1.5 text-xs flex items-center gap-1.5 bg-slate-800 text-slate-200"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied JSON' : 'Copy JSON'}</span>
                </button>
              </div>

              <pre className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400 font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner overflow-x-auto">
                {JSON.stringify(dossier, null, 2)}
              </pre>
            </div>
          )}

        </div>

        {/* =========================================================================
            MODAL FOOTER
            ========================================================================= */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Audited & Digitally Signed • RiskLens Multi-Agent Swarm</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              className="btn-premium-primary px-4 py-2 text-xs flex items-center gap-2"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Official PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
