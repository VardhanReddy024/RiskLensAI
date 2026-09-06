import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RazorpayMonitorPage } from '../components/pages/RazorpayMonitorPage';
import { RazorpayTransactionFeed } from '../components/razorpay/RazorpayTransactionFeed';
import { RazorpayTransactionDetail } from '../components/razorpay/RazorpayTransactionDetail';
import { RazorpayRiskCard } from '../components/razorpay/RazorpayRiskCard';
import { WebhookStatusPanel } from '../components/razorpay/WebhookStatusPanel';
import { AuthProvider } from '../context/AuthContext';
import { TransactionProvider } from '../context/TransactionContext';
import { InvestigationProvider } from '../context/InvestigationContext';
import { Transaction } from '../types';
import { loadClientConfig } from '../config';
import * as apiModule from '../lib/api';

vi.mock('../lib/firebase', () => ({
  auth: {},
  onAuthStateChanged: vi.fn((_auth, callback) => {
    callback(null);
    return vi.fn();
  }),
  signInWithGoogle: vi.fn(),
  signOutFromFirebase: vi.fn(),
}));

const mockRazorpayTransaction: Transaction = {
  id: 'TXN-RZP-pay_mock_123456',
  customerId: 'CUST-RZP-test_customer',
  customerName: 'Aarav Sharma',
  customerEmail: 'aarav.sharma@example.in',
  customerTenureMonths: 12,
  amount: 45000,
  currency: 'INR',
  merchant: 'Croma Electronics',
  merchantCategory: 'Electronics',
  timestamp: new Date().toISOString(),
  location: {
    city: 'Mumbai',
    country: 'IN',
    lat: 19.076,
    lon: 72.8777,
    distanceFromHomeKm: 12,
  },
  device: {
    id: 'DEV-RZP-123456',
    type: 'Mobile',
    os: 'Android 14',
    browser: 'Chrome Mobile',
    fingerprintScore: 88,
    isKnownCustomerDevice: true,
  },
  ipAddress: {
    ip: '103.21.124.5',
    country: 'IN',
    city: 'Mumbai',
    isVpn: false,
    isTor: false,
    isProxy: false,
    proxyRiskScore: 12,
  },
  paymentMethod: {
    type: 'Credit Card',
    last4: '4321',
    issuer: 'HDFC Bank',
    cardCountry: 'IN',
    is3DSecure: true,
  },
  provider: 'razorpay',
  providerPaymentId: 'pay_mock_123456',
  providerOrderId: 'order_mock_987654',
  providerEventId: 'evt_mock_112233',
  tenantId: 'tenant_razorpay_merchant',
  riskScore: 82,
  fraudProbability: 0.82,
  confidenceScore: 0.94,
  riskTier: 'CRITICAL',
  riskLevel: 'CRITICAL',
  riskDecision: 'REJECT',
  riskFactors: [
    'Unusual transaction amount compared to customer baseline',
    'Abnormal velocity in 1-hour window',
    'Behavioral deviation on new merchant category',
  ],
  status: 'flagged',
  estimatedLossPrevented: 45000,
  tags: ['razorpay', 'card', 'high_value'],
  flagReasons: ['ML High Risk Anomaly (Score: 82)'],
};

