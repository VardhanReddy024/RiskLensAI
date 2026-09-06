import React from 'react';
import { Filter, X, RotateCcw, Check } from 'lucide-react';
import { GraphNodeType, GraphFilterOptions } from '../../types/graph';
import { RiskTier } from '../../types';
import { NODE_TYPE_CONFIG, AGENT_DISPLAY_NAME_MAP, AGENT_COLOR_MAP } from '../../lib/graph_engine';

interface GraphFiltersDrawerProps {
  filters: GraphFilterOptions;
  onChangeFilters: (filters: GraphFilterOptions) => void;
  onResetFilters: () => void;
  onClose: () => void;
  totalNodesCount: number;
  filteredNodesCount: number;
}

export function GraphFiltersDrawer({
  filters,
  onChangeFilters,
  onResetFilters,
  onClose,
  totalNodesCount,
  filteredNodesCount,
}: GraphFiltersDrawerProps) {
  const allRiskTiers: RiskTier[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
  const allNodeTypes = Object.keys(NODE_TYPE_CONFIG) as GraphNodeType[];
  const allAgents = Object.keys(AGENT_DISPLAY_NAME_MAP);

  const toggleRiskLevel = (tier: RiskTier) => {
    const next = filters.riskLevels.includes(tier)
      ? filters.riskLevels.filter(r => r !== tier)
      : [...filters.riskLevels, tier];
    onChangeFilters({ ...filters, riskLevels: next });
  };

  const toggleNodeType = (type: GraphNodeType) => {
    const next = filters.nodeTypes.includes(type)
      ? filters.nodeTypes.filter(t => t !== type)
      : [...filters.nodeTypes, type];
    onChangeFilters({ ...filters, nodeTypes: next });
  };

  const toggleAgent = (agentKey: string) => {
    const next = filters.agents.includes(agentKey)
      ? filters.agents.filter(a => a !== agentKey)
      : [...filters.agents, agentKey];
    onChangeFilters({ ...filters, agents: next });
  };

  return (
    <div className="absolute top-16 left-4 z-20 w-88 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-xs space-y-4 max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150 scrollbar-thin scrollbar-thumb-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-blue-400 font-bold">
          <Filter className="w-4 h-4" />
          <span>Graph Filters ({filteredNodesCount}/{totalNodesCount} Nodes)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onResetFilters}
            title="Reset Filters"
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Risk Tiers */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Risk Tier Classification
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {allRiskTiers.map(tier => {
            const isSelected = filters.riskLevels.includes(tier);
            return (
              <button
                key={tier}
                onClick={() => toggleRiskLevel(tier)}
                className={`px-2.5 py-1.5 rounded-lg font-bold text-[10.5px] flex items-center justify-between border transition-all ${
                  isSelected
                    ? (tier === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : (tier === 'HIGH' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-slate-800 text-slate-200 border-slate-600'))
                    : 'bg-slate-950/60 text-slate-500 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{tier}</span>
                {isSelected && <Check className="w-3 h-3" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Node Types (12+ Types) */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Entity Types ({filters.nodeTypes.length}/{allNodeTypes.length})
        </label>
        <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto pr-1">
          {allNodeTypes.map(type => {
            const cfg = NODE_TYPE_CONFIG[type];
            const isSelected = filters.nodeTypes.includes(type);
            return (
              <button
                key={type}
                onClick={() => toggleNodeType(type)}
                className={`p-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1.5 border transition-all text-left truncate ${
                  isSelected
                    ? 'bg-slate-800/90 text-slate-200 border-slate-600'
                    : 'bg-slate-950/40 text-slate-500 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: cfg?.bgColor || '#64748b' }}
                />
                <span className="truncate">{cfg?.label || type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Multi-Agent Attribution */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Discovered By Agent
        </label>
        <div className="space-y-1">
          {allAgents.map(agentKey => {
            const name = AGENT_DISPLAY_NAME_MAP[agentKey] || agentKey;
            const color = AGENT_COLOR_MAP[agentKey] || '#64748b';
            const isSelected = filters.agents.includes(agentKey);

            return (
              <button
                key={agentKey}
                onClick={() => toggleAgent(agentKey)}
                className={`w-full p-1.5 rounded-lg text-[10.5px] font-semibold flex items-center justify-between border transition-all ${
                  isSelected
                    ? 'bg-slate-800/90 text-slate-200 border-slate-600'
                    : 'bg-slate-950/40 text-slate-500 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="truncate">{name}</span>
                </div>
                {isSelected && <Check className="w-3 h-3 text-blue-400" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-1.5">
        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
          Investigation Window
        </label>
        <div className="grid grid-cols-4 gap-1">
          {(['1h', '24h', '7d', 'all'] as const).map(windowKey => (
            <button
              key={windowKey}
              onClick={() => onChangeFilters({ ...filters, dateRange: windowKey })}
              className={`py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                filters.dateRange === windowKey
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-950 text-slate-400 hover:bg-slate-800'
              }`}
            >
              {windowKey}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
