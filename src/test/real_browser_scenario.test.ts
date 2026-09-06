/**
 * RiskLens AI - Real Browser Scenario Integration Test
 *
 * Simulates the EXACT flow that fails in the real browser:
 * 1. User logs in via Google: analyst@gmail.com -> tenant_gmail_com
 * 2. Seeded transaction TXN-98421-FRAUD has tenantId: undefined (default_tenant in PG)
 * 3. User clicks "Deep Investigate" -> POST /api/investigate/TXN-98421-FRAUD
 * 4. User opens Copilot -> POST /api/copilot/chat
 *
 * Previously both steps 3 and 4 returned 403 Forbidden.
 * After the fix, they should return 200 OK.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createExpressApp } from '../../server';
import request from 'supertest';
import { db } from '../../server/db';
import { Transaction } from '../types';

const GOOGLE_USER_TOKEN = 'TEST_TOKEN_analyst@gmail.com';
const GOOGLE_USER_TENANT = 'tenant_gmail_com';
const SEEDED_TXN_ID = 'TXN-98421-FRAUD'; // This is in INITIAL_TRANSACTIONS with no tenantId

// Seeded transaction payload matching INITIAL_TRANSACTIONS (tenantId intentionally undefined)
const SEEDED_TXN: Omit<Transaction, 'tenantId'> = {
  id: SEEDED_TXN_ID,
  customerId: 'CUST-8831-VAL',
  customerName: 'Marcus Vance',
  customerEmail: 'm.vance@vancetech.io',
  customerTenureMonths: 18,
  amount: 14250.00,
  currency: 'USD',
  merchant: 'CryptoBit Global Gateway Ltd',
  merchantCategory: 'Crypto Exchange' as const,
  timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  location: { city: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792, distanceFromHomeKm: 9420 },
  device: { id: 'DEV-EMU-9921', type: 'Bot/Emulator', os: 'Android 14 (Bluestacks VM)', browser: 'Chrome 122 Headless', fingerprintScore: 18, isKnownCustomerDevice: false },
  ipAddress: { ip: '197.210.226.45', country: 'Nigeria', city: 'Lagos', isVpn: true, isTor: false, isProxy: true, proxyRiskScore: 94 },
  paymentMethod: { type: 'Wire Transfer', last4: '8831', issuer: 'JPMorgan Chase', cardCountry: 'United States', is3DSecure: false },
  riskScore: 94,
  fraudProbability: 0.96,
  confidenceScore: 0.98,
  riskTier: 'CRITICAL',
  status: 'flagged',
  estimatedLossPrevented: 14250.00,
  tags: ['Impossible Travel', 'High Value Crypto', 'Emulator Device', 'Proxy Detected'],
  flagReasons: [
    'Impossible physical velocity (9,420 km from domestic home address in 42 mins)',
    'Transaction amount ($14,250.00) is 28.5x customer historical mean of $500.00',
  ],
  // tenantId is intentionally MISSING — this is what breaks the real browser
};

describe('Real Browser Scenario: Google-Authenticated User (tenant_gmail_com) + Seeded Transaction (default_tenant)', () => {
  let app: ReturnType<typeof createExpressApp>;

  beforeAll(async () => {
    app = createExpressApp();
    await db.initialize();
    // Seed the transaction without tenantId, simulating what PostgreSQL stores
    await db.transactions.save({ ...SEEDED_TXN, tenantId: undefined });
  });

  it('BEFORE FIX WOULD FAIL: Seeded transaction has no tenantId in DB', async () => {
    const txn = await db.transactions.getById(SEEDED_TXN_ID);
    // After save with tenantId: undefined, it might be undefined or default_tenant depending on adapter
    console.log('[Test] Seeded txn tenantId:', txn?.tenantId);
    expect(txn).toBeDefined();
    // Confirm it has no specific tenant assigned (undefined or default_tenant)
    const hasNoSpecificTenant = !txn?.tenantId || txn.tenantId === 'default_tenant';
    expect(hasNoSpecificTenant).toBe(true);
  });

  it('STEP 1 — Deep Investigate: Google user CAN investigate a default_tenant/unassigned transaction (after fix)', async () => {
    const res = await request(app)
      .post(`/api/investigate/${SEEDED_TXN_ID}`)
      .set('Authorization', `Bearer ${GOOGLE_USER_TOKEN}`)
      .send({ transaction: SEEDED_TXN });

    console.log('[Test] Investigate response status:', res.status);
    if (res.status !== 200) {
      console.error('[Test] Investigate response body:', JSON.stringify(res.body));
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dossier).toBeDefined();

    // After investigation, the transaction should be adopted under google tenant
    const txnAfter = await db.transactions.getById(SEEDED_TXN_ID);
    console.log('[Test] Transaction tenantId after investigate:', txnAfter?.tenantId);
    expect(txnAfter?.tenantId).toBe(GOOGLE_USER_TENANT);
  });

  it('STEP 2 — Copilot Chat: Google user CAN use Copilot on their adopted transaction (after fix)', async () => {
    const res = await request(app)
      .post('/api/copilot/chat')
      .set('Authorization', `Bearer ${GOOGLE_USER_TOKEN}`)
      .send({
        transactionId: SEEDED_TXN_ID,
        question: 'Why was this transaction flagged?',
      });

    console.log('[Test] Copilot response status:', res.status);
    if (res.status !== 200) {
      console.error('[Test] Copilot response body:', JSON.stringify(res.body));
    }

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.reply).toBeDefined();
    expect(typeof res.body.reply).toBe('string');
    expect(res.body.reply.length).toBeGreaterThan(0);
    console.log('[Test] Copilot reply:', res.body.reply);
  });

  it('STEP 3 — Copilot Chat: Another Google user (different tenant) CANNOT access the adopted transaction', async () => {
    const attackerToken = 'TEST_TOKEN_hacker@othercorp.com';

    const res = await request(app)
      .post('/api/copilot/chat')
      .set('Authorization', `Bearer ${attackerToken}`)
      .send({
        transactionId: SEEDED_TXN_ID,
        question: 'Why was this transaction flagged?',
      });

    console.log('[Test] Attacker response status:', res.status);
    expect(res.status).toBe(403);
    expect(res.body.error.message || res.body.error).toContain('Forbidden');
  });

  it('STEP 4 — Copilot: All 4 key investigation questions work for authorized user', async () => {
    const questions = [
      'Why was this transaction flagged?',
      'What are the strongest risk signals?',
      'What is the IP proxy threat risk?',
      'Should this transaction be allowed, reviewed, or blocked?',
    ];

    for (const question of questions) {
      const res = await request(app)
        .post('/api/copilot/chat')
        .set('Authorization', `Bearer ${GOOGLE_USER_TOKEN}`)
        .send({ transactionId: SEEDED_TXN_ID, question });

      console.log(`[Test] Q: "${question.slice(0, 40)}..." -> HTTP ${res.status}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.reply).toBeTruthy();
    }
  });
});
