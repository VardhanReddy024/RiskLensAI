import React from 'react';
import { Sparkles, ShieldAlert, Cpu, CheckCircle2, ArrowRight } from 'lucide-react';
import { FraudCluster } from '../../types/graph';

interface AIGraphInsightsCardProps {
  insights: string;
  confidenceScore: number;
  clusters: FraudCluster[];
  isRunningConsensus: boolean;
  onRunConsensus: () => void;
}

export function AIGraphInsightsCard({
  insights,
  confidenceScore,
  clusters,
  isRunningConsensus,
  onRunConsensus,
}: AIGraphInsightsCardProps) {
  const topCluster = clusters[0];

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4 shadow-xl text-xs space-y-3 relative overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="font-bold text-white text-xs">AI Relationship Intelligence</h4>
            <span className="text-[10px] text-slate-400">Autonomous Multi-Agent Consensus Synthesis</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-blue-950/60 border border-blue-500/40 px-2.5 py-1 rounded-full text-[10px] font-bold text-blue-300">
          <CheckCircle2 className="w-3 h-3 text-blue-400" />
          <span>{(confidenceScore * 100).toFixed(1)}% Confidence</span>
        </div>
      </div>

      {/* AI Narrative */}
      <p className="text-[11.5px] text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
        {insights}
      </p>

      {/* Syndicate Breakdown Banner */}
      {topCluster && (
        <div className="bg-rose-950/30 border border-rose-800/50 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-2 text-rose-300">
            <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span className="font-bold truncate max-w-[280px]">
              🚨 {topCluster.name}: 1 Device → {topCluster.accountCount} Accounts → {topCluster.transactionCount} Txns
            </span>
          </div>
          <span className="text-rose-400 font-extrabold flex-shrink-0">
            ${topCluster.totalExposure.toLocaleString()} At Risk
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-1">
        <button
          onClick={onRunConsensus}
          disabled={isRunningConsensus}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-blue-950/50 disabled:opacity-60"
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>{isRunningConsensus ? 'Analyzing Multi-Agent Network...' : 'Run Autonomous Consensus'}</span>
        </button>

        <span className="text-[10px] text-slate-500 font-medium">
          8 Agent Pipeline Active
        </span>
      </div>
    </div>
  );
}
