import React, { useState } from 'react';
import { Transaction } from '../../types';
import { RiskGauge } from '../common/RiskGauge';
import { formatCurrency, formatRelativeDate, getRiskColorClasses } from '../../lib/utils';
import { SearchCode, Eye, Search, Filter, AlertCircle, ArrowUpDown } from 'lucide-react';

interface RazorpayTransactionFeedProps {
  transactions: Transaction[];
  isLoading: boolean;
  onSelectTransaction: (txn: Transaction) => void;
  onInvestigate: (txn: Transaction) => void;
}

export function RazorpayTransactionFeed({
  transactions,
  isLoading,
  onSelectTransaction,
  onInvestigate,
}: RazorpayTransactionFeedProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.providerPaymentId && t.providerPaymentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.providerOrderId && t.providerOrderId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.customerEmail && t.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || t.status.toLowerCase() === statusFilter.toLowerCase();

    const matchesTier =
      tierFilter === 'all' || (t.riskTier || t.riskLevel || '').toLowerCase() === tierFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesTier;
  });

  return (
    <div className="enterprise-card-static overflow-hidden">
      {/* Controls Header */}
      <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/40">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            Razorpay Payment Ingestion Feed
          </h3>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Live stream of webhook events normalized into RiskLens transaction intelligence
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search pay_id, order_id, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3.5 py-2 text-xs rounded-xl border border-slate-200/90 bg-white/90 focus:outline-hidden focus:ring-2 focus:ring-blue-500 w-60 shadow-2xs font-medium"
            />
          </div>

          {/* Tier Filter */}
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200/90 bg-white/90 font-semibold text-slate-700 focus:outline-hidden shadow-2xs cursor-pointer"
          >
            <option value="all">All Risk Tiers</option>
            <option value="critical">Critical (80-100)</option>
            <option value="high">High (60-79)</option>
            <option value="medium">Medium (30-59)</option>
            <option value="low">Low (0-29)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200/90 bg-white/90 font-semibold text-slate-700 focus:outline-hidden shadow-2xs cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="flagged">Flagged / Under Review</option>
            <option value="approved">Captured / Approved</option>
            <option value="rejected">Failed / Rejected</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200/70">
            <tr>
              <th className="px-5 py-3.5">Razorpay Payment & Order</th>
              <th className="px-5 py-3.5">Customer / Contact</th>
              <th className="px-5 py-3.5">Amount (INR)</th>
              <th className="px-5 py-3.5">Payment Method</th>
              <th className="px-5 py-3.5">ML Risk Score</th>
              <th className="px-5 py-3.5">Decision</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">Loading Razorpay transactions...</span>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2 max-w-md mx-auto">
                    <AlertCircle className="w-8 h-8 text-slate-300 mb-1" />
                    <p className="text-sm font-bold text-slate-700">No Razorpay Transactions Found</p>
                    <p className="text-xs text-slate-400">
                      Trigger a test payment using the Razorpay test-mode integration or verify webhook delivery to start ingesting payments.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((txn) => {
                const tier = txn.riskTier || txn.riskLevel || 'LOW';
                const colors = getRiskColorClasses(tier);
                const decision = txn.riskDecision || (txn.riskScore >= 75 ? 'REJECT' : (txn.riskScore >= 60 ? 'REVIEW' : (txn.riskScore >= 30 ? 'REVIEW' : 'ALLOW')));

                return (
                  <tr key={txn.id} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Payment & Order ID */}
                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {txn.providerPaymentId || txn.id}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                        {txn.providerOrderId ? `Order: ${txn.providerOrderId}` : `Internal: ${txn.id}`}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {formatRelativeDate(txn.timestamp)}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">
                        {txn.customerName || 'Razorpay Customer'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {txn.customerEmail || txn.customerId}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {formatCurrency(txn.amount, txn.currency || 'INR')}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        {txn.currency || 'INR'}
                      </div>
                    </td>

                    {/* Payment Method */}
                    <td className="px-5 py-4">
                      <div className="text-slate-800 font-medium">
                        {txn.paymentMethod?.type || 'Digital Payment'}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {txn.paymentMethod?.last4 ? `•••• ${txn.paymentMethod.last4}` : txn.paymentMethod?.issuer || 'Direct'}
                      </div>
                    </td>

                    {/* Risk Score */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <RiskGauge score={txn.riskScore} tier={tier} size="sm" showLabel={false} />
                        <div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${colors.badge}`}>
                            {tier} ({txn.riskScore})
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {Math.round((txn.confidenceScore || 0.95) * 100)}% Conf
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Risk Decision */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-wide ${
                        decision === 'ALLOW' ? 'bg-emerald-100 text-emerald-800' :
                        decision === 'REVIEW' ? 'bg-amber-100 text-amber-900' :
                        decision === 'MITIGATE' ? 'bg-purple-100 text-purple-900' :
                        'bg-rose-100 text-rose-900'
                      }`}>
                        {decision}
                      </span>
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
                          onClick={() => onSelectTransaction(txn)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 transition-all"
                          title="View Payment Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Detail</span>
                        </button>
                        <button
                          onClick={() => onInvestigate(txn)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs flex items-center gap-1.5 transition-all border border-blue-200/80 hover:shadow-2xs"
                        >
                          <SearchCode className="w-3.5 h-3.5" />
                          <span>Investigate</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
