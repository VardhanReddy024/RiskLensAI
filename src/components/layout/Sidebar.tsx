import React from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Activity, 
  SearchCode, 
  FileCheck2, 
  Sliders, 
  Sparkles,
  Globe,
  TrendingUp,
  ShieldAlert,
  Network
} from 'lucide-react';
import { useTransactions } from '../../context/TransactionContext';

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ activePage, onNavigate }: SidebarProps) {
  const { metrics, isStreaming } = useTransactions();

  const NAV_ITEMS = [
    { id: 'dashboard', label: 'RiskLens Command Center', icon: LayoutDashboard, badge: null },
    { id: 'monitoring', label: 'Live Monitoring', icon: Activity, badge: isStreaming ? 'LIVE' : null },
    { id: 'upload', label: 'Upload Dataset', icon: UploadCloud, badge: null },
    { id: 'investigation', label: 'Investigation Hub', icon: SearchCode, badge: metrics.flaggedCount > 0 ? `${metrics.flaggedCount}` : null },
    { id: 'intelligence', label: 'Relationship Graph', icon: Network, badge: 'FLAGSHIP' },
    { id: 'reports', label: 'Reports & SARs', icon: FileCheck2, badge: null },
    { id: 'settings', label: 'Rules & Engine', icon: Sliders, badge: null },
  ];

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col justify-between floating-glass-nav p-4 min-h-[calc(100vh-100px)] self-start sticky top-24">
      <div className="space-y-6">
        {/* Navigation Menu */}
        <div>
          <div className="px-3 mb-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Platform Modules
          </div>
          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50/90 text-blue-700 font-bold border border-blue-200/90 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/90 hover:translate-x-0.5'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      item.badge === 'LIVE'
                        ? 'bg-rose-100 text-rose-700 border border-rose-200 animate-pulse'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Public Landing View Link */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Showcase
          </div>
          <button
            onClick={() => onNavigate('landing')}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              activePage === 'landing'
                ? 'bg-purple-50 text-purple-700 border border-purple-200 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/90 hover:translate-x-0.5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Globe className="w-4 h-4 text-purple-600" />
              <span>Public Landing Page</span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
          </button>
        </div>

        {/* Real-time Loss Summary Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.2)] relative overflow-hidden">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-semibold text-[10px] uppercase tracking-wider text-slate-300">
              Loss Prevented
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
          </div>
          <div className="mt-1.5 text-xl font-extrabold font-mono text-emerald-400 tracking-tight">
            ${metrics.totalLossPrevented.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 leading-snug">
            Across {metrics.flaggedCount + metrics.heldCount + metrics.rejectedCount} high-risk interventions today.
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-200/60 text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-500">Engine Status</span>
          <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Operational
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-500">Avg Latency</span>
          <span className="font-mono text-slate-600 font-medium">42ms</span>
        </div>
      </div>
    </aside>
  );
}
