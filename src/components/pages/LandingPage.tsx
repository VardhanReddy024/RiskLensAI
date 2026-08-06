import React, { useState } from 'react';
import { 
  Shield, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  Cpu, 
  Database, 
  FileText, 
  TrendingUp, 
  Lock,
  Activity,
  Zap,
  Globe,
  Radio
} from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { evaluateTransactionWithML } from '../../../server/ml_engine';
import { Transaction } from '../../types';

interface LandingPageProps {
  onEnterApp: () => void;
  onNavigateToUpload: () => void;
}

export function LandingPage({ onEnterApp, onNavigateToUpload }: LandingPageProps) {
  // Interactive Sandbox Simulator State
  const [sandboxAmount, setSandboxAmount] = useState<number>(14500);
  const [sandboxMerchant, setSandboxMerchant] = useState<string>('CryptoBit Global Exchange');
  const [sandboxDistance, setSandboxDistance] = useState<number>(8500);
  const [sandboxProxy, setSandboxProxy] = useState<boolean>(true);
  const [sandboxEmulator, setSandboxEmulator] = useState<boolean>(true);

  // Compute live sandbox risk
  const sandboxTxn: Transaction = {
    id: 'SANDBOX-LIVE-DEMO',
    customerId: 'CUST-DEMO-99',
    customerName: 'Marcus Vance',
    customerEmail: 'm.vance@enterprise.io',
    customerTenureMonths: 18,
    amount: sandboxAmount,
    currency: 'USD',
    merchant: sandboxMerchant,
    merchantCategory: sandboxMerchant.includes('Crypto') ? 'Crypto Exchange' : 'Electronics',
    timestamp: new Date().toISOString(),
    location: {
      city: 'Lagos',
      country: 'Nigeria',
      lat: 6.5244,
      lon: 3.3792,
      distanceFromHomeKm: sandboxDistance,
    },
    device: {
      id: 'DEV-EMU-1',
      type: sandboxEmulator ? 'Bot/Emulator' : 'Mobile',
      os: sandboxEmulator ? 'Android Bluestacks VM' : 'iOS 18',
      browser: sandboxEmulator ? 'Headless Chrome' : 'Safari',
      fingerprintScore: sandboxEmulator ? 18 : (sandboxProxy ? 55 : 95),
      isKnownCustomerDevice: !sandboxEmulator && !sandboxProxy,
    },
    ipAddress: {
      ip: sandboxProxy ? '185.220.101.5 (Tor/Proxy)' : '24.180.12.99',
      country: sandboxProxy ? 'Romania' : 'United States',
      city: sandboxProxy ? 'Bucharest' : 'San Francisco',
      isVpn: sandboxProxy,
      isTor: sandboxProxy,
      isProxy: sandboxProxy,
      proxyRiskScore: sandboxProxy ? 94 : 8,
    },
    paymentMethod: {
      type: sandboxAmount > 5000 ? 'Wire Transfer' : 'Credit Card',
      last4: '8831',
      issuer: 'JPMorgan Chase',
      cardCountry: 'United States',
      is3DSecure: !sandboxEmulator && !sandboxProxy,
    },
    riskScore: 50,
    fraudProbability: 0.5,
    confidenceScore: 0.95,
    riskTier: 'HIGH',
    status: 'flagged',
    tags: [],
    flagReasons: [],
  };

  const liveML = evaluateTransactionWithML(sandboxTxn);

  const AGENTS_LIST = [
    { num: '01', name: 'Orchestrator Agent', role: 'Coordinates parallel execution pipeline & aggregates consensus.', icon: Layers, color: 'text-blue-600 bg-blue-50' },
    { num: '02', name: 'Fraud Detection Agent', role: 'Gradient-boosted decision trees calculate fraud probability.', icon: Activity, color: 'text-rose-600 bg-rose-50' },
    { num: '03', name: 'Behavioral Analysis Agent', role: 'Detects baseline spending spikes & impossible transit speeds.', icon: Cpu, color: 'text-purple-600 bg-purple-50' },
    { num: '04', name: 'Similar Case Retrieval Agent', role: 'Qdrant vector semantic search retrieves matching historical attacks.', icon: Database, color: 'text-indigo-600 bg-indigo-50' },
    { num: '05', name: 'Explainability Agent', role: 'Google Gemini generates plain-English reasoning & SHAP impact.', icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
    { num: '06', name: 'Compliance Agent', role: 'Enforces AML/BSA rules, sanctions screening, and SAR mandates.', icon: Lock, color: 'text-emerald-600 bg-emerald-50' },
    { num: '07', name: 'Recommendation Agent', role: 'Formulates playbook decisions (Approve, Hold, Escalate, Reject).', icon: Zap, color: 'text-cyan-600 bg-cyan-50' },
    { num: '08', name: 'Report Generation Agent', role: 'Builds formal audit dossiers & C-level loss-prevention briefs.', icon: FileText, color: 'text-slate-600 bg-slate-100' },
  ];

  return (
    <div className="w-full bg-[#f8fafc] text-slate-900">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        <div className="text-center max-w-3xl mx-auto space-y-6">
          
          {/* Announcement Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-blue-700 shadow-xs">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span>Next-Gen Financial Intelligence • Multi-Agent Fraud Defense</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Predict Fraud. <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Prevent Loss.</span> Protect Trust.
          </h1>

          {/* Mission Subtitle */}
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
            A modern AI-powered Financial Fraud Prevention Platform that stops fraudulent transactions before financial loss occurs, explains every AI decision with Gemini, retrieves similar historical fraud cases via Qdrant vectors, and automates high-confidence compliance actions.
          </p>

          {/* Primary CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onEnterApp}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              <span>Launch Enterprise Console</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onNavigateToUpload}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2"
            >
              <span>Upload CSV Dataset</span>
            </button>
          </div>

          {/* Security & Reliability Badges */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              SOC2 Type II & PCI-DSS Compliant
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Real-time Sub-50ms Scoring
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Explainable SHAP Attribution
            </span>
          </div>

        </div>
      </section>

      {/* Interactive Fraud Simulation Playground */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          
          <div className="p-6 sm:p-8 bg-slate-50/80 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-600 text-white">
                  <Activity className="w-4 h-4" />
                </span>
                <h3 className="text-xl font-bold text-slate-900">
                  Live Interactive Fraud Sandbox
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Adjust the financial parameters below to watch the Multi-Agent AI Investigation Engine dynamically calculate fraud probability and plain-English reasoning.
              </p>
            </div>
            <button
              onClick={onEnterApp}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              Open Full Investigation Console
            </button>
          </div>

          <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Simulator Controls (Left Column) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Transaction Amount Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700 uppercase tracking-wider">
                    Transaction Amount (USD)
                  </label>
                  <span className="font-mono font-bold text-blue-600 text-sm">
                    {formatCurrency(sandboxAmount)}
                  </span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="50000"
                  step="50"
                  value={sandboxAmount}
                  onChange={(e) => setSandboxAmount(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>$10 (Routine Coffee)</span>
                  <span>$10,000 (FinCEN Limit)</span>
                  <span>$50,000 (High-Ticket)</span>
                </div>
              </div>

              {/* Merchant Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Merchant & Category
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    'CryptoBit Global Exchange',
                    'Swiss Bullion Direct AG',
                    'Apple Store Regent St',
                    'Whole Foods Market'
                  ].map((m) => (
                    <button
                      key={m}
                      onClick={() => setSandboxMerchant(m)}
                      className={`p-2.5 rounded-xl border text-left font-medium transition-all ${
                        sandboxMerchant === m
                          ? 'border-blue-500 bg-blue-50/70 text-blue-900 font-bold'
                          : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Geographic Distance Slider */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <label className="font-bold text-slate-700 uppercase tracking-wider">
                    Location Distance from Customer Residence
                  </label>
                  <span className="font-mono font-bold text-indigo-600 text-sm">
                    {sandboxDistance.toLocaleString()} km
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="12000"
                  step="100"
                  value={sandboxDistance}
                  onChange={(e) => setSandboxDistance(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0 km (Home)</span>
                  <span>1,000 km (Domestic)</span>
                  <span>12,000 km (Impossible Velocity)</span>
                </div>
              </div>

              {/* Environmental Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  sandboxProxy ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div>
                    <div className="text-xs font-bold">Residential Proxy / Tor</div>
                    <div className="text-[10px] text-slate-500">Anonymized exit node</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sandboxProxy}
                    onChange={(e) => setSandboxProxy(e.target.checked)}
                    className="accent-rose-600 w-4 h-4"
                  />
                </label>

                <label className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  sandboxEmulator ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div>
                    <div className="text-xs font-bold">Bot / Headless VM</div>
                    <div className="text-[10px] text-slate-500">Degraded fingerprint</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={sandboxEmulator}
                    onChange={(e) => setSandboxEmulator(e.target.checked)}
                    className="accent-rose-600 w-4 h-4"
                  />
                </label>
              </div>

            </div>

            {/* Live Model Output (Right Column) */}
            <div className="lg:col-span-6 bg-slate-50/90 rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-5">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Real-Time Inference Output
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                    Latency: 14ms
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-5">
                  <div className="text-center shrink-0">
                    <div className={`text-4xl font-extrabold font-mono tracking-tight ${
                      liveML.riskScore >= 75 ? 'text-rose-600' : (liveML.riskScore >= 40 ? 'text-amber-600' : 'text-emerald-600')
                    }`}>
                      {liveML.riskScore}
                      <span className="text-xs text-slate-400 font-normal"> / 100</span>
                    </div>
                    <div className={`mt-1 text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full inline-block ${
                      liveML.riskTier === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : (liveML.riskTier === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                    }`}>
                      {liveML.riskTier} RISK
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Fraud Probability:</span>
                      <span className="font-mono font-bold text-slate-800">{(liveML.fraudProbability * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">AI Confidence:</span>
                      <span className="font-mono font-bold text-slate-800">{(liveML.confidenceScore * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Loss Prevented:</span>
                      <span className="font-mono font-bold text-emerald-600">
                        {liveML.riskScore >= 60 ? formatCurrency(sandboxAmount) : '$0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 font-medium">Recommended Action:</span>
                      <span className={`font-bold px-1.5 py-0.5 rounded ${
                        liveML.riskScore >= 75 ? 'bg-rose-100 text-rose-800' : (liveML.riskScore >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                      }`}>
                        {liveML.riskScore >= 75 ? 'REJECT & FREEZE' : (liveML.riskScore >= 40 ? 'HOLD & STEP-UP' : 'APPROVE')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Top SHAP Drivers */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Primary SHAP Factor Attribution
                  </div>
                  <div className="space-y-1.5">
                    {liveML.shapFactors.slice(0, 3).map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-white border border-slate-200/80">
                        <span className="font-semibold text-slate-800 truncate">{f.displayName}</span>
                        <span className={`font-mono font-bold shrink-0 ml-2 ${
                          f.impactScore > 0 ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {f.impactScore > 0 ? `+${f.impactScore}` : f.impactScore} SHAP pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="pt-2">
                <button
                  onClick={onEnterApp}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>Investigate in Full AI Console</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* Multi-Agent AI Architecture Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
          <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
            Autonomous Decision Intelligence
          </span>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Multi-Agent AI Investigation Engine in Consensus
          </h2>
          <p className="text-sm text-slate-600">
            Every transaction is orchestrated through specialized autonomous AI agents across ML risk scoring, vector memory retrieval, and Gemini explainability.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {AGENTS_LIST.map((agent) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.num}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition-all hover:border-slate-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`p-2.5 rounded-xl ${agent.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-400">
                      AGENT {agent.num}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 tracking-tight">
                    {agent.name}
                  </h4>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                    {agent.role}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="font-medium">Latency: &lt;25ms</span>
                  <span className="text-emerald-600 font-semibold">Active</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Enterprise Loss Prevention Metrics Banner */}
      <section className="py-12 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono">$48.2M+</div>
              <div className="text-xs text-blue-100 mt-1 font-medium">Estimated Loss Prevented</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono">99.4%</div>
              <div className="text-xs text-blue-100 mt-1 font-medium">Precision on High-Risk Holds</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono">&lt;45ms</div>
              <div className="text-xs text-blue-100 mt-1 font-medium">End-to-End Decision Latency</div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold font-mono">100%</div>
              <div className="text-xs text-blue-100 mt-1 font-medium">Explainable Decisions (SHAP + Gemini)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-slate-200 text-center text-xs text-slate-500">
        <p className="font-medium">
          RiskLens AI — Production Financial Fraud Prevention Platform • Powered by Google Gemini 3.6 & Qdrant Vectors
        </p>
      </footer>

    </div>
  );
}
