// @vitest-environment node
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createExpressApp } from '../../server';
import { Express } from 'express';
import { razorpayService } from '../../server/services/razorpay.service';
import { db } from '../../server/db';
import { redactSecret, redactConfig, serverConfig } from '../../server/config';

describe('RiskLens AI Phase 3A: Razorpay Test-Mode Payment Ingestion & Webhook Suite', () => {
  let app: Express;
  const testSecret = 'rzp_test_webhook_secret_998877';

  // Helper to generate legitimate HMAC-SHA256 signature for test payloads
  const signPayload = (payload: any, secret = testSecret): { body: string; signature: string } => {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return { body, signature };
  };

  beforeAll(() => {
    // Override secret for testing deterministic signatures
    process.env.RAZORPAY_WEBHOOK_SECRET = testSecret;
    serverConfig.razorpayWebhookSecret = testSecret;
    app = createExpressApp();
  });

  beforeEach(async () => {
    await db.adapter.initialize();
  });

  // ==========================================================================
  // 1. Webhook Signature Verification Suite
  // ==========================================================================
  describe('1. Webhook Signature Verification', () => {
    const validPaymentPayload = {
      entity: 'event',
      account_id: 'acc_test_merchant_01',
      event: 'payment.captured',
      event_id: `evt_test_${Date.now()}_01`,
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: `pay_test_${Date.now()}_01`,
            entity: 'payment',
            amount: 50000, // ₹500.00 in paisa
            currency: 'INR',
            status: 'captured',
            order_id: 'order_test_999',
            method: 'card',
            email: 'rahul.sharma@example.in',
            contact: '+919876543210',
            card: {
              last4: '4242',
              network: 'Visa',
              type: 'credit',
              international: false,
            },
            notes: {
              merchant: 'Croma Electronics Mumbai',
              customer_name: 'Rahul Sharma',
            },
            created_at: Math.floor(Date.now() / 1000),
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    it('accepts valid Razorpay webhook with correct HMAC-SHA256 signature', async () => {
      const { body, signature } = signPayload(validPaymentPayload);

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe('PROCESSED');
      expect(res.body.transactionId).toBe(`TXN-RZP-${validPaymentPayload.payload.payment.entity.id}`);
    });

    it('rejects webhook with invalid signature with HTTP 400', async () => {
      const { body } = signPayload(validPaymentPayload);
      const invalidSignature = 'invalid_sha256_hash_9999999999999999999999999999999999999999999999999999999999999999';

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', invalidSignature)
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('Invalid Razorpay webhook signature');
    });

    it('rejects webhook with missing signature header with HTTP 400', async () => {
      const { body } = signPayload(validPaymentPayload);

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .send(body);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects modified/tampered payload even if signature header is present with HTTP 400', async () => {
      const originalPayload = { ...validPaymentPayload };
      const { signature } = signPayload(originalPayload);

      // Tamper amount after signing
      const tamperedPayload = {
        ...originalPayload,
        payload: {
          payment: {
            entity: {
              ...originalPayload.payload.payment.entity,
              amount: 99999999, // Tampered amount
            },
          },
        },
      };

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(JSON.stringify(tamperedPayload));

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('handles malformed JSON body gracefully with HTTP 400', async () => {
      const malformedBody = '{ "event": "payment.captured", "unclosed_json: ';
      const signature = crypto.createHmac('sha256', testSecret).update(malformedBody).digest('hex');

      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(malformedBody);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  // ==========================================================================
  // 2. Idempotency & Duplicate Prevention
  // ==========================================================================
  describe('2. Idempotency & Duplicate Event Handling', () => {
    it('processes first webhook event and idempotently acknowledges duplicate replay without re-creating transaction', async () => {
      const eventId = `evt_idemp_${Date.now()}`;
      const paymentId = `pay_idemp_${Date.now()}`;

      const payload = {
        entity: 'event',
        account_id: 'acc_idemp_merchant',
        event: 'payment.captured',
        event_id: eventId,
        contains: ['payment'],
        payload: {
          payment: {
            entity: {
              id: paymentId,
              amount: 150000, // ₹1,500.00
              currency: 'INR',
              status: 'captured',
              method: 'upi',
              email: 'idemp.user@fintech.in',
              notes: { merchant: 'FreshBasket Online' },
              created_at: Math.floor(Date.now() / 1000),
            },
          },
        },
        created_at: Math.floor(Date.now() / 1000),
      };

      const { body, signature } = signPayload(payload);

      // First delivery: PROCESSED
      const firstRes = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(body);

      expect(firstRes.status).toBe(200);
      expect(firstRes.body.status).toBe('PROCESSED');
      expect(firstRes.body.eventId).toBe(eventId);

      const countAfterFirst = await db.transactions.count();

      // Second delivery (Replay / Network retry): DUPLICATE / IDEMPOTENT ACK
      const secondRes = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(body);

      expect(secondRes.status).toBe(200);
      expect(secondRes.body.success).toBe(true);
      expect(secondRes.body.idempotent).toBe(true);
      expect(secondRes.body.eventId).toBe(eventId);

      // Verify no duplicate transaction was created
      const countAfterSecond = await db.transactions.count();
      expect(countAfterSecond).toBe(countAfterFirst);
    });
  });

  // ==========================================================================
  // 3. Payment Lifecycle Events (Captured vs Failed vs Unsupported)
  // ==========================================================================
  describe('3. Payment Lifecycle & Event Types', () => {
    it('handles payment.captured: sets status to approved (if low risk) and normalizes INR amount', async () => {
      const paymentId = `pay_cap_${Date.now()}`;
      const payload = {
        entity: 'event',
        event: 'payment.captured',
        event_id: `evt_cap_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: paymentId,
              amount: 249900, // ₹2,499.00
              currency: 'INR',
              status: 'captured',
              method: 'card',
              email: 'customer.delhi@gmail.com',
              notes: { merchant: 'Amazon India' },
              created_at: Math.floor(Date.now() / 1000),
            },
          },
        },
      };

      const { body, signature } = signPayload(payload);
      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PROCESSED');

      // Check persisted transaction
      const txn = await db.transactions.getById(`TXN-RZP-${paymentId}`);
      expect(txn).toBeDefined();
      expect(txn?.amount).toBe(2499.00); // 249900 / 100
      expect(txn?.currency).toBe('INR');
      expect(txn?.provider).toBe('razorpay');
      expect(txn?.providerPaymentId).toBe(paymentId);
      expect(txn?.status).toBe('approved');
      expect(txn?.riskScore).toBeDefined();
      expect(txn?.riskTier).toBeDefined();
    });

    it('handles payment.failed: records rejected transaction with failure error reasons', async () => {
      const paymentId = `pay_fail_${Date.now()}`;
      const payload = {
        entity: 'event',
        event: 'payment.failed',
        event_id: `evt_fail_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: paymentId,
              amount: 890000, // ₹8,900.00
              currency: 'INR',
              status: 'failed',
              method: 'card',
              email: 'failed.payer@test.in',
              error_code: 'BAD_REQUEST_ERROR',
              error_description: 'Payment was declined by issuing bank due to insufficient funds',
              notes: { merchant: 'Flipkart India' },
              created_at: Math.floor(Date.now() / 1000),
            },
          },
        },
      };

      const { body, signature } = signPayload(payload);
      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PROCESSED');

      const txn = await db.transactions.getById(`TXN-RZP-${paymentId}`);
      expect(txn).toBeDefined();
      expect(txn?.status).toBe('rejected');
      expect(txn?.flagReasons).toContain('Payment was declined by issuing bank due to insufficient funds');
    });

    it('handles unsupported event (e.g. order.paid): acknowledges and records as IGNORED without creating transaction', async () => {
      const eventId = `evt_order_${Date.now()}`;
      const payload = {
        entity: 'event',
        event: 'order.paid',
        event_id: eventId,
        payload: {
          order: {
            entity: {
              id: `order_${Date.now()}`,
              amount: 10000,
              currency: 'INR',
              status: 'paid',
            },
          },
        },
      };

      const { body, signature } = signPayload(payload);
      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('IGNORED');
      expect(res.body.eventId).toBe(eventId);

      // Verify audit record exists
      const eventRecord = await db.adapter.getWebhookEvent('razorpay', eventId);
      expect(eventRecord).toBeDefined();
      expect(eventRecord?.processingStatus).toBe('IGNORED');
    });
  });

  // ==========================================================================
  // 4. INR Amount Normalization & Tenant Mapping
  // ==========================================================================
  describe('4. INR Normalization & Tenant Isolation', () => {
    it('accurately normalizes paisa to INR decimal amounts (₹4,500.50 from 450050)', () => {
      const mockPayment: any = {
        id: 'pay_amount_test',
        amount: 450050,
        currency: 'INR',
        status: 'captured',
        method: 'card',
        email: 'user@fintech.in',
      };

      const normalized = razorpayService.normalizePaymentToTransaction(
        mockPayment,
        'evt_test',
        'tenant_razorpay_merchant'
      );

      expect(normalized.amount).toBe(4500.50);
      expect(normalized.currency).toBe('INR');
      expect(normalized.tenantId).toBe('tenant_razorpay_merchant');
    });

    it('assigns controlled merchant tenant identity to normalized transaction', () => {
      const payload: any = { account_id: 'acc_hdfc_merchant_77' };
      const tenant = razorpayService.resolveTenantId(payload);
      expect(tenant).toBe('tenant_razorpay_merchant'); // Configured default tenant
    });
  });

  // ==========================================================================
  // 5. ML Risk Scoring Integration on Razorpay Transactions
  // ==========================================================================
  describe('5. ML Risk Engine Integration', () => {
    it('flags high-value anomalous INR transaction with risk metrics and loss prevention', async () => {
      const paymentId = `pay_anomaly_${Date.now()}`;
      const payload = {
        entity: 'event',
        event: 'payment.captured',
        event_id: `evt_anomaly_${Date.now()}`,
        payload: {
          payment: {
            entity: {
              id: paymentId,
              amount: 50000000, // ₹500,000.00 (High anomaly above ₹15,000 baseline)
              currency: 'INR',
              status: 'captured',
              method: 'netbanking',
              email: 'crypto.trader@tor-exit.net',
              notes: {
                merchant: 'Binance Peer-to-Peer Crypto',
                category: 'Crypto Exchange',
                is_tor: 'true',
                distance_km: '4500',
              },
              created_at: Math.floor(Date.now() / 1000),
            },
          },
        },
      };

      const { body, signature } = signPayload(payload);
      const res = await request(app)
        .post('/api/webhooks/razorpay')
        .set('Content-Type', 'application/json')
        .set('x-razorpay-signature', signature)
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PROCESSED');

      const txn = await db.transactions.getById(`TXN-RZP-${paymentId}`);
      expect(txn).toBeDefined();
      expect(txn?.amount).toBe(500000.00);
      expect(txn?.riskScore).toBeGreaterThanOrEqual(60);
      expect(txn?.status).toBe('flagged');
      expect(txn?.estimatedLossPrevented).toBe(500000.00);
      expect(txn?.riskFactors?.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 6. Security & Secret Redaction Policy
  // ==========================================================================
  describe('6. Security & Secret Redaction', () => {
    it('safely redacts Razorpay keys and webhook secrets during status logging', () => {
      expect(redactSecret('rzp_test_key_1234567890')).toBe('[CONFIGURED]');
      expect(redactSecret('rzp_sec_webhook_secret_998877')).toBe('[CONFIGURED]');
      expect(redactSecret('')).toBe('[NOT_CONFIGURED]');
      expect(redactSecret(undefined)).toBe('[NOT_CONFIGURED]');

      const redacted = redactConfig({
        ...serverConfig,
        razorpayKeyId: 'rzp_test_5678',
        razorpayKeySecret: 'rzp_sec_abcd',
        razorpayWebhookSecret: 'rzp_webhook_secret_xyz',
      });

      expect(redacted.razorpayKeyId).toBe('[CONFIGURED]');
      expect(redacted.razorpayKeySecret).toBe('[CONFIGURED]');
      expect(redacted.razorpayWebhookSecret).toBe('[CONFIGURED]');
    });
  });

  // ==========================================================================
  // 7. Backward Compatibility: Existing Auth & Transaction APIs
  // ==========================================================================
  describe('7. Backward Compatibility & Protected APIs', () => {
    it('ensures protected API endpoints still require valid authentication', async () => {
      // 1. Missing token rejected
      const unauthRes = await request(app).get('/api/transactions');
      expect(unauthRes.status).toBe(401);

      // 2. Invalid token rejected
      const invalidRes = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer invalid-token-xyz');
      expect(invalidRes.status).toBe(401);

      // 3. Valid authenticated request retrieves transactions
      const authRes = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer TEST_TOKEN_analyst@risklens.ai');
      expect(authRes.status).toBe(200);
      expect(Array.isArray(authRes.body.transactions)).toBe(true);
    });

    it('ensures public health endpoint remains accessible without credentials', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(['LIVE', 'DEGRADED', 'UNAVAILABLE']).toContain(res.body.status);
    });
  });
});
