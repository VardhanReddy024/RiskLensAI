import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean; // green vs red
    label?: string;
  };
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  badge?: string;
  className?: string;
}

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  iconBgColor = 'bg-blue-50/90',
  iconColor = 'text-blue-600',
  badge,
  className = '',
}: MetricCardProps) {
  return (
    <div className={`enterprise-card p-5.5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {title}
          </span>
          <div className="mt-2 flex items-baseline gap-2.5">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {value}
            </span>
            {badge && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-100/90 text-slate-700 border border-slate-200/80">
                {badge}
              </span>
            )}
          </div>
        </div>
        <div className={`p-3 rounded-2xl ${iconBgColor} ${iconColor} shrink-0 shadow-2xs border border-white/80`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3.5 flex items-center justify-between text-xs border-t border-slate-100/80 pt-3">
          {subtitle && (
            <span className="text-slate-500 font-medium text-[11px]">
              {subtitle}
            </span>
          )}
          {trend && (
            <span className={`font-semibold inline-flex items-center gap-1 text-[11px] ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}</span>
              {trend.label && <span className="text-slate-400 font-normal">({trend.label})</span>}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