describe('Razorpay Frontend Experience & Verification (10 Scenarios)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Razorpay page renders
  it('1. RazorpayMonitorPage renders without crashing and shows header telemetry', async () => {
    vi.spyOn(apiModule.razorpayApi, 'getTransactions').mockResolvedValue({
      ok: true,
      json: async () => ({ transactions: [mockRazorpayTransaction] }),
    } as any);

    vi.spyOn(apiModule, 'getBackendHealth').mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'LIVE',
        platform: 'RiskLens AI',
        version: '2.4.0-prod',
        database: { status: 'connected', adapter: 'firestore', counts: { transactions: 1 } },
        services: { gemini: true, ml_engine: true, orchestrator: true },
      }),
    } as any);

    render(
      <AuthProvider>
        <TransactionProvider>
          <InvestigationProvider>
            <RazorpayMonitorPage onNavigateToInvestigation={vi.fn()} />
          </InvestigationProvider>
        </TransactionProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Razorpay Risk Surveillance Center/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Polling Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Razorpay Ingested Volume/i)).toBeInTheDocument();
  });

  // 2. Transaction feed renders backend data
  it('2. Transaction feed renders real backend data including Payment ID and Order ID', () => {
    const handleSelect = vi.fn();
    const handleInvestigate = vi.fn();

    render(
      <RazorpayTransactionFeed
        transactions={[mockRazorpayTransaction]}
        isLoading={false}
        onSelectTransaction={handleSelect}
        onInvestigate={handleInvestigate}
      />
    );

    expect(screen.getByText('pay_mock_123456')).toBeInTheDocument();
    expect(screen.getByText('Order: order_mock_987654')).toBeInTheDocument();
    expect(screen.getByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText(/45,000/)).toBeInTheDocument();
    expect(screen.getByText('REJECT')).toBeInTheDocument();
  });

  // 3. Loading state
  it('3. Loading state displays animated loading feedback', () => {
    render(
      <RazorpayTransactionFeed
        transactions={[]}
        isLoading={true}
        onSelectTransaction={vi.fn()}
        onInvestigate={vi.fn()}
      />
    );

    expect(screen.getByText(/Loading Razorpay transactions/i)).toBeInTheDocument();
  });

  // 4. Empty state
  it('4. Empty state displays clear instructional guidance when no payments exist', () => {
    render(
      <RazorpayTransactionFeed
        transactions={[]}
        isLoading={false}
        onSelectTransaction={vi.fn()}
        onInvestigate={vi.fn()}
      />
    );

    expect(screen.getByText(/No Razorpay Transactions Found/i)).toBeInTheDocument();
  });

  // 5. API error state
  it('5. Handles API failure gracefully without breaking dashboard UI', async () => {
    vi.spyOn(apiModule.razorpayApi, 'getTransactions').mockRejectedValue(new Error('Network error'));
    vi.spyOn(apiModule, 'getBackendHealth').mockRejectedValue(new Error('Server unreachable'));

    render(
      <AuthProvider>
        <TransactionProvider>
          <InvestigationProvider>
            <RazorpayMonitorPage onNavigateToInvestigation={vi.fn()} />
          </InvestigationProvider>
        </TransactionProvider>
      </AuthProvider>
    );

    expect(screen.getByText(/Razorpay Risk Surveillance Center/i)).toBeInTheDocument();
  });

  // 6. Risk score rendering
  it('6. Risk score renders with correct score value (82/100), tier, and ML factors', () => {
    render(<RazorpayRiskCard transaction={mockRazorpayTransaction} />);

    expect(screen.getByText('82 / 100')).toBeInTheDocument();
    expect(screen.getAllByText(/CRITICAL/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/REJECT \(Escalated \/ Blocked\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Unusual transaction amount compared to customer baseline/i)).toBeInTheDocument();
  });

  // 7. Transaction detail rendering
  it('7. Transaction detail modal renders all telemetry, gateway IDs, and action buttons', () => {
    const handleClose = vi.fn();
    const handleInvestigate = vi.fn();
    const handleGraph = vi.fn();

    render(
      <RazorpayTransactionDetail
        transaction={mockRazorpayTransaction}
        onClose={handleClose}
        onInvestigate={handleInvestigate}
        onOpenGraph={handleGraph}
      />
    );

    expect(screen.getByText(/Payment Gateway Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText('evt_mock_112233')).toBeInTheDocument();
    expect(screen.getByText('Mumbai, IN (12 km)')).toBeInTheDocument();
    expect(screen.getByText(/Launch AI Investigation/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/Launch AI Investigation/i));
    expect(handleInvestigate).toHaveBeenCalledWith(mockRazorpayTransaction);
  });

  // 8. Authentication protection
  it('8. Authenticated requests automatically attach Bearer token in apiFetch', async () => {
    localStorage.setItem(
      'risklens_auth_user',
      JSON.stringify({ email: 'analyst@risklens.ai', token: 'mock_jwt_token_123' })
    );

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ transactions: [] }),
    });
    global.fetch = mockFetch;

    await apiModule.razorpayApi.getTransactions();

    expect(mockFetch).toHaveBeenCalled();
    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1]?.headers;
    const authHeader = headers instanceof Headers ? headers.get('Authorization') : headers?.Authorization;
    expect(authHeader).toBe('Bearer mock_jwt_token_123');
  });

  // 9. Secret values never appear in frontend configuration
  it('9. Never exposes RAZORPAY_KEY_SECRET, WEBHOOK_SECRET, or DATABASE_URL in client environment', () => {
    const config = loadClientConfig();
    expect((config as any).RAZORPAY_KEY_SECRET).toBeUndefined();
    expect((config as any).RAZORPAY_WEBHOOK_SECRET).toBeUndefined();
    expect((config as any).DATABASE_URL).toBeUndefined();
    expect((config as any).GEMINI_API_KEY).toBeUndefined();
    expect((config as any).VITE_RAZORPAY_KEY_SECRET).toBeUndefined();
    expect((config as any).VITE_RAZORPAY_WEBHOOK_SECRET).toBeUndefined();
  });

  // 10. Webhook status rendering
  it('10. Webhook status panel displays connected state and database metrics', async () => {
    vi.spyOn(apiModule, 'getBackendHealth').mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'LIVE',
        platform: 'RiskLens AI',
        version: '2.4.0-prod',
        database: { status: 'connected', adapter: 'firestore', counts: { transactions: 42, dossiers: 12 } },
        services: { gemini: true, ml_engine: true, orchestrator: true },
      }),
    } as any);

    render(<WebhookStatusPanel />);

    await waitFor(() => {
      expect(screen.getByText('CONNECTED')).toBeInTheDocument();
      expect(screen.getByText('42 transactions stored')).toBeInTheDocument();
      expect(screen.getByText('ML Engine Active')).toBeInTheDocument();
      expect(screen.getByText('8-Agent Orchestrator Active')).toBeInTheDocument();
    });
  });
});
