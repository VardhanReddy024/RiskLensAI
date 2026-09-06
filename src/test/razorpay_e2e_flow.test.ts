// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createExpressApp } from '../../server';
import { Express } from 'express';
import { db } from '../../server/db';
import { serverConfig } from '../../server/config';

describe('RiskLens AI Phase 3B: Razorpay Test-Mode End-to-End Flow & Swarm Validation', () => {
  let app: Express;
  const testSecret = 'rzp_test_webhook_secret_phase3b';

  const signPayload = (payload: any): { body: string; signature: string } => {
    const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', testSecret).update(body).digest('hex');
    return { body, signature };
  };

  beforeAll(async () => {
    process.env.RAZORPAY_WEBHOOK_SECRET = testSecret;
    serverConfig.razorpayWebhookSecret = testSecret;
    app = createExpressApp();
    await db.initialize();
  });

  it('executes complete end-to-end flow: payment -> webhook -> HMAC -> idempotency -> ML scoring -> audit trail -> investigation trigger', async () => {
    const paymentId = `pay_e2e_${Date.now()}`;
    const orderId = `order_e2e_${Date.now()}`;
    const eventId = `evt_e2e_${Date.now()}`;

    const webhookPayload = {
      entity: 'event',
      account_id: 'acc_test_merchant_99',
      event: 'payment.captured',
      event_id: eventId,
      contains: ['payment'],
      payload: {
        payment: {
          entity: {
            id: paymentId,
            entity: 'payment',
            amount: 35000000, // ₹350,000.00 (High-value anomalous transaction)
            currency: 'INR',
            status: 'captured',
            order_id: orderId,
            method: 'netbanking',
            email: 'suspect.account@tor-exit.net',
            contact: '+919988776655',
            notes: {
              merchant: 'Binance P2P Exchange',
              category: 'Crypto Exchange',
              is_tor: 'true',
              distance_km: '5200',
              customer_name: 'Anomalous Actor',
            },
            created_at: Math.floor(Date.now() / 1000),
          },
        },
      },
      created_at: Math.floor(Date.now() / 1000),
    };

    const { body, signature } = signPayload(webhookPayload);

    // 1. Deliver Webhook
    const res = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('PROCESSED');
    expect(res.body.transactionId).toBe(`TXN-RZP-${paymentId}`);

    // 2. Database Verification: Webhook Event Record
    const eventRecord = await db.adapter.getWebhookEvent('razorpay', eventId);
    expect(eventRecord).toBeDefined();
    expect(eventRecord?.signatureVerified).toBe(true);
    expect(eventRecord?.processingStatus).toBe('PROCESSED');
    expect(eventRecord?.eventType).toBe('payment.captured');

    // 3. Database Verification: Normalized Transaction Record
    const txn = await db.transactions.getById(`TXN-RZP-${paymentId}`);
    expect(txn).toBeDefined();
    expect(txn?.provider).toBe('razorpay');
    expect(txn?.providerPaymentId).toBe(paymentId);
    expect(txn?.providerOrderId).toBe(orderId);
    expect(txn?.providerEventId).toBe(eventId);
    expect(txn?.tenantId).toBe('tenant_razorpay_merchant');
    expect(txn?.amount).toBe(350000.00);
    expect(txn?.currency).toBe('INR');
    expect(txn?.merchant).toBe('Binance P2P Exchange');
    expect(txn?.merchantCategory).toBe('Crypto Exchange');

    // 4. ML Risk Engine Verification
    expect(txn?.riskScore).toBeGreaterThanOrEqual(60);
    expect(txn?.status).toBe('flagged');
    expect(txn?.riskDecision).toBeDefined();
    expect(['REVIEW', 'REJECT', 'MITIGATE', 'ALLOW']).toContain(txn?.riskDecision);
    expect(txn?.riskTier).toBeDefined();
    expect(txn?.riskFactors?.length).toBeGreaterThan(0);
    expect(txn?.estimatedLossPrevented).toBe(350000.00);

    // 5. Audit Log Verification
    const logs = await db.auditLogs.getByTargetId(txn!.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0].action).toBe('WEBHOOK_PAYMENT_INGEST');
    expect(logs[0].actorEmail).toBe('webhook@razorpay.com');

    // 6. Idempotency Verification on Replay
    const duplicateRes = await request(app)
      .post('/api/webhooks/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(body);

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.success).toBe(true);
    expect(duplicateRes.body.idempotent).toBe(true);
  });
});
