import React from 'react';
import { Route, ArrowRight, X, AlertTriangle, ShieldCheck } from 'lucide-react';
import { GraphNode, ShortestPathResult } from '../../types/graph';
import { NODE_TYPE_CONFIG } from '../../lib/graph_engine';

interface PathFinderPanelProps {
  nodes: GraphNode[];
  originNodeId: string | null;
  targetNodeId: string | null;
  pathResult: ShortestPathResult | null;
  onSetOrigin: (nodeId: string) => void;
  onSetTarget: (nodeId: string) => void;
  onCalculatePath: () => void;
  onClearPath: () => void;
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
}

export function PathFinderPanel({
  nodes,
  originNodeId,
  targetNodeId,
  pathResult,
  onSetOrigin,
  onSetTarget,
  onCalculatePath,
  onClearPath,
  onClose,
  onSelectNode,
}: PathFinderPanelProps) {
  const originNode = nodes.find(n => n.id === originNodeId);
  const targetNode = nodes.find(n => n.id === targetNodeId);

  return (
    <div className="absolute top-16 left-4 z-20 w-84 bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-4 text-xs space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold">
          <Route className="w-4 h-4" />
          <span>Entity Path Finder</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[11px] text-slate-400">
        Trace shortest connection and intermediate mule hops between any two suspicious entities.
      </p>

      {/* Selectors */}
      <div className="space-y-2">
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Origin Entity (A)
          </label>
          <select
            value={originNodeId || ''}
            onChange={(e) => onSetOrigin(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="">Select origin entity...</option>
            {nodes.map(n => (
              <option key={`origin-${n.id}`} value={n.id}>
                [{NODE_TYPE_CONFIG[n.type]?.label || n.type}] {n.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
            Destination Entity (B)
          </label>
          <select
            value={targetNodeId || ''}
            onChange={(e) => onSetTarget(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
          >
            <option value="">Select target entity...</option>
            {nodes.map(n => (
              <option key={`target-${n.id}`} value={n.id}>
                [{NODE_TYPE_CONFIG[n.type]?.label || n.type}] {n.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={onCalculatePath}
          disabled={!originNodeId || !targetNodeId || originNodeId === targetNodeId}
          className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-emerald-950/50"
        >
          <Route className="w-3.5 h-3.5" />
          <span>Find Path</span>
        </button>
        {pathResult && (
          <button
            onClick={onClearPath}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results Box */}
      {pathResult && (
        <div className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-3 space-y-2 mt-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400">
            <span>Path Discovered</span>
            <span>{pathResult.totalHops} Hops</span>
          </div>

          <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
            {pathResult.intermediateEntities.map((ent, idx) => {
              const cfg = NODE_TYPE_CONFIG[ent.type] || NODE_TYPE_CONFIG.transaction;
              return (
                <div
                  key={ent.id}
                  onClick={() => onSelectNode(ent)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800/80 cursor-pointer text-[10.5px] transition-colors"
                >
                  <span className="w-4 h-4 rounded-full bg-slate-800 text-slate-400 font-bold flex items-center justify-center text-[9px] flex-shrink-0">
                    {idx + 1}
                  </span>
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cfg.bgColor }}
                  />
                  <span className="font-semibold text-slate-200 truncate flex-1">
                    {ent.label}
                  </span>
                  <span className={`text-[9px] font-bold ${ent.riskTier === 'CRITICAL' ? 'text-rose-400' : 'text-slate-400'}`}>
                    {ent.riskScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
