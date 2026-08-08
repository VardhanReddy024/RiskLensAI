import React from 'react';
import { AgentMetric, AgentId } from '../../types';
import { 
  Network, 
  Activity, 
  UserCheck, 
  Database, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  FileText,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface AgentStatusBadgeProps {
  metric: AgentMetric;
  onClick?: () => void;
  isActive?: boolean;
}

const AGENT_ICON_MAP: Record<AgentId, React.ComponentType<{ className?: string }>> = {
  orchestrator: Network,
  fraud_detection: Activity,
  behavioral_analysis: UserCheck,
  similar_case_retrieval: Database,
  explainability: Sparkles,
  compliance: ShieldCheck,
  recommendation: Zap,
  report_generation: FileText,
};

export function AgentStatusBadge({ metric, onClick, isActive = false }: AgentStatusBadgeProps) {
  const Icon = AGENT_ICON_MAP[metric.id] || Sparkles;

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer ${
        isActive 
          ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
          : 'bg-white/80 backdrop-blur-md border-slate-200/80 hover:border-slate-300 hover:bg-white hover:shadow-xs'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`p-2 rounded-xl transition-colors ${
            isActive ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100/90 text-slate-700'
          }`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 tracking-tight leading-tight">
              {metric.name}
            </h4>
            <span className="text-[11px] text-slate-500 font-medium block mt-0.5">
              {metric.id === 'orchestrator' ? 'Pipeline Governor' : `${metric.executionTimeMs}ms execution`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {metric.status === 'completed' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              100%
            </span>
          )}
          {metric.status === 'running' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 shadow-2xs">
              <Clock className="w-3 h-3 text-blue-600 animate-spin" />
              Running
            </span>
          )}
        </div>
      </div>

      <p className="mt-2.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
        {metric.summary}
      </p>
    </div>
  );
}
