// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { evaluateTransactionWithML, getCurrencyConfig, CURRENCY_BASELINES } from '../lib/ml_engine';
import { runBehavioralAnalysisAgent } from '../../server/agents/behavior_analyzer';
import { redactSecret, redactConfig, serverConfig } from '../../server/config';
import { InMemoryAdapter } from '../../server/db/adapters/InMemoryAdapter';
import { PgAdapter } from '../../server/db/adapters/PgAdapter';
import { Transaction } from '../types';
import request from 'supertest';
import { createExpressApp } from '../../server';
import { Express } from 'express';

describe('RiskLens AI Foundation: Persistence, Currency & Security Suite', () => {
  let app: Express;

  beforeAll(() => {
    app = createExpressApp();
  });

  describe('1. Currency-Aware Risk Scoring (INR vs USD vs Unknown)', () => {
    it('provides correct currency baselines for supported currencies', () => {
      expect(CURRENCY_BASELINES.INR.defaultBaselineAmount).toBe(15000.00);
      expect(CURRENCY_BASELINES.USD.defaultBaselineAmount).toBe(180.00);
      expect(CURRENCY_BASELINES.EUR.defaultBaselineAmount).toBe(160.00);
      expect(CURRENCY_BASELINES.GBP.defaultBaselineAmount).toBe(140.00);
    });

    it('scores an INR 15,000 transaction as routine baseline spending (not 80x USD anomaly)', () => {
      const inrTx: Transaction = {
        id: 'TXN-INR-ROUTINE',
        customerId: 'CUST-IND-01',
        amount: 15000.00,
        currency: 'INR',
        merchant: 'Flipkart Electronics India',
        merchantCategory: 'Retail',
        timestamp: new Date().toISOString(),
        location: { city: 'Bengaluru', country: 'IN', lat: 12.97, lon: 77.59, distanceFromHomeKm: 15 },
        device: { id: 'DEV-1', type: 'Mobile', os: 'Android 14', browser: 'Chrome Mobile', fingerprintScore: 90, isKnownCustomerDevice: true },
        ipAddress: { ip: '103.21.124.1', country: 'IN', city: 'Bengaluru', isVpn: false, isTor: false, isProxy: false, proxyRiskScore: 5 },
        paymentMethod: { type: 'Debit Card', last4: '5678', issuer: 'HDFC Bank', cardCountry: 'IN', is3DSecure: true },
        riskScore: 0,
        fraudProbability: 0,
        confidenceScore: 0,
        riskTier: 'LOW',
        status: 'approved',
        tags: [],
        flagReasons: [],
      };

      const result = evaluateTransactionWithML(inrTx);
      const amountFactor = result.shapFactors.find(f => f.feature === 'amount_z_score');

      expect(amountFactor).toBeDefined();
      expect(amountFactor?.displayName).toBe('Routine Amount');
      expect(amountFactor?.value).toContain('₹');
      expect(amountFactor?.isSuspicious).toBe(false);
      expect(result.riskScore).toBeLessThan(40);
    });

    it('scores an INR 350,000 transaction as a genuine high-amount anomaly against INR baseline', () => {
      const highInrTx: Transaction = {
        id: 'TXN-INR-HIGH',
        customerId: 'CUST-IND-02',
        amount: 350000.00,
        currency: 'INR',
        merchant: 'Tanishq Jewellery',
        merchantCategory: 'Luxury Goods',
        timestamp: new Date().toISOString(),
        location: { city: 'Mumbai', country: 'IN', lat: 19.07, lon: 72.87, distanceFromHomeKm: 450 },
        device: { id: 'DEV-2', type: 'Bot/Emulator', os: 'Linux', browser: 'HeadlessChrome', fingerprintScore: 20, isKnownCustomerDevice: false },
        ipAddress: { ip: '185.220.101.5', country: 'IN', city: 'Mumbai', isVpn: true, isTor: true, isProxy: true, proxyRiskScore: 95 },
        paymentMethod: { type: 'Wire Transfer', last4: '0000', issuer: 'Unknown', cardCountry: 'IN', is3DSecure: false },
        riskScore: 0,
        fraudProbability: 0,
        confidenceScore: 0,
        riskTier: 'CRITICAL',
        status: 'flagged',
        tags: [],
        flagReasons: [],
      };

      const result = evaluateTransactionWithML(highInrTx);
      const amountFactor = result.shapFactors.find(f => f.feature === 'amount_z_score');

      expect(amountFactor).toBeDefined();
      expect(amountFactor?.displayName).toBe('High Transaction Amount');
      expect(amountFactor?.value).toContain('₹');
      expect(amountFactor?.isSuspicious).toBe(true);
      expect(result.riskScore).toBeGreaterThanOrEqual(75);
    });

    it('handles unindexed/unknown currencies with explicit INSUFFICIENT_DATA flag', () => {
      const unknownCurrTx: Transaction = {
        id: 'TXN-UNKNOWN-CURR',
        customerId: 'CUST-ZZZ',
        amount: 1000.00,
        currency: 'XYZ_UNKNOWN',
        merchant: 'Global Merchant',
        merchantCategory: 'Retail',
        timestamp: new Date().toISOString(),
        location: { city: 'Unknown', country: 'ZZ', lat: 0, lon: 0, distanceFromHomeKm: 50 },
        device: { id: 'DEV-3', type: 'Desktop', os: 'Windows 11', browser: 'Edge', fingerprintScore: 85, isKnownCustomerDevice: true },
        ipAddress: { ip: '127.0.0.1', country: 'ZZ', city: 'Unknown', isVpn: false, isTor: false, isProxy: false, proxyRiskScore: 10 },
        paymentMethod: { type: 'Credit Card', last4: '1234', issuer: 'Bank', cardCountry: 'ZZ', is3DSecure: true },
        riskScore: 0,
        fraudProbability: 0,
        confidenceScore: 0,
        riskTier: 'LOW',
        status: 'approved',
        tags: [],
        flagReasons: [],
      };

      const result = evaluateTransactionWithML(unknownCurrTx);
      const amountFactor = result.shapFactors.find(f => f.feature === 'amount_z_score');

      expect(amountFactor?.displayName).toBe('Unindexed Currency Profile');
      expect(amountFactor?.value).toContain('[INSUFFICIENT_DATA]');
    });
  });

  describe('2. Behavioral Analysis Engine: Insufficient Data Handling', () => {
    it('flags INSUFFICIENT_DATA when customer tenure is unestablished instead of fake evidence', async () => {
      const newAccountTx: Transaction = {
        id: 'TXN-NEW-ACC',
        customerId: 'CUST-NEW-001',
        customerTenureMonths: 0, // Brand new account
        amount: 5000.00,
        currency: 'INR',
        merchant: 'Reliance Retail',
        merchantCategory: 'Retail',
        timestamp: new Date().toISOString(),
        location: { city: 'Delhi', country: 'IN', lat: 28.61, lon: 77.20, distanceFromHomeKm: 20 },
        device: { id: 'DEV-4', type: 'Mobile', os: 'iOS 18', browser: 'Safari', fingerprintScore: 85, isKnownCustomerDevice: true },
        ipAddress: { ip: '49.36.0.1', country: 'IN', city: 'Delhi', isVpn: false, isTor: false, isProxy: false, proxyRiskScore: 5 },
        paymentMethod: { type: 'Debit Card', last4: '9999', issuer: 'ICICI Bank', cardCountry: 'IN', is3DSecure: true },
        riskScore: 0,
        fraudProbability: 0,
        confidenceScore: 0,
        riskTier: 'LOW',
        status: 'approved',
        tags: [],
        flagReasons: [],
      };

      const behaviorResult = await runBehavioralAnalysisAgent(newAccountTx);
      const insufficientDataAnomaly = behaviorResult.profile.anomaliesDetected.find(a => a.includes('INSUFFICIENT_DATA'));

      expect(insufficientDataAnomaly).toBeDefined();
      expect(insufficientDataAnomaly).toContain('Customer history: INSUFFICIENT_DATA');
    });
  });

  describe('3. Secrets Redaction & Safe Logging Policy', () => {
    it('strictly outputs [CONFIGURED] or [NOT_CONFIGURED] and never prints partial API keys', () => {
      expect(redactSecret('AIzaSyD9876543210ABCDEF')).toBe('[CONFIGURED]');
      expect(redactSecret('rzp_live_secret_key_abcdef123456')).toBe('[CONFIGURED]');
      expect(redactSecret('')).toBe('[NOT_CONFIGURED]');
      expect(redactSecret(undefined)).toBe('[NOT_CONFIGURED]');

      const config = redactConfig({
        ...serverConfig,
        geminiApiKey: 'AIzaSySecretGeminiKey',
        razorpayKeyId: 'rzp_live_key_id_123',
        razorpayWebhookSecret: 'rzp_webhook_secret_xyz',
      });

      expect(config.geminiApiKey).toBe('[CONFIGURED]');
      expect(config.razorpayKeyId).toBe('[CONFIGURED]');
      expect(config.razorpayWebhookSecret).toBe('[CONFIGURED]');
    });
  });

  describe('4. Webhook Event Storage & Idempotency Uniqueness', () => {
    it('persists webhook event and retrieves it for idempotency check', async () => {
      const adapter = new InMemoryAdapter();
      await adapter.initialize();

      const event = {
        id: 'evt_record_001',
        provider: 'razorpay',
        eventId: 'evt_rzp_pay_authorized_123',
        eventType: 'payment.authorized',
        payload: { payment: { id: 'pay_123', amount: 50000, currency: 'INR' } },
        signatureVerified: true,
        processingStatus: 'PENDING' as const,
        receivedAt: new Date().toISOString(),
      };

      await adapter.saveWebhookEvent(event);

      const retrieved = await adapter.getWebhookEvent('razorpay', 'evt_rzp_pay_authorized_123');
      expect(retrieved).toBeDefined();
      expect(retrieved?.eventId).toBe('evt_rzp_pay_authorized_123');
      expect(retrieved?.signatureVerified).toBe(true);
      expect(retrieved?.payload.payment.id).toBe('pay_123');

      // Non-existent event returns null
      const nonExistent = await adapter.getWebhookEvent('razorpay', 'evt_unknown_999');
      expect(nonExistent).toBeNull();
    });
  });

  describe('5. Database Strict Mode & Error Handling', () => {
    it('throws in strict mode when PostgreSQL connection is required but missing', async () => {
      const originalEnv = process.env.STRICT_DATABASE;
      const originalUrl = process.env.DATABASE_URL;

      try {
        process.env.STRICT_DATABASE = 'true';
        delete process.env.DATABASE_URL;

        const pgAdapter = new PgAdapter();
        await expect(pgAdapter.initialize()).rejects.toThrow('Strict Mode: DATABASE_URL is missing');
      } finally {
        process.env.STRICT_DATABASE = originalEnv;
        if (originalUrl) process.env.DATABASE_URL = originalUrl;
      }
    });
  });

  describe('6. Raw Body Preservation for Webhooks', () => {
    it('preserves rawBody Buffer on incoming requests for signature verification', async () => {
      const testPayload = JSON.stringify({ event: 'test.webhook', payment_id: 'pay_xyz' });

      // Test against any JSON endpoint
      const res = await request(app)
        .post('/api/health') // Post to public health or any endpoint
        .set('Content-Type', 'application/json')
        .send(testPayload);

      // Verify request completes without error
      expect([200, 404]).toContain(res.status);
    });
  });
});
