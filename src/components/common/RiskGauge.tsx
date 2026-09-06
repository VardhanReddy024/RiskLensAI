import React from 'react';
import { RiskTier } from '../../types';
import { getRiskColorClasses } from '../../lib/utils';

interface RiskGaugeProps {
  score: number; // 0-100
  tier: RiskTier;
  confidence?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function RiskGauge({ score, tier, confidence, size = 'md', showLabel = true }: RiskGaugeProps) {
  const colors = getRiskColorClasses(tier);

  // SVG Gauge calculations
  const radius = size === 'lg' ? 44 : (size === 'md' ? 34 : 22);
  const strokeWidth = size === 'lg' ? 7 : (size === 'md' ? 5.5 : 4);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let strokeColor = '#10B981'; // Green
  if (tier === 'CRITICAL') strokeColor = '#E11D48'; // Rose
  else if (tier === 'HIGH') strokeColor = '#F59E0B'; // Amber
  else if (tier === 'MEDIUM') strokeColor = '#EAB308'; // Yellow

  const dimension = (radius + strokeWidth) * 2;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        <svg
          width={dimension}
          height={dimension}
          className="transform -rotate-90"
        >
          {/* Background Track */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Indicator */}
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`font-mono font-bold tracking-tight text-slate-900 ${
            size === 'lg' ? 'text-2xl' : (size === 'md' ? 'text-lg' : 'text-xs')
          }`}>
            {score}
          </span>
          {size === 'lg' && (
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              / 100
            </span>
          )}
        </div>
      </div>

      {showLabel && (
        <div className="mt-2 flex flex-col items-center">
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${colors.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${colors.dot} animate-pulse`} />
            {tier} Risk
          </span>
          {confidence !== undefined && (
            <span className="text-[11px] text-slate-500 mt-1 font-medium">
              {(confidence * 100).toFixed(0)}% AI Confidence
            </span>
          )}
        </div>
      )}
    </div>
  );
}
