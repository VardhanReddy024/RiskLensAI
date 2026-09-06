import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Sliders, 
  Database, 
  Save, 
  Check, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export function SettingsPage() {
  const { currentUser } = useAuth();

  const [criticalThreshold, setCriticalThreshold] = useState<number>(80);
  const [highThreshold, setHighThreshold] = useState<number>(60);
  const [mediumThreshold, setMediumThreshold] = useState<number>(35);
  const [vectorCutoff, setVectorCutoff] = useState<number>(65);
  const [autoRejectCritical, setAutoRejectCritical] = useState<boolean>(true);
  const [autoStepUpHigh, setAutoStepUpHigh] = useState<boolean>(true);
  const [saved, setSaved] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setCriticalThreshold(80);
    setHighThreshold(60);
    setMediumThreshold(35);
    setVectorCutoff(65);
    setAutoRejectCritical(true);
    setAutoStepUpHigh(true);
  };

  return (
    <div className="space-y-8 pb-16 max-w-5xl">
      
      {/* Top Banner */}
      <div className="enterprise-card p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Rules, Risk Thresholds & Model Hyperparameters
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1.5 leading-relaxed">
            Configure automated enforcement boundaries, Qdrant vector retrieval sensitivity, and multi-agent weights
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="btn-premium-secondary px-4 py-2.5 text-xs flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Risk Threshold Sliders Card */}
        <div className="enterprise-card p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100/90">
            <span className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 shadow-2xs border border-rose-100">
              <AlertTriangle className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Machine Learning Risk Tier Classification Thresholds
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Score ranges (0-100) determining operational routing and automated step-up challenges
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Critical Threshold */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-rose-900 uppercase tracking-wider text-[11px]">
                  Critical Risk Threshold (Auto-Block)
                </span>
                <span className="font-mono font-bold text-rose-600 text-sm">
                  {criticalThreshold} - 100
                </span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                value={criticalThreshold}
                onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Transactions scoring above this threshold will immediately trigger Playbook #8 (Instant Settlement Block).
              </p>
            </div>

            {/* High Threshold */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-900 uppercase tracking-wider text-[11px]">
                  High Risk Threshold (Biometric Step-Up Hold)
                </span>
                <span className="font-mono font-bold text-amber-600 text-sm">
                  {highThreshold} - {criticalThreshold - 1}
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="75"
                value={highThreshold}
                onChange={(e) => setHighThreshold(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Transactions in this tier are placed on 15-minute escrow hold with FIDO2 / Push authentication challenge.
              </p>
            </div>

            {/* Medium Threshold */}
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-yellow-900 uppercase tracking-wider text-[11px]">
                  Medium Risk Threshold (Analyst Review Queue)
                </span>
                <span className="font-mono font-bold text-yellow-600 text-sm">
                  {mediumThreshold} - {highThreshold - 1}
                </span>
              </div>
              <input
                type="range"
                min="20"
                max="45"
                value={mediumThreshold}
                onChange={(e) => setMediumThreshold(Number(e.target.value))}
                className="w-full accent-yellow-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Routed to Tier-1 and Tier-2 human analysts for soft verification.
              </p>
            </div>
          </div>
        </div>

        {/* Vector Retrieval & AI Tuning Card */}
        <div className="enterprise-card p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100/90">
            <span className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600 shadow-2xs border border-indigo-100">
              <Database className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
                Qdrant Vector Database & AI Configuration
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Semantic similarity distance and Google Gemini model hyperparameters
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Vector Cosine Similarity Cutoff
                </span>
                <span className="font-mono font-bold text-indigo-600 text-sm">
                  {vectorCutoff}% match
                </span>
              </div>
              <input
                type="range"
                min="50"
                max="90"
                value={vectorCutoff}
                onChange={(e) => setVectorCutoff(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Minimum vector cosine similarity threshold required to match historical fraud clusters in Qdrant.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
              <label className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-all duration-150 shadow-2xs">
                <div>
                  <div className="text-xs font-bold text-slate-900">Automate Critical Block</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Execute instant payment decline</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoRejectCritical}
                  onChange={(e) => setAutoRejectCritical(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </label>

              <label className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 hover:bg-slate-50 flex items-center justify-between cursor-pointer transition-all duration-150 shadow-2xs">
                <div>
                  <div className="text-xs font-bold text-slate-900">Step-Up MFA Challenge</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Dispatch out-of-band push check</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoStepUpHigh}
                  onChange={(e) => setAutoStepUpHigh(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="btn-premium-primary px-6 py-2.5 text-xs flex items-center gap-2 shadow-md"
          >
            {saved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Rules Saved & Active!' : 'Save Engine Rules'}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
