import React, { useState, useRef } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { parseCsvToTransactions, generateSampleCsv } from '../../lib/csv_parser';
import { Transaction } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Download, 
  ArrowRight,
  Database,
  Layers,
  Activity
} from 'lucide-react';

interface UploadPageProps {
  onNavigateToDashboard: () => void;
  onNavigateToInvestigation: (txn: Transaction) => void;
}

export function UploadPage({ onNavigateToDashboard, onNavigateToInvestigation }: UploadPageProps) {
  const { ingestBatch } = useTransactions();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<Transaction[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessCount(null);
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const txns = parseCsvToTransactions(text);
      if (txns.length === 0) {
        setErrorMsg('No valid transaction rows found in CSV. Please verify column headers.');
        setParsedPreview([]);
      } else {
        setParsedPreview(txns);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to parse CSV file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleLoadSample = (scenario: 'high_risk' | 'ecommerce' | 'mixed') => {
    const csvContent = generateSampleCsv(scenario);
    const txns = parseCsvToTransactions(csvContent);
    setFileName(`sample_${scenario}_fraud_dataset.csv`);
    setParsedPreview(txns);
    setErrorMsg(null);
    setSuccessCount(null);
  };

  const handleDownloadTemplate = () => {
    const csvContent = generateSampleCsv('mixed');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'risklens_fraud_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleIngestToQueue = async () => {
    if (parsedPreview.length === 0) return;
    setIsProcessing(true);
    try {
      await ingestBatch(parsedPreview);
      setSuccessCount(parsedPreview.length);
      setParsedPreview([]);
    } catch (err: any) {
      setErrorMsg('Failed to ingest batch into active database.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Page Header */}
      <div className="enterprise-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Financial Transaction Dataset Ingestion
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
            Ingest structured banking, wire, or payment logs for automated ML scoring & multi-agent AI consensus analysis
          </p>
        </div>
        <button
          onClick={handleDownloadTemplate}
          className="btn-premium-secondary px-4 py-2.5 text-xs flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Download Standard CSV Template</span>
        </button>
      </div>

      {/* Preset Dataset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        <div className="enterprise-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 shadow-2xs border border-rose-100">
                <AlertCircle className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                High Risk
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Wire & Crypto Exfiltration Dataset
            </h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Simulates large-scale account takeovers with Tor exit routing, high-value wire transfers, and crypto liquidation.
            </p>
          </div>
          <button
            onClick={() => handleLoadSample('high_risk')}
            className="mt-5 w-full py-2.5 rounded-xl bg-slate-50/90 hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200/90 transition-all duration-150 shadow-2xs hover:shadow-xs"
          >
            Load 25 High-Risk Cases
          </button>
        </div>

        <div className="enterprise-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-2xl bg-amber-50 text-amber-600 shadow-2xs border border-amber-100">
                <Layers className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                Card-Not-Present
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              E-Commerce Velocity Attacks
            </h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Simulates rapid bot-driven checkouts, card testing, and device fingerprint spoofing across electronics merchants.
            </p>
          </div>
          <button
            onClick={() => handleLoadSample('ecommerce')}
            className="mt-5 w-full py-2.5 rounded-xl bg-slate-50/90 hover:bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200/90 transition-all duration-150 shadow-2xs hover:shadow-xs"
          >
            Load 30 CNP Test Cases
          </button>
        </div>

        <div className="enterprise-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 shadow-2xs border border-blue-100">
                <Database className="w-4 h-4" />
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                Mixed Production
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Production FinTech Baseline
            </h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Realistic blend of 90% legitimate everyday purchases and 10% sophisticated multi-vector attacks.
            </p>
          </div>
          <button
            onClick={() => handleLoadSample('mixed')}
            className="mt-5 w-full py-2.5 rounded-xl bg-slate-50/90 hover:bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200/90 transition-all duration-150 shadow-2xs hover:shadow-xs"
          >
            Load 40 Mixed Cases
          </button>
        </div>

      </div>

      {/* Upload Drag and Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`enterprise-card border-2 border-dashed p-10 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50/60 scale-[1.008]'
            : 'border-slate-200/90 hover:border-blue-400/80 hover:bg-slate-50/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />

        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 text-blue-600 mx-auto flex items-center justify-center mb-4 shadow-2xs border border-blue-100">
          <UploadCloud className="w-8 h-8" />
        </div>

        <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
          Drag and drop your financial transaction CSV file here
        </h3>
        <p className="text-xs sm:text-sm text-slate-500 mt-1.5 max-w-md mx-auto leading-relaxed">
          Supports transaction ID, amount, merchant, customer ID, IP address, device specs, distance, and 3DS flags.
        </p>

        <div className="mt-5 inline-flex items-center gap-2 btn-premium-primary px-5 py-2.5 text-xs shadow-md">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Browse Local Files</span>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successCount !== null && (
        <div className="p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs sm:text-sm text-emerald-900">
              <span className="font-bold">Batch Ingestion Complete: </span>
              Successfully ML-scored and indexed {successCount} transactions into the real-time queue.
            </div>
          </div>
          <button
            onClick={onNavigateToDashboard}
            className="btn-premium-primary px-4 py-2 text-xs self-start sm:self-auto flex items-center gap-1.5 !bg-emerald-600 hover:!bg-emerald-700 shadow-emerald-500/30"
          >
            <span>View in Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50/90 border border-rose-200 flex items-center gap-3 text-xs sm:text-sm text-rose-800 shadow-2xs">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Parsed Transactions Preview */}
      {parsedPreview.length > 0 && (
        <div className="enterprise-card-static overflow-hidden">
          
          <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Ready to Ingest: {parsedPreview.length} Transactions ({fileName})
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                All transactions pre-scored with XGBoost ML inference & SHAP feature decomposition.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setParsedPreview([])}
                className="btn-premium-secondary px-3.5 py-2 text-xs"
              >
                Clear Preview
              </button>
              <button
                onClick={handleIngestToQueue}
                disabled={isProcessing}
                className="btn-premium-primary px-5 py-2 text-xs flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                <span>{isProcessing ? 'Ingesting...' : `Commit ${parsedPreview.length} Txns to Stream`}</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/80 sticky top-0">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Risk Score</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3">Proxy / Bot</th>
                  <th className="px-4 py-3 text-right">Preview Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {parsedPreview.slice(0, 15).map((txn) => (
                  <tr key={txn.id} className="hover:bg-blue-50/30">
                    <td className="px-4 py-3 font-bold text-slate-900">{txn.id}</td>
                    <td className="px-4 py-3 text-slate-700">{txn.customerName || txn.customerId}</td>
                    <td className="px-4 py-3 text-slate-800 font-sans">{txn.merchant}</td>
                    <td className="px-4 py-3 font-bold text-slate-900">{formatCurrency(txn.amount, txn.currency)}</td>
                    <td className="px-4 py-3 font-sans">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        txn.riskScore >= 75 ? 'bg-rose-100 text-rose-800' : (txn.riskScore >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                      }`}>
                        {txn.riskScore}/100 ({txn.riskTier})
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-600">{txn.location.city}, {txn.location.country}</td>
                    <td className="px-4 py-3 font-sans">
                      {txn.ipAddress.isTor ? <span className="text-rose-600 font-bold">Tor Exit</span> : (txn.ipAddress.isProxy ? <span className="text-amber-600 font-semibold">Proxy</span> : <span className="text-slate-400">Direct</span>)}
                    </td>
                    <td className="px-4 py-3 text-right font-sans">
                      <button
                        onClick={() => onNavigateToInvestigation(txn)}
                        className="text-blue-600 hover:text-blue-800 font-bold hover:underline"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
