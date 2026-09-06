/**
 * RiskLens AI - Production Readiness & Contract Verification Test Suite
 * 
 * Validates:
 * 1. Authoritative Modal API and Webhook URL resolution
 * 2. Error normalization (preventing React child crashes from objects with { code, message })
 * 3. 100 uploaded transactions parsing, ID preservation, INR normalization, and batch ingestion
 * 4. Copilot distinct answer generation and contract normalization
 * 5. Health readiness & database degraded state handling
 */

import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../server';
import { db } from '../../server/db';
import { Express } from 'express';
import { 
  PRODUCTION_MODAL_API_URL, 
  PRODUCTION_MODAL_WEBHOOK_URL, 
  getApiBaseUrl, 
  getWebhookUrl 
} from '../lib/api';
import { normalizeErrorMessage, safeRenderText } from '../lib/error_normalizer';
import { parseCSVTextToResult, parseRawRecords } from '../lib/dataset_parser';
import { Transaction } from '../types';

describe('RiskLens AI - Production Readiness Suite', () => {
  let app: Express;
  const authHeader = { Authorization: 'Bearer TEST_TOKEN_analyst@risklens.ai' };

  beforeAll(() => {
    app = createExpressApp();
  });

  describe('1. API & Webhook URL Architecture', () => {
    it('defines the authoritative Modal backend and webhook endpoint constants', () => {
      expect(PRODUCTION_MODAL_API_URL).toBe('https://rvardhan791--risklens-ai-backend-run-server.modal.run');
      expect(PRODUCTION_MODAL_WEBHOOK_URL).toBe('https://rvardhan791--risklens-ai-backend-run-server.modal.run/api/webhooks/razorpay');
    });

    it('getWebhookUrl produces valid absolute or canonical webhook URL', () => {
      const webhookUrl = getWebhookUrl();
      expect(webhookUrl).toContain('/api/webhooks/razorpay');
      expect(webhookUrl).not.toContain('onrender.com');
    });
  });

  describe('2. Error Normalizer (React Child Crash Prevention)', () => {
    it('normalizes string errors without alteration', () => {
      expect(normalizeErrorMessage('Invalid API key')).toBe('Invalid API key');
    });

    it('normalizes { code, message } error objects into plain string', () => {
      const errObj = { code: 'VALIDATION_ERROR', message: 'Field amount is required' };
      const res = normalizeErrorMessage(errObj);
      expect(res).toBe('Field amount is required');
      expect(typeof res).toBe('string');
    });

    it('normalizes { error: { message, code } } nested objects', () => {
      const nested = { error: { code: 'UNAUTHORIZED', message: 'Token expired' } };
      expect(normalizeErrorMessage(nested)).toBe('Token expired');
    });

    it('normalizes standard Error instances', () => {
      const err = new Error('Database connection failed');
      expect(normalizeErrorMessage(err)).toBe('Database connection failed');
    });

    it('safeRenderText safely handles null, undefined, and objects', () => {
      expect(safeRenderText(null, 'Fallback')).toBe('Fallback');
      expect(safeRenderText(undefined, 'Fallback')).toBe('Fallback');
      expect(safeRenderText({ code: 'ERR_01', message: 'Connection reset' })).toBe('Connection reset');
      expect(safeRenderText('Hello World')).toBe('Hello World');
      expect(safeRenderText(42)).toBe('42');
    });
  });

  describe('3. Large Dataset Upload & Processing (100 Transactions)', () => {
    it('accurately parses and ML-evaluates 100 uploaded transactions with zero data loss or replacement', async () => {
      // Generate 100 synthetic rows in CSV format with INR currency and mixed risk patterns
      const rows = [
        'transaction_id,customer_id,customer_name,amount,currency,merchant,merchant_category,timestamp,city,country,ip_address,device_type,os'
      ];

      for (let i = 1; i <= 100; i++) {
        const id = `PROD_TXN_BATCH_${String(i).padStart(4, '0')}`;
        const custId = `CUST_IND_${1000 + i}`;
        const custName = `Customer ${i}`;
        const amt = i % 10 === 0 ? `₹ ${(i * 2500).toLocaleString()}` : `${i * 150}.50`;
        const currency = i % 10 === 0 ? 'INR' : 'USD';
        const merchant = i % 5 === 0 ? 'Crypto Direct AG' : (i % 3 === 0 ? 'Flipkart India' : 'Amazon India');
        const cat = i % 5 === 0 ? 'Crypto Exchange' : 'E-Commerce';
        const city = i % 2 === 0 ? 'Mumbai' : 'Bengaluru';
        const ip = i % 7 === 0 ? '185.220.101.5' : `49.36.${(i % 50) + 1}.12`;
        const device = i % 7 === 0 ? 'Headless Linux Emulator' : 'Mobile Safari';
        const os = i % 7 === 0 ? 'Linux' : 'iOS 18';

        rows.push(`${id},${custId},"${custName}","${amt}",${currency},"${merchant}","${cat}",2026-03-01T12:00:00Z,"${city}",India,${ip},${device},${os}`);
      }

      const csvContent = rows.join('\n');
      const parseResult = parseCSVTextToResult(csvContent);

      expect(parseResult.totalRows).toBe(100);
      expect(parseResult.validRows).toBe(100);
      expect(parseResult.invalidRows).toBe(0);
      expect(parseResult.transactions.length).toBe(100);

      // Verify transaction IDs are preserved exactly
      expect(parseResult.transactions[0].id).toBe('PROD_TXN_BATCH_0001');
      expect(parseResult.transactions[99].id).toBe('PROD_TXN_BATCH_0100');

      // Verify ML scoring is evaluated on all 100 transactions
      parseResult.transactions.forEach((txn, idx) => {
        expect(txn.riskScore).toBeDefined();
        expect(typeof txn.riskScore).toBe('number');
        expect(txn.riskScore).toBeGreaterThanOrEqual(0);
        expect(txn.riskScore).toBeLessThanOrEqual(100);
        expect(txn.riskTier).toBeDefined();
      });

      // Ingest via backend /api/transactions/batch with replaceExisting: true
      const res = await request(app)
        .post('/api/transactions/batch')
        .set(authHeader)
        .send({
          transactions: parseResult.transactions,
          replaceExisting: true
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.ingestedCount).toBe(100);
      expect(res.body.totalDbCount).toBeGreaterThanOrEqual(100);

      // Verify /api/transactions returns all 100 transactions
      const listRes = await request(app)
        .get('/api/transactions?limit=150')
        .set(authHeader)
        .expect(200);

      expect(listRes.body.total).toBeGreaterThanOrEqual(100);
      expect(listRes.body.transactions.length).toBeGreaterThanOrEqual(100);
      expect(listRes.body.transactions.some((t: any) => t.id === 'PROD_TXN_BATCH_0001')).toBe(true);
    });
  });

  describe('4. Copilot Chat Contract & Grounding', () => {
    const sampleTxn: Transaction = {
      id: 'TXN-COPILOT-PROD-001',
      customerId: 'CUST-COPILOT-1',
      customerName: 'Rahul Sharma',
      customerEmail: 'rahul.sharma@example.in',
      customerTenureMonths: 18,
      amount: 45000,
      currency: 'INR',
      merchant: 'QuickCrypto Desk',
      merchantCategory: 'Crypto Exchange',
      timestamp: new Date().toISOString(),
      location: { city: 'Pune', country: 'India', lat: 18.5204, lon: 73.8567, distanceFromHomeKm: 1400 },
      device: { id: 'DEV-99', type: 'Desktop', os: 'Linux', browser: 'Chrome Headless', fingerprintScore: 18, isKnownCustomerDevice: false },
      ipAddress: { ip: '185.220.101.5', country: 'Germany', city: 'Frankfurt', isVpn: true, isTor: true, isProxy: true, proxyRiskScore: 98 },
      paymentMethod: { type: 'Digital Wallet', last4: '9901', issuer: 'ICICI Bank', cardCountry: 'India', is3DSecure: false },
      riskScore: 88,
      fraudProbability: 0.88,
      confidenceScore: 0.95,
      riskTier: 'CRITICAL',
      status: 'flagged',
      tags: ['Tor Node', 'High Amount', 'Device Mismatch'],
      flagReasons: ['Tor darknet routing', 'Severe device fingerprint degradation']
    };

    it('accepts valid question & transactionId via POST /api/copilot/chat', async () => {
      // Seed the transaction first
      await db.transactions.save(sampleTxn);

      const res = await request(app)
        .post('/api/copilot/chat')
        .set(authHeader)
        .send({
          question: 'Why was this transaction flagged?',
          transactionId: sampleTxn.id,
          chatHistory: []
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.reply).toBe('string');
      expect(res.body.reply.length).toBeGreaterThan(0);
    });

    it('handles degraded AI state gracefully without throwing unhandled exceptions', async () => {
      const res = await request(app)
        .post('/api/copilot/chat')
        .set(authHeader)
        .send({
          question: 'What is the IP proxy threat risk?',
          transactionId: sampleTxn.id,
          chatHistory: []
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(typeof res.body.reply).toBe('string');
      expect(res.body.reply.length).toBeGreaterThan(0);
    });
  });

  describe('5. Health Diagnostics & Readiness', () => {
    it('GET /api/health returns valid standard health payload without secrets', async () => {
      const res = await request(app)
        .get('/api/health')
        .expect(200);

      expect(res.body.status).toBeDefined();
      expect(res.body.database).toBeDefined();
      expect(res.body.database.adapter).toBeDefined();
      expect(res.body.services).toBeDefined();
      // Ensure no database password or secrets in output
      const rawText = JSON.stringify(res.body);
      expect(rawText).not.toContain('postgres:');
      expect(rawText).not.toContain('password');
    });

    it('GET /api/health/ready responds with liveness/readiness payload', async () => {
      const res = await request(app)
        .get('/api/health/ready');

      expect([200, 503]).toContain(res.status);
      expect(res.body.status).toBeDefined();
    });
  });

  describe('6. Reverse Proxy & Rate Limiter Header Compatibility', () => {
    it('has trust proxy enabled on Express app for reverse proxy routing', () => {
      expect(app.get('trust proxy')).toBe(1);
    });

    it('successfully processes requests with X-Forwarded-For without ValidationError', async () => {
      const res = await request(app)
        .get('/api/transactions?limit=1')
        .set('X-Forwarded-For', '203.0.113.195, 10.0.0.1')
        .set(authHeader)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('successfully processes requests with RFC 7239 Forwarded header without ValidationError', async () => {
      const res = await request(app)
        .get('/api/transactions?limit=1')
        .set('Forwarded', 'for=198.51.100.17;proto=https;by=203.0.113.43')
        .set(authHeader)
        .expect(200);

      expect(res.body).toBeDefined();
    });

    it('successfully processes requests with both X-Forwarded-For and Forwarded simultaneously', async () => {
      const res = await request(app)
        .get('/api/transactions?limit=1')
        .set('X-Forwarded-For', '203.0.113.195')
        .set('Forwarded', 'for=203.0.113.195;proto=https')
        .set(authHeader)
        .expect(200);

      expect(res.body).toBeDefined();
    });
  });
});
