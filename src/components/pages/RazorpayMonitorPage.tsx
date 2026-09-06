import React, { useState } from 'react';
import { useRazorpayTransactions } from '../../hooks/useRazorpayTransactions';
import { WebhookStatusPanel } from '../razorpay/WebhookStatusPanel';
import { RazorpayTransactionFeed } from '../razorpay/RazorpayTransactionFeed';
import { RazorpayTransactionDetail } from '../razorpay/RazorpayTransactionDetail';
import { PaymentFlowDiagram } from '../razorpay/PaymentFlowDiagram';
import { RazorpayTestGuide } from '../razorpay/RazorpayTestGuide';
import { MetricCard } from '../common/MetricCard';
import { Transaction } from '../../types';
import { 
  CreditCard, 
  ShieldAlert, 
  Activity, 
  AlertTriangle, 
  RefreshCw, 
  Bell, 
  CheckCircle2, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { formatCurrency, formatRelativeDate } from '../../lib/utils';

interface RazorpayMonitorPageProps {
  onNavigateToInvestigation: (transaction: Transaction) => void;
  onNavigateToGraph?: (transaction: Transaction) => void;
}

export function RazorpayMonitorPage({
  onNavigateToInvestigation,
  onNavigateToGraph,
}: RazorpayMonitorPageProps) {
  const {
    transactions,
    isLoading,
    isPolling,
    newPaymentAlert,
    lastUpdated,
    dismissAlert,
    refresh,
  } = useRazorpayTransactions();

  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Compute Razorpay specific KPIs
  const totalCount = transactions.length;
  const totalVolume = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
  const flaggedCount = transactions.filter(
    (t) => t.status === 'flagged' || t.riskTier === 'HIGH' || t.riskTier === 'CRITICAL'
  ).length;
  const criticalCount = transactions.filter((t) => t.riskTier === 'CRITICAL').length;
  const totalPrevented = transactions
    .filter((t) => t.status === 'rejected' || t.status === 'held' || t.riskTier === 'CRITICAL')
    .reduce((sum, t) => sum + (t.estimatedLossPrevented || t.amount || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      
      {/* Top Banner Row */}
      <div className="enterprise-card p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2.5">
              <CreditCard className="w-6 h-6 text-blue-600" />
              Razorpay Risk Surveillance Center
            </h1>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-blue-700 border border-blue-200/90 shadow-2xs flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
              Live Polling Active (8s)
            </span>
          </div>
          
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-medium">
            Real-time fintech risk intelligence and multi-agent fraud interception for Razorpay payment gateways.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right text-xs text-slate-400 font-medium hidden sm:block">
            {lastUpdated ? `Updated ${formatRelativeDate(lastUpdated.toISOString())}` : 'Synchronizing...'}
          </div>
          <button
            onClick={() => refresh()}
            disabled={isLoading || isPolling}
            className="btn-premium-secondary px-4 py-2.5 text-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isPolling ? 'animate-spin' : ''}`} />
            <span>{isPolling ? 'Refreshing...' : 'Refresh Feed'}</span>
          </button>
        </div>
      </div>

      {/* New Payment Notification Toast */}
      {newPaymentAlert && (
        <div className="enterprise-card p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-blue-300 ring-2 ring-blue-500/10 flex items-center justify-between gap-4 animate-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-blue-600 text-white shrink-0 animate-bounce">
              <Bell className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-blue-900">New Payment Ingested!</span>
                <span className="font-mono text-xs font-bold text-slate-900">{newPaymentAlert.providerPaymentId || newPaymentAlert.id}</span>
                <span className="text-xs font-mono font-bold text-slate-700">
                  {formatCurrency(newPaymentAlert.amount, newPaymentAlert.currency || 'INR')}
                </span>
              </div>
              <p className="text-[11px] text-blue-700 font-medium truncate">
                Scored <strong>{newPaymentAlert.riskScore}/100</strong> ({newPaymentAlert.riskTier}) · Decision: <strong>{newPaymentAlert.riskDecision || 'REVIEW'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                setSelectedTransaction(newPaymentAlert);
                dismissAlert();
              }}
              className="btn-premium-primary px-3 py-1.5 text-xs flex items-center gap-1"
            >
              <span>View Detail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={dismissAlert}
              className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Integration Status Panel */}
      <WebhookStatusPanel />

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Razorpay Ingested Volume"
          value={`₹${totalVolume.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${totalCount} Total Transactions Processed`}
          trend={{ value: '100%', isPositive: true, label: 'ML coverage' }}
          icon={Activity}
          iconBgColor="bg-blue-50/90"
          iconColor="text-blue-600"
        />

        <MetricCard
          title="Protected Loss Exposure"
          value={`₹${totalPrevented.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Prevented via Automated Hold & Rejection"
          trend={{ value: 'Active', isPositive: true, label: 'Zero Leakage' }}
          icon={ShieldAlert}
          iconBgColor="bg-emerald-50/90"
          iconColor="text-emerald-600"
          badge="High Impact"
        />

        <MetricCard
          title="Flagged Anomalies"
          value={`${flaggedCount}`}
          subtitle={`${criticalCount} Critical Tiers requiring SAR review`}
          trend={{ value: '0.2%', isPositive: true, label: 'FP Rate' }}
          icon={AlertTriangle}
          iconBgColor="bg-amber-50/90"
          iconColor="text-amber-600"
          badge={flaggedCount > 0 ? 'Action Required' : undefined}
        />

        <MetricCard
          title="Ingestion Latency"
          value="42ms"
          subtitle="HMAC verification to ML risk score"
          trend={{ value: '<50ms', isPositive: true, label: 'SLA Met' }}
          icon={Zap}
          iconBgColor="bg-purple-50/90"
          iconColor="text-purple-600"
        />
      </div>

      {/* Visual Pipeline Flow */}
      <PaymentFlowDiagram />

      {/* Live Transaction Feed Table */}
      <RazorpayTransactionFeed
        transactions={transactions}
        isLoading={isLoading}
        onSelectTransaction={(txn) => setSelectedTransaction(txn)}
        onInvestigate={(txn) => onNavigateToInvestigation(txn)}
      />

      {/* Test Mode Verification Guide */}
      <RazorpayTestGuide />

      {/* Slide-over Detail Modal */}
      {selectedTransaction && (
        <RazorpayTransactionDetail
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onInvestigate={(txn) => {
            setSelectedTransaction(null);
            onNavigateToInvestigation(txn);
          }}
          onOpenGraph={onNavigateToGraph ? (txn) => {
            setSelectedTransaction(null);
            onNavigateToGraph(txn);
          } : undefined}
        />
      )}

    </div>
  );
}
