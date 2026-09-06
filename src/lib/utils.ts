import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RiskTier, TransactionStatus } from '../types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function formatPercentage(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return isoString;
  }
}

export function formatRelativeDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  } catch {
    return isoString;
  }
}

export function getRiskTier(score: number): RiskTier {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 30) return 'MEDIUM';
  return 'LOW';
}

export function getRiskColorClasses(tier: RiskTier) {
  switch (tier) {
    case 'CRITICAL':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        border: 'border-rose-200',
        badge: 'bg-rose-100 text-rose-800 border-rose-200',
        dot: 'bg-rose-500',
        ring: 'ring-rose-500/20',
      };
    case 'HIGH':
      return {
        bg: 'bg-amber-50',
        text: 'text-amber-700',
        border: 'border-amber-200',
        badge: 'bg-amber-100 text-amber-800 border-amber-200',
        dot: 'bg-amber-500',
        ring: 'ring-amber-500/20',
      };
    case 'MEDIUM':
      return {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-200',
        badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        dot: 'bg-yellow-500',
        ring: 'ring-yellow-500/20',
      };
    case 'LOW':
    default:
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
        ring: 'ring-emerald-500/20',
      };
  }
}

export function getStatusBadgeClasses(status: TransactionStatus) {
  switch (status) {
    case 'flagged':
      return 'bg-rose-100 text-rose-800 border border-rose-300';
    case 'rejected':
      return 'bg-red-100 text-red-900 border border-red-300 font-semibold';
    case 'held':
      return 'bg-amber-100 text-amber-900 border border-amber-300';
    case 'escalated':
      return 'bg-purple-100 text-purple-900 border border-purple-300';
    case 'approved':
      return 'bg-emerald-100 text-emerald-900 border border-emerald-300';
    case 'pending':
    default:
      return 'bg-slate-100 text-slate-700 border border-slate-200';
  }
}
