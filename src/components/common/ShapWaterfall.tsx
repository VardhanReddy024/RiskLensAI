import React from 'react';
import { ShapFactor } from '../../types';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts';

interface ShapWaterfallProps {
  factors: ShapFactor[];
  maxDisplay?: number;
  baseScore?: number;
  finalScore?: number;
}

export function ShapWaterfall({ factors, maxDisplay = 6, baseScore, finalScore }: ShapWaterfallProps) {
  const displayFactors = factors.slice(0, maxDisplay);

  const chartData = displayFactors.map(f => ({
    name: f.displayName,
    impact: f.impactScore,
    category: f.category,
    value: f.value,
    explanation: f.explanation,
    isSuspicious: f.isSuspicious,
  })).reverse(); // Reverse for clean top-down rendering in horizontal bar chart

  return (
    <div className="w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider text-[11px]">
            SHAP Value Feature Attribution
          </span>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100/90 text-slate-600 font-bold border border-slate-200/80 shadow-2xs">
            Game Theoretic
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-rose-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 shadow-2xs" />
            Increases Fraud Risk (+)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shadow-2xs" />
            Legitimate Pattern (-)
          </span>
        </div>
      </div>

      <div className="h-[270px] w-full min-w-[280px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={200}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
          >
            <XAxis
              type="number"
              domain={[-40, 40]}
              tick={{ fontSize: 11, fill: '#64748B' }}
              tickFormatter={(val) => `${val > 0 ? '+' : ''}${val}`}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fill: '#334155', fontWeight: 600 }}
              width={140}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="enterprise-card p-4 shadow-xl text-xs max-w-xs z-50">
                      <div className="font-bold text-slate-900 mb-1">{data.name}</div>
                      <div className="text-slate-500 mb-2">Observed Value: <span className="font-mono text-slate-800 font-bold">{data.value}</span></div>
                      <div className="mb-1">
                        <span className="font-medium text-slate-600">Impact Score: </span>
                        <span className={`font-mono font-bold ${data.impact > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {data.impact > 0 ? `+${data.impact}` : data.impact} SHAP pts
                        </span>
                      </div>
                      <p className="text-slate-600 leading-relaxed text-[11px] border-t border-slate-100/90 pt-2 mt-2">
                        {data.explanation}
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine x={0} stroke="#CBD5E1" strokeWidth={1.5} />
            <Bar dataKey="impact" radius={[6, 6, 6, 6]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.impact > 0 ? '#F43F5E' : '#10B981'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-3 border-t border-slate-100/90">
        {displayFactors.slice(0, 4).map((factor, idx) => (
          <div
            key={idx}
            className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-200/60 text-xs hover:bg-slate-50 transition-colors"
          >
            <span
              className={`font-mono font-bold px-2 py-0.5 rounded-md text-[11px] shrink-0 ${
                factor.impactScore > 0
                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              {factor.impactScore > 0 ? `+${factor.impactScore}` : factor.impactScore}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-bold text-slate-800 truncate">{factor.displayName}</div>
              <div className="text-[11px] text-slate-500 truncate mt-0.5">{factor.explanation}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
