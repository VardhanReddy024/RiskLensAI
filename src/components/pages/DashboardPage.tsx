import React, { useState } from 'react';
import { useTransactions } from '../../context/TransactionContext';
import { useInvestigation } from '../../context/InvestigationContext';
import { useAuth } from '../../context/AuthContext';
import { Transaction, RiskTier } from '../../types';
import { MetricCard } from '../common/MetricCard';
import { RiskGauge } from '../common/RiskGauge';
import { QuickActionModal } from '../modals/QuickActionModal';
import { formatCurrency, formatRelativeDate, getRiskColorClasses } from '../../lib/utils';
import { 
  ShieldAlert, 
  Activity, 
  Clock, 
  SearchCode, 
  AlertTriangle,
  UploadCloud,
  Zap,
  CheckCircle2,
  TrendingUp,
  Filter
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface DashboardPageProps {
  onNavigateToInvestigation: (transaction: Transaction) => void;
  onNavigateToUpload: () => void;
  onNavigateToReports: () => void;
}

export function DashboardPage({
  onNavigateToInvestigation,
  onNavigateToUpload,
  onNavigateToReports,
}: DashboardPageProps) {
  const { transactions, metrics, isStreaming, toggleStreaming } = useTransactions();
  const { startInvestigation } = useInvestigation();
  const { currentUser } = useAuth();

  const [selectedTxnForAction, setSelectedTxnForAction] = useState<Transaction | null>(null);
  const [filterTier, setFilterTier] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 24-hour volume simulation data for area chart
  const HOURLY_TREND = [
    { time: '00:00', volume: 42000, fraudBlocked: 8500 },
    { time: '04:00', volume: 18000, fraudBlocked: 14200 },
    { time: '08:00', volume: 95000, fraudBlocked: 12000 },
    { time: '12:00', volume: 160000, fraudBlocked: 28500 },
    { time: '16:00', volume: 220000, fraudBlocked: 41000 },
    { time: '20:00', volume: 140000, fraudBlocked: 19800 },
    { time: 'Now', volume: 185000, fraudBlocked: metrics.totalLossPrevented > 0 ? metrics.totalLossPrevented : 32000 },
  ];

  // Donut chart data
  const PIE_DATA = [
    { name: 'Critical Risk', value: metrics.criticalCount || 1, color: '#E11D48' },
    { name: 'High Risk', value: metrics.flaggedCount || 2, color: '#F59E0B' },
    { name: 'Held / Review', value: metrics.heldCount || 1, color: '#EAB308' },
    { name: 'Approved Clean', value: metrics.approvedCount || 6, color: '#10B981' },
  ];

  // Filtered transactions
  const filteredTransactions = transactions.filter(t => {
    const matchesTier = filterTier === 'all' || t.riskTier.toLowerCase() === filterTier.toLowerCase();
    const matchesSearch = !searchQuery || 
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.location.city.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTier && matchesSearch;
  });

  const handleInvestigateClick = async (txn: Transaction) => {
    await startInvestigation(txn);
    onNavigateToInvestigation(txn);
  };

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Banner / Welcome Row */}
      <div className="enterprise-card p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              RiskLens Command Center
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Surveillance Active
            </span>
          </div>
          
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="text-sm sm:text-base font-semibold text-slate-700">
              Welcome back, <strong className="font-extrabold text-slate-900">{currentUser?.displayName || 'Reddy Vardhan Kumar'}</strong>
            </span>
            <span className="px-2 py-0.5 rounded-md bg-blue-100/80 text-blue-800 text-[10px] font-extrabold uppercase tracking-wider">
              {currentUser?.role || 'Senior Fraud Analyst'}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
            RiskLens AI is actively monitoring financial transactions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onNavigateToUpload}
            className="btn-premium-secondary px-4 py-2.5 text-xs flex items-center gap-2"
          >
            <UploadCloud className="w-4 h-4 text-blue-600" />
            <span>Upload Batch CSV</span>
          </button>
          <button
            onClick={toggleStreaming}
            className={`btn-premium-primary px-4.5 py-2.5 text-xs flex items-center gap-2 ${
              isStreaming ? '!bg-rose-600 hover:!bg-rose-700 shadow-rose-500/30' : ''
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>{isStreaming ? 'Pause Live Stream' : 'Start Live Stream'}</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Total Loss Prevented"
          value={`$${metrics.totalLossPrevented.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtitle="Direct fraud exposure blocked"
          trend={{ value: '18.4%', isPositive: true, label: 'vs last week' }}
          icon={ShieldAlert}
          iconBgColor="bg-emerald-50/90"
          iconColor="text-emerald-600"
          badge="High Impact"
        />

        <MetricCard
          title="Analyzed Volume"
          value={`${metrics.totalCount} Txns`}
          subtitle={`$${metrics.totalVolume.toLocaleString('en-US', { minimumFractionDigits: 2 })} gross settlement`}
          trend={{ value: '100%', isPositive: true, label: 'ML coverage' }}
          icon={Activity}
          iconBgColor="bg-blue-50/90"
          iconColor="text-blue-600"
        />

        <MetricCard
          title="Flagged Anomalies"
          value={`${metrics.flaggedCount + metrics.criticalCount}`}
          subtitle={`${metrics.criticalCount} Critical • ${metrics.flaggedCount} High Risk`}
          trend={{ value: '0.24%', isPositive: true, label: 'False Positive' }}
          icon={AlertTriangle}
          iconBgColor="bg-amber-50/90"
          iconColor="text-amber-600"
          badge="Action Required"
        />

        <MetricCard
          title="Multi-Agent Latency"
          value="38ms"
          subtitle="8 autonomous agents consensus"
          trend={{ value: '-12ms', isPositive: true, label: 'p99 speed' }}
          icon={Clock}
          iconBgColor="bg-purple-50/90"
          iconColor="text-purple-600"
        />
      </div>

      {/* Analytics Visualizers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 24-Hour Settlement & Fraud Trend Area Chart (8 Cols) */}
        <div className="lg:col-span-8 enterprise-card p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                24-Hour Network Velocity & Prevented Exposure
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gross transaction throughput vs. high-risk fraud intercepted by RiskLens AI
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded-full border border-blue-200/60">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                Gross Volume ($)
              </span>
              <span className="flex items-center gap-1.5 text-rose-700 bg-rose-50/80 px-2.5 py-1 rounded-full border border-rose-200/60">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Fraud Blocked ($)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={HOURLY_TREND} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748B' }} stroke="#E2E8F0" />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  stroke="#E2E8F0"
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val: any) => [`$${Number(val).toLocaleString()}`, '']}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', borderRadius: '14px', border: '1px solid #E2E8F0', fontSize: '12px', boxShadow: '0 8px 24px -4px rgba(15,23,42,0.1)' }}
                />
                <Area type="monotone" dataKey="volume" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVolume)" name="Gross Volume" />
                <Area type="monotone" dataKey="fraudBlocked" stroke="#F43F5E" strokeWidth={2.5} fillOpacity={1} fill="url(#colorFraud)" name="Fraud Blocked" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Risk Tier Donut Distribution (4 Cols) */}
        <div className="lg:col-span-4 enterprise-card p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Risk Tier Composition
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Active scoring distribution across monitored streams
            </p>
          </div>

          <div className="h-48 w-full flex items-center justify-center relative my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={PIE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any) => [`${val} Transactions`, name]}
                  contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px', boxShadow: '0 8px 24px -4px rgba(15,23,42,0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-mono font-extrabold text-slate-900">
                {metrics.totalCount}
              </span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">
                Total Txns
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100/90 text-xs">
            {PIE_DATA.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-50/70 p-1.5 rounded-lg border border-slate-100">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-slate-600 truncate text-[11px] font-medium">{item.name}: <strong>{item.value}</strong></span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Flagged Transactions Queue Table */}
      <div className="enterprise-card-static overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/40">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Active Investigation Queue
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Transactions triaged by machine learning & multi-agent consensus requiring review or automated execution
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search ID, Merchant, City..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border border-slate-200/90 bg-white/90 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-52 shadow-2xs font-medium"
            />

            {/* Risk Tier Filter */}
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-3.5 py-2 text-xs rounded-xl border border-slate-200/90 bg-white/90 font-semibold text-slate-700 focus:outline-hidden shadow-2xs cursor-pointer"
            >
              <option value="all">All Risk Tiers</option>
              <option value="critical">Critical Risk (80-100)</option>
              <option value="high">High Risk (60-79)</option>
              <option value="medium">Medium Risk (30-59)</option>
              <option value="low">Low Risk (0-29)</option>
            </select>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/70">
              <tr>
                <th className="px-5 py-3.5">Transaction & Time</th>
                <th className="px-5 py-3.5">Customer / Card</th>
                <th className="px-5 py-3.5">Merchant / Sector</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Risk Assessment</th>
                <th className="px-5 py-3.5">Location & Proxy</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTransactions.slice(0, 10).map((txn) => {
                const colors = getRiskColorClasses(txn.riskTier);
                return (
                  <tr key={txn.id} className="hover:bg-blue-50/30 transition-colors group">
                    
                    {/* ID & Time */}
                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{txn.id}</div>
                      <div className="text-[11px] text-slate-400 font-medium">{formatRelativeDate(txn.timestamp)}</div>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{txn.customerName || txn.customerId}</div>
                      <div className="text-[11px] text-slate-500 font-mono">••• {txn.paymentMethod.last4} ({txn.paymentMethod.type})</div>
                    </td>

                    {/* Merchant */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">{txn.merchant}</div>
                      <div className="text-[11px] text-slate-500">{txn.merchantCategory}</div>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(txn.amount, txn.currency)}
                      </div>
                    </td>

                    {/* Risk Score & Gauge */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <RiskGauge score={txn.riskScore} tier={txn.riskTier} size="sm" showLabel={false} />
                        <div>
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${colors.badge}`}>
                            {txn.riskTier} ({txn.riskScore})
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {(txn.confidenceScore * 100).toFixed(0)}% Conf
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Location & IP */}
                    <td className="px-5 py-4">
                      <div className="text-slate-800 font-medium">
                        {txn.location.city}, {txn.location.country}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        {txn.ipAddress.isTor ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">Tor Exit</span>
                        ) : txn.ipAddress.isProxy ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 font-bold text-[10px]">Proxy IP</span>
                        ) : (
                          <span className="text-slate-400">Direct ISP</span>
                        )}
                        <span>• {txn.location.distanceFromHomeKm}km</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
                        txn.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        txn.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                        txn.status === 'held' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                        'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}>
                        {txn.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleInvestigateClick(txn)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-all border border-blue-200/80 hover:shadow-2xs"
                        >
                          <SearchCode className="w-3.5 h-3.5" />
                          <span>Investigate</span>
                        </button>
                        <button
                          onClick={() => setSelectedTxnForAction(txn)}
                          className="btn-premium-secondary px-3 py-1.5 text-xs"
                        >
                          Action
                        </button>
                      </div>
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

      {/* Quick Action Modal */}
      {selectedTxnForAction && (
        <QuickActionModal
          transaction={selectedTxnForAction}
          onClose={() => setSelectedTxnForAction(null)}
        />
      )}

    </div>
  );
}
