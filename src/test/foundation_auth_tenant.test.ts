// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../server';
import { Express } from 'express';
import {
  verifyAuthToken,
  deriveTenantId,
  createSignedToken,
} from '../../server/middleware/auth.middleware';
import { verifyTenantOwnership } from '../../server/middleware/tenant.middleware';
import { resolveTenantMembership, resetMembershipConfigForTesting } from '../../server/auth/membership';

describe('RiskLens AI Foundation: Server-Side Authentication & Tenant Isolation Suite', () => {
  let app: Express;

  beforeAll(() => {
    app = createExpressApp();
  });

  describe('1. Cryptographic Token Verification & Derivation', () => {
    it('rejects missing or non-Bearer authorization headers', async () => {
      expect(await verifyAuthToken(undefined)).toBeNull();
      expect(await verifyAuthToken('')).toBeNull();
      expect(await verifyAuthToken('Basic dXNlcjpwYXNz')).toBeNull();
      expect(await verifyAuthToken('Bearer')).toBeNull();
    });

    it('validates test tokens in test/dev environment and derives user identity with tenant', async () => {
      const user = await verifyAuthToken('Bearer TEST_TOKEN_senior.investigator@fintechcorp.in');
      expect(user).toBeDefined();
      expect(user?.email).toBe('senior.investigator@fintechcorp.in');
      expect(user?.tenantId).toBe('tenant_fintechcorp_in');
      expect(user?.role).toBe('senior_fraud_analyst');
    });

    it('cryptographically verifies signed JWT payload with HMAC-SHA256 signature', async () => {
      const validPayload = {
        sub: 'usr_crypto_123',
        email: 'analyst@razorpay-merchant.com',
        tenant_id: 'tenant_attacker',
      };

      const signedToken = await createSignedToken(validPayload, undefined, '1h');
      const user = await verifyAuthToken(`Bearer ${signedToken}`);

      expect(user).toBeDefined();
      expect(user?.email).toBe('analyst@razorpay-merchant.com');
      expect(user?.tenantId).toBe('tenant_razorpay_merchant_com');
      expect(user?.tenantId).not.toBe('tenant_attacker');
    });

    it('strictly rejects tokens with alg=none or unsigned payloads', async () => {
      const unsignedHeader = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(
        JSON.stringify({
          sub: 'attacker_123',
          email: 'attacker@evil.com',
          exp: Math.floor(Date.now() / 1000) + 3600,
        })
      ).toString('base64url');
      const unsignedJwt = `${unsignedHeader}.${payload}.`;

      expect(await verifyAuthToken(`Bearer ${unsignedJwt}`)).toBeNull();
    });

    it('strictly rejects expired tokens', async () => {
      const expiredPayload = {
        sub: 'usr_expired_123',
        email: 'analyst@razorpay-merchant.com',
      };

      // Generate token expired 10 seconds ago
      const expiredToken = await createSignedToken(expiredPayload, undefined, '-10s');
      expect(await verifyAuthToken(`Bearer ${expiredToken}`)).toBeNull();
    });

    it('strictly rejects tokens signed with wrong secret key', async () => {
      const payload = {
        sub: 'usr_impostor_123',
        email: 'analyst@razorpay-merchant.com',
      };

      const forgedToken = await createSignedToken(payload, 'wrong-secret-key-at-least-32-chars-long');
      expect(await verifyAuthToken(`Bearer ${forgedToken}`)).toBeNull();
    });

    it('strictly rejects test tokens and mock tokens in production environment', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';

        const testTokenResult = await verifyAuthToken('Bearer TEST_TOKEN_admin@risklens.ai');
        expect(testTokenResult).toBeNull();

        const studioTokenResult = await verifyAuthToken('Bearer STUDIO_TOKEN_dev@risklens.ai');
        expect(studioTokenResult).toBeNull();

        const mockTokenResult = await verifyAuthToken('Bearer mock-valid-token');
        expect(mockTokenResult).toBeNull();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('derives consistent tenant ID from email domains', () => {
      expect(deriveTenantId('user@acme.com')).toBe('tenant_acme_com');
      expect(deriveTenantId('admin@hdfcbank.co.in')).toBe('tenant_hdfcbank_co_in');
      expect(deriveTenantId('invalid-email')).toBe('default_tenant');
    });

    it('resolves configured tenant membership and role on the server', () => {
      const original = process.env.TENANT_MEMBERSHIPS_JSON;
      process.env.TENANT_MEMBERSHIPS_JSON = JSON.stringify([
        { uid: 'uid-member-a', email: 'member@example.com', tenantId: 'tenant_a', role: 'analyst' },
      ]);
      resetMembershipConfigForTesting();
      expect(resolveTenantMembership('uid-member-a', 'member@example.com', 'ignored')).toEqual({
        uid: 'uid-member-a', email: 'member@example.com', tenantId: 'tenant_a', role: 'analyst',
      });
      process.env.TENANT_MEMBERSHIPS_JSON = original;
      resetMembershipConfigForTesting();
    });
  });

  describe('2. Endpoint Authentication Enforcement', () => {
    it('allows public health probes without authorization header', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(['LIVE', 'DEGRADED', 'UNAVAILABLE']).toContain(res.body.status);
    });

    it('rejects protected endpoints when authorization header is missing', async () => {
      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('rejects protected endpoints when token is malformed', async () => {
      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer invalid-token-xyz');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('accepts protected endpoints when valid signed token is presented', async () => {
      const token = await createSignedToken({
        sub: 'usr_valid_tester',
        email: 'analyst@risklens.ai',
      });

      const res = await request(app)
        .get('/api/transactions')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.transactions)).toBe(true);
    });
  });

  describe('3. Multi-Tenant Isolation & Cross-Tenant Access Rejection', () => {
    it('verifies ownership helpers strictly isolate tenant boundaries', () => {
      expect(verifyTenantOwnership('tenant_alpha', 'tenant_alpha')).toBe(true);
      expect(verifyTenantOwnership('tenant_beta', 'tenant_alpha')).toBe(false);

      // Third-party tenant CANNOT access unassigned/default resources
      expect(verifyTenantOwnership(undefined, 'tenant_acme_bank')).toBe(false);
      expect(verifyTenantOwnership('default_tenant', 'tenant_acme_bank')).toBe(false);

      // Internal risklens admin / default tenant CAN access default resources
      expect(verifyTenantOwnership(undefined, 'default_tenant')).toBe(true);
      expect(verifyTenantOwnership(undefined, 'tenant_risklens_ai')).toBe(true);
    });

    it('ingests transactions tagged with tenant ID and isolates from other tenants', async () => {
      const tenantAAuth = { Authorization: 'Bearer TEST_TOKEN_lead@tenant-a.com' };
      const tenantBAuth = { Authorization: 'Bearer TEST_TOKEN_lead@tenant-b.com' };

      const txTenantA = {
        id: `TXN-TENANT-A-${Date.now()}`,
        amount: 4500.00,
        currency: 'INR',
        merchant: 'Tenant A Store',
        customerId: 'CUST-TA-01',
        status: 'pending' as const,
      };

      // Ingest under Tenant A
      const ingestRes = await request(app)
        .post('/api/transactions/batch')
        .set(tenantAAuth)
        .send({ transactions: [txTenantA] });

      expect(ingestRes.status).toBe(200);
      expect(ingestRes.body.success).toBe(true);

      // Tenant A can retrieve their own transaction
      const getResA = await request(app)
        .get(`/api/transactions/${txTenantA.id}`)
        .set(tenantAAuth);
      expect(getResA.status).toBe(200);
      expect(getResA.body.id).toBe(txTenantA.id);

      // Tenant B attempting to access Tenant A's transaction is REJECTED with 403 Forbidden
      const getResB = await request(app)
        .get(`/api/transactions/${txTenantA.id}`)
        .set(tenantBAuth);
      expect(getResB.status).toBe(403);
      expect(getResB.body.error.message || getResB.body.error).toContain('Forbidden');
    });

    it('rejects cross-tenant analyst action resolutions', async () => {
      const tenantAAuth = { Authorization: 'Bearer TEST_TOKEN_analyst@tenant-a.com' };
      const tenantBAuth = { Authorization: 'Bearer TEST_TOKEN_analyst@tenant-b.com' };

      const targetTx = {
        id: `TXN-ACTION-TENANT-A-${Date.now()}`,
        amount: 12000.00,
        currency: 'INR',
        merchant: 'Tenant A High Value',
        customerId: 'CUST-TA-02',
        status: 'pending' as const,
      };

      await request(app)
        .post('/api/transactions/batch')
        .set(tenantAAuth)
        .send({ transactions: [targetTx] });

      // Tenant B attempting to execute action on Tenant A transaction is REJECTED with 403
      const actionRes = await request(app)
        .post('/api/actions/resolve')
        .set(tenantBAuth)
        .send({
          transactionId: targetTx.id,
          action: 'REJECT',
          notes: 'Unauthorized cross-tenant attempt',
        });

      expect(actionRes.status).toBe(403);
    });
  });

  describe('4. CORS & Rate Limiting Security Policies', () => {
    it('sets CORS headers for allowed production origin', async () => {
      const res = await request(app)
        .get('/api/health')
        .set('Origin', 'https://risklens-platform.vercel.app');

      expect(res.headers['access-control-allow-origin']).toBe('https://risklens-platform.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('does not reflect arbitrary disallowed origins in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await request(app)
          .get('/api/health')
          .set('Origin', 'https://malicious-attacker.com');

        expect(res.headers['access-control-allow-origin']).toBeUndefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('serves health liveness and readiness probes with 200 without rate limit block', async () => {
      const liveRes = await request(app).get('/api/health/live');
      expect(liveRes.status).toBe(200);
      expect(liveRes.body.liveness).toBe(true);

      const readyRes = await request(app).get('/api/health/ready');
      expect([200, 503]).toContain(readyRes.status);
      expect(readyRes.body.readiness).toBe(readyRes.status === 200);
    });
  });
});

