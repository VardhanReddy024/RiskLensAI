import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { GraphNodeType } from '../../types/graph';
import { NODE_TYPE_CONFIG, AGENT_COLOR_MAP, AGENT_DISPLAY_NAME_MAP } from '../../lib/graph_engine';

export function GraphLegend() {
  const [isOpen, setIsOpen] = useState(false);
  const nodeTypes = Object.keys(NODE_TYPE_CONFIG) as GraphNodeType[];
  const agentKeys = Object.keys(AGENT_DISPLAY_NAME_MAP);

  return (
    <div className="absolute bottom-4 right-4 z-20 bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-xs max-w-xs transition-all duration-200">
      {/* Header Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2.5 flex items-center justify-between gap-3 text-slate-300 hover:text-white font-bold bg-slate-950/60 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-[11px]">Graph Visual Legend</span>
        </div>
        {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {/* Expanded Legend */}
      {isOpen && (
        <div className="p-3.5 space-y-3.5 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 text-[10.5px]">
          {/* Entity Types */}
          <div className="space-y-1.5">
            <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider block">
              Entity Nodes (12 Types)
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {nodeTypes.map(type => {
                const cfg = NODE_TYPE_CONFIG[type];
                return (
                  <div key={type} className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: cfg.bgColor }}
                    />
                    <span className="text-slate-300 truncate">{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Risk Tiers */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider block">
              Risk Tiers
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-slate-300 font-semibold">Critical (75-100)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span className="text-slate-300 font-semibold">High (50-74)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-300 font-semibold">Low (0-49)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full border border-rose-500" />
                <span className="text-rose-400 font-semibold">Syndicate Ring</span>
              </div>
            </div>
          </div>

          {/* Multi-Agent Attribution */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800">
            <span className="text-[9.5px] uppercase font-bold text-slate-500 tracking-wider block">
              Agent Attribution Color
            </span>
            <div className="space-y-1">
              {agentKeys.map(key => (
                <div key={key} className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: AGENT_COLOR_MAP[key] || '#64748b' }}
                  />
                  <span className="text-slate-300 truncate">{AGENT_DISPLAY_NAME_MAP[key]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
