// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../server';
import { Express } from 'express';

describe('RiskLens AI Express API Integration Suite (Supertest)', () => {
  let app: Express;

  beforeAll(() => {
    app = createExpressApp();
  });

  it('GET /api/health returns 200 OK and valid service health status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.status).toBe('ok');
    expect(res.body.platform).toBe('RiskLens AI');
    expect(res.body.services.orchestrator).toBe(true);
    expect(res.body.services.ml_engine).toBe(true);
  });

  it('GET /api/transactions returns seeded transactions and handles query filters', async () => {
    // 1. Unfiltered
    const res = await request(app).get('/api/transactions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.transactions)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);

    // 2. Filter by status
    const flaggedRes = await request(app).get('/api/transactions?status=flagged');
    expect(flaggedRes.status).toBe(200);
    flaggedRes.body.transactions.forEach((t: any) => {
      expect(t.status.toLowerCase()).toBe('flagged');
    });

    // 3. Filter by search term
    const searchRes = await request(app).get('/api/transactions?search=Crypto');
    expect(searchRes.status).toBe(200);
  });

  it('GET /api/transactions/:id retrieves single transaction or returns 404', async () => {
    // 1. Get first transaction ID from list
    const listRes = await request(app).get('/api/transactions');
    const firstTxn = listRes.body.transactions[0];
    expect(firstTxn).toBeDefined();

    const detailRes = await request(app).get(`/api/transactions/${firstTxn.id}`);
    expect(detailRes.status).toBe(200);
    expect(detailRes.body.id).toBe(firstTxn.id);
    expect(detailRes.body.amount).toBe(firstTxn.amount);

    // 2. Non-existent ID returns 404
    const notFoundRes = await request(app).get('/api/transactions/NON-EXISTENT-ID-999');
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body.error).toBeDefined();
  });

  it('POST /api/transactions/batch ingests, ML-scores, and creates audit log', async () => {
    const newTxns = [
      {
        id: 'TXN-SUPERTEST-BATCH-01',
        customerId: 'CUST-TEST-99',
        customerName: 'Supertest User',
        amount: 8500.00,
        currency: 'USD',
        timestamp: new Date().toISOString(),
        merchant: 'Swiss Crypto Exchange',
        merchantCategory: 'Crypto Exchange',
        location: {
          city: 'Zurich',
          country: 'Switzerland',
          distanceFromHomeKm: 6200,
        },
        device: {
          id: 'DEV-TEST-VM',
          type: 'Bot/Emulator',
          os: 'Android 14 VM',
          isKnownCustomerDevice: false,
          fingerprintScore: 10,
        },
        ipAddress: {
          ip: '185.220.101.5',
          city: 'Zurich',
          country: 'Switzerland',
          isTor: true,
          isProxy: true,
          isVpn: true,
          proxyRiskScore: 98,
        },
        paymentMethod: {
          type: 'Wire Transfer',
          is3DSecure: false,
        },
      }
    ];

    const res = await request(app)
      .post('/api/transactions/batch')
      .send({ transactions: newTxns });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.ingestedCount).toBe(1);

    // Verify it was scored with ML engine
    const ingested = res.body.transactions[0];
    expect(ingested.riskScore).toBeGreaterThanOrEqual(60);
    expect(ingested.status).toBe('flagged');

    // Bad payload validation
    const badRes = await request(app)
      .post('/api/transactions/batch')
      .send({ transactions: [] });
    expect(badRes.status).toBe(400);
  });

  it('POST /api/investigate/:id executes 8-agent pipeline and returns cached results on repeat', async () => {
    const listRes = await request(app).get('/api/transactions');
    const targetTxn = listRes.body.transactions[0];

    const invRes = await request(app).post(`/api/investigate/${targetTxn.id}`);
    expect(invRes.status).toBe(200);
    expect(invRes.body.success).toBe(true);
    expect(invRes.body.dossier).toBeDefined();
    expect(invRes.body.dossier.orchestrator.agentsRun).toBe(8);

    // Repeat should return cached response
    const cachedRes = await request(app).post(`/api/investigate/${targetTxn.id}`);
    expect(cachedRes.status).toBe(200);
    expect(cachedRes.body.cached).toBe(true);
  }, 15000);

  it('POST /api/actions/resolve executes action, changes status, and records audit trail', async () => {
    const listRes = await request(app).get('/api/transactions');
    const targetTxn = listRes.body.transactions[0];

    const resolveRes = await request(app)
      .post('/api/actions/resolve')
      .send({
        transactionId: targetTxn.id,
        action: 'REJECT',
        notes: 'Confirmed unauthorized Tor proxy wire transfer.',
        actorEmail: 'senior.analyst@risklens.ai',
        actorRole: 'lead_investigator',
      });

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.success).toBe(true);
    expect(resolveRes.body.transaction.status).toBe('rejected');
    expect(resolveRes.body.auditLog).toBeDefined();
    expect(resolveRes.body.auditLog.action).toBe('REJECT_TRANSACTION');
  });

  it('GET /api/analytics/metrics computes portfolio loss prevented and risk distributions', async () => {
    const res = await request(app).get('/api/analytics/metrics');

    expect(res.status).toBe(200);
    expect(res.body.totalTransactions).toBeGreaterThan(0);
    expect(res.body.totalLossPrevented).toBeGreaterThanOrEqual(0);
    expect(res.body.avgRiskScore).toBeGreaterThanOrEqual(0);
    expect(res.body.tierDistribution).toBeDefined();
    expect(res.body.tierDistribution.critical).toBeDefined();
    expect(res.body.recentLogs.length).toBeGreaterThan(0);
  });
});
