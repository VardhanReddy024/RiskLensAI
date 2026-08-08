import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Clock, ShieldAlert, Sparkles, User, Smartphone, Globe, Landmark } from 'lucide-react';
import { TimelineEvent, GraphNode } from '../../types/graph';
import { NODE_TYPE_CONFIG } from '../../lib/graph_engine';

interface TimelineViewProps {
  timeline: TimelineEvent[];
  nodes: GraphNode[];
  onSelectNode: (node: GraphNode) => void;
}

export function TimelineView({ timeline, nodes, onSelectNode }: TimelineViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(timeline.length - 1);

  // Auto-play timeline simulation
  React.useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setActiveStep(prev => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeline.length]);

  return (
    <div className="w-full h-full min-h-[620px] bg-slate-950 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between overflow-hidden relative">
      {/* Top Header & Controls */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-bold text-white">Chronological Attack Progression</h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Step-by-step timeline of multi-agent observations leading to fraud syndicate isolation.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 rounded-xl p-1.5 shadow-lg">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play Progression'}</span>
          </button>
          <button
            onClick={() => { setIsPlaying(false); setActiveStep(0); }}
            title="Restart Timeline"
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Timeline Stream */}
      <div className="flex-1 overflow-y-auto py-6 pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-800">
        <div className="relative border-l-2 border-slate-800 ml-6 space-y-6">
          {timeline.map((event, idx) => {
            const isPassed = idx <= activeStep;
            const isCurrent = idx === activeStep;
            const targetNode = nodes.find(n => n.id === event.nodeId);
            const cfg = NODE_TYPE_CONFIG[event.entityType] || NODE_TYPE_CONFIG.transaction;

            return (
              <div
                key={event.id}
                onClick={() => {
                  setActiveStep(idx);
                  if (targetNode) onSelectNode(targetNode);
                }}
                className={`relative pl-8 transition-all cursor-pointer group ${
                  isPassed ? 'opacity-100' : 'opacity-35'
                }`}
              >
                {/* Timeline Bullet Node */}
                <div
                  className={`absolute -left-[17px] top-1 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    isCurrent
                      ? 'bg-blue-600 border-white text-white shadow-[0_0_20px_rgba(59,130,246,0.6)] scale-110'
                      : (event.riskTier === 'CRITICAL' ? 'bg-rose-950 border-rose-500 text-rose-400' : 'bg-slate-900 border-slate-700 text-slate-400')
                  }`}
                >
                  <span className="text-[10px] font-bold">{idx + 1}</span>
                </div>

                {/* Event Card */}
                <div className={`p-4 rounded-xl border transition-all ${
                  isCurrent
                    ? 'bg-slate-900/90 border-blue-500/80 shadow-2xl ring-1 ring-blue-500/30'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                }`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-400">{event.time}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs font-bold text-slate-200">{event.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400">{event.agent}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        event.riskTier === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}>
                        {event.riskScore}/100 Risk
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {event.description}
                  </p>

                  {targetNode && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cfg.bgColor }} />
                        <span>Associated Node: <strong className="text-slate-200">{targetNode.label}</strong></span>
                      </div>
                      <span className="text-blue-400 hover:underline font-semibold">Inspect in Dossier →</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Step Scrubber */}
      <div className="pt-4 border-t border-slate-800 flex items-center gap-4 text-xs text-slate-400">
        <span>Step {activeStep + 1} of {timeline.length}</span>
        <input
          type="range"
          min="0"
          max={timeline.length - 1}
          value={activeStep}
          onChange={(e) => setActiveStep(Number(e.target.value))}
          className="flex-1 accent-blue-500 cursor-pointer"
        />
        <span className="font-mono text-slate-300">{timeline[activeStep]?.time || '--:--'}</span>
      </div>
    </div>
  );
}
