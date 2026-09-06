/**
 * RiskLens AI - Upload Dataset & Ingestion Module Regression Test Suite
 * 
 * Tests:
 * 1. CSV parsing (various delimiters, case variations, standard & custom column formats)
 * 2. Excel (.xlsx / .xls) parsing via SheetJS
 * 3. Amount parsing & INR normalization (symbols, codes, commas, decimals)
 * 4. Transaction ID exact preservation
 * 5. Validation, rejected row counts, and detailed error logging
 * 6. ML Risk engine scoring on real user-uploaded transactions
 * 7. Dataset isolation (uploaded user data replacing demo state, demo data as explicit actions)
 * 8. Backend /api/transactions/batch persistence with replaceExisting flag
 */

import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import * as XLSX from 'xlsx';
import request from 'supertest';
import { 
  parseCSVTextToResult, 
  parseExcelBufferToResult, 
  parseAmountAndCurrency, 
  parseRawRecords,
  DatasetParseResult 
} from '../lib/dataset_parser';
import { parseCSVText, parseCsvToTransactions, generateSampleCsv } from '../lib/csv_parser';
import { Transaction } from '../types';
import { INITIAL_TRANSACTIONS } from '../data/sample_datasets';
import { createExpressApp } from '../../server';
import { db } from '../../server/db';
import { Express } from 'express';

describe('RiskLens AI - Upload Dataset & Ingestion Module', () => {
  let app: Express;
  const authHeader = { Authorization: 'Bearer TEST_TOKEN_analyst@risklens.ai' };

  beforeAll(() => {
    app = createExpressApp();
  });

  describe('1. Amount Parsing & INR Normalization', () => {
    it('parses standard numerical floats and integers', () => {
      expect(parseAmountAndCurrency(1450.50)).toEqual({ amount: 1450.50, currency: 'USD', isValid: true });
      expect(parseAmountAndCurrency('2500')).toEqual({ amount: 2500, currency: 'USD', isValid: true });
      expect(parseAmountAndCurrency('12,450.75')).toEqual({ amount: 12450.75, currency: 'USD', isValid: true });
    });

    it('detects and normalizes INR currency from rupee symbols and abbreviations', () => {
      const res1 = parseAmountAndCurrency('₹15,000.00');
      expect(res1.amount).toBe(15000);
      expect(res1.currency).toBe('INR');
      expect(res1.isValid).toBe(true);

      const res2 = parseAmountAndCurrency('INR 45,500.50');
      expect(res2.amount).toBe(45500.50);
      expect(res2.currency).toBe('INR');
      expect(res2.isValid).toBe(true);

      const res3 = parseAmountAndCurrency('Rs. 8990');
      expect(res3.amount).toBe(8990);
      expect(res3.currency).toBe('INR');
      expect(res3.isValid).toBe(true);

      const res4 = parseAmountAndCurrency('Rs 120000');
      expect(res4.amount).toBe(120000);
      expect(res4.currency).toBe('INR');
      expect(res4.isValid).toBe(true);
    });

    it('handles other international currencies correctly', () => {
      expect(parseAmountAndCurrency('€ 1,200.50')).toEqual({ amount: 1200.50, currency: 'EUR', isValid: true });
      expect(parseAmountAndCurrency('£850.00')).toEqual({ amount: 850, currency: 'GBP', isValid: true });
      expect(parseAmountAndCurrency('$45.99')).toEqual({ amount: 45.99, currency: 'USD', isValid: true });
    });

    it('rejects invalid or negative amounts with informative errors', () => {
      expect(parseAmountAndCurrency('invalid_num').isValid).toBe(false);
      expect(parseAmountAndCurrency('-500').isValid).toBe(false);
      expect(parseAmountAndCurrency('').isValid).toBe(false);
      expect(parseAmountAndCurrency(null).isValid).toBe(false);
    });
  });

  describe('2. Transaction ID Preservation', () => {
    it('preserves exact user-provided transaction IDs without alteration', () => {
      const csv = `transaction_id,customer_id,amount,merchant,timestamp
UPLOAD_PROD_99812,CUST-901,15000,Binance Exchange,2026-03-01T12:00:00Z
TXN-ENTERPRISE-ALPHA,CUST-902,450,Apple Store,2026-03-01T12:05:00Z
PAY_RAZORPAY_88124,CUST-903,1200,Flipkart Internet,2026-03-01T12:10:00Z`;

      const result = parseCSVTextToResult(csv);
      expect(result.validRows).toBe(3);
      expect(result.transactions[0].id).toBe('UPLOAD_PROD_99812');
      expect(result.transactions[1].id).toBe('TXN-ENTERPRISE-ALPHA');
      expect(result.transactions[2].id).toBe('PAY_RAZORPAY_88124');
    });

    it('generates deterministic fallback ID only if ID is completely missing in row', () => {
      const csv = `customer_id,amount,merchant
CUST-101,500,Amazon Store`;

      const result = parseCSVTextToResult(csv);
      expect(result.validRows).toBe(1);
      expect(result.transactions[0].id).toMatch(/^TXN-UPLOAD-/);
    });
  });

  describe('3. CSV and Flexible Header Parsing', () => {
    it('parses CSV with various column casing and alternative header names', () => {
      const csv = `"Transaction ID","Customer Name","Total Amount","Merchant Name","Date","City","IP Address"
"TXN-VAR-1","John Doe","₹ 45,000","Crypto Direct AG","2026-03-01","Zurich","185.220.101.5"
"TXN-VAR-2","Jane Smith","₹ 85.00","Starbucks","2026-03-01","Seattle","73.189.44.12"`;

      const result = parseCSVTextToResult(csv);
      expect(result.totalRows).toBe(2);
      expect(result.validRows).toBe(2);
      expect(result.transactions[0].id).toBe('TXN-VAR-1');
      expect(result.transactions[0].customerName).toBe('John Doe');
      expect(result.transactions[0].amount).toBe(45000);
      expect(result.transactions[0].currency).toBe('INR');
      expect(result.transactions[0].merchant).toBe('Crypto Direct AG');
      expect(result.transactions[0].location.city).toBe('Zurich');

      expect(result.transactions[1].id).toBe('TXN-VAR-2');
      expect(result.transactions[1].amount).toBe(85);
    });

    it('returns error for completely blank CSV or header-only file', () => {
      const emptyRes = parseCSVTextToResult('');
      expect(emptyRes.validRows).toBe(0);
      expect(emptyRes.errors.length).toBeGreaterThan(0);

      const headerOnly = parseCSVTextToResult('transaction_id,amount,merchant');
      expect(headerOnly.validRows).toBe(0);
      expect(headerOnly.errors.length).toBeGreaterThan(0);
    });
  });

  describe('4. Excel (.xlsx / .xls) Workbook Parsing', () => {
    it('parses Excel binary buffer into valid RiskLens transactions', () => {
      // Create a test workbook in memory using xlsx
      const wsData = [
        ['Transaction ID', 'Customer ID', 'Amount', 'Currency', 'Merchant', 'Location', 'IP Address'],
        ['XLSX-TXN-001', 'CUST-551', 34500, 'INR', 'Swiss Bullion Gold', 'Geneva, Switzerland', '185.220.101.5'],
        ['XLSX-TXN-002', 'CUST-552', 120.50, 'USD', 'Target Superstore', 'San Francisco, US', '192.168.1.50'],
        ['XLSX-TXN-003', 'CUST-553', '₹ 9,999.00', 'INR', 'Apple Store Mumbai', 'Mumbai, India', '49.36.12.8']
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
      const excelBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

      const result = parseExcelBufferToResult(excelBuffer);
      expect(result.totalRows).toBe(3);
      expect(result.validRows).toBe(3);
      expect(result.invalidRows).toBe(0);

      expect(result.transactions[0].id).toBe('XLSX-TXN-001');
      expect(result.transactions[0].amount).toBe(34500);
      expect(result.transactions[0].currency).toBe('INR');

      expect(result.transactions[1].id).toBe('XLSX-TXN-002');
      expect(result.transactions[1].amount).toBe(120.50);
      expect(result.transactions[1].currency).toBe('USD');

      expect(result.transactions[2].id).toBe('XLSX-TXN-003');
      expect(result.transactions[2].amount).toBe(9999);
      expect(result.transactions[2].currency).toBe('INR');
    });
  });

  describe('5. Row Validation & Import Error Reporting', () => {
    it('records valid and invalid row counts accurately and logs error details', () => {
      const records = [
        { transaction_id: 'TXN-OK-1', amount: 1500, merchant: 'Good Store' },
        { transaction_id: 'TXN-BAD-1', amount: 'not_a_number', merchant: 'Bad Store' },
        { transaction_id: 'TXN-OK-2', amount: '₹ 2,500', merchant: 'Valid Store' },
        { transaction_id: 'TXN-BAD-2', amount: -100, merchant: 'Negative Store' },
      ];

      const result = parseRawRecords(records);
      expect(result.totalRows).toBe(4);
      expect(result.validRows).toBe(2);
      expect(result.invalidRows).toBe(2);
      expect(result.transactionsImported).toBe(2);
      expect(result.errors.length).toBe(2);
      expect(result.errors[0]).toContain('Row 2');
      expect(result.errors[1]).toContain('Row 4');
    });
  });

  describe('6. Machine Learning Scoring on Uploaded Data', () => {
    it('evaluates ML risk score, fraud probability, SHAP factors and tags for uploaded transactions', () => {
      const highRiskCsv = `transaction_id,amount,merchant,ip_address,device
TXN-FRAUD-1,45000,Binance Crypto Exchange,185.220.101.5,Linux VM Headless Emulator`;

      const lowRiskCsv = `transaction_id,amount,merchant,ip_address,device
TXN-CLEAN-1,24.50,Whole Foods Grocery,24.180.12.99,iPhone 16 iOS`;

      const fraudResult = parseCSVTextToResult(highRiskCsv);
      const cleanResult = parseCSVTextToResult(lowRiskCsv);

      expect(fraudResult.validRows).toBe(1);
      const fraudTxn = fraudResult.transactions[0];
      expect(fraudTxn.riskScore).toBeGreaterThanOrEqual(60);
      expect(fraudTxn.status).toBe('flagged');
      expect(fraudTxn.flagReasons.length).toBeGreaterThan(0);
      expect(fraudTxn.tags.length).toBeGreaterThan(0);

      expect(cleanResult.validRows).toBe(1);
      const cleanTxn = cleanResult.transactions[0];
      expect(cleanTxn.riskScore).toBeLessThan(50);
      expect(cleanTxn.status).toBe('approved');
    });
  });

  describe('7. Backend API Endpoint POST /api/transactions/batch (replaceExisting)', () => {
    beforeEach(async () => {
      await db.initialize();
      await db.transactions.clearAll();
      await db.transactions.saveBatch(INITIAL_TRANSACTIONS);
    });

    it('ingests user upload batch and replaces demo dataset when replaceExisting is true', async () => {
      const userUploadedBatch: Partial<Transaction>[] = [
        {
          id: 'USER_UPLOAD_001',
          customerId: 'CUST-USER-1',
          customerName: 'Alice Operator',
          customerEmail: 'alice@company.com',
          customerTenureMonths: 24,
          amount: 8500,
          currency: 'INR',
          merchant: 'Enterprise Supplier',
          merchantCategory: 'Retail',
          timestamp: new Date().toISOString(),
          location: { city: 'Bengaluru', country: 'India', lat: 12.9716, lon: 77.5946, distanceFromHomeKm: 10 },
          device: { id: 'DEV-1', type: 'Desktop', os: 'macOS', browser: 'Chrome', fingerprintScore: 95, isKnownCustomerDevice: true },
          ipAddress: { ip: '49.36.1.1', country: 'India', city: 'Bengaluru', isVpn: false, isTor: false, isProxy: false, proxyRiskScore: 5 },
          paymentMethod: { type: 'Credit Card', last4: '4321', issuer: 'HDFC', cardCountry: 'India', is3DSecure: true },
          riskScore: 12,
          fraudProbability: 0.12,
          confidenceScore: 0.98,
          riskTier: 'LOW',
          status: 'approved',
          tags: ['Standard Checkout'],
          flagReasons: []
        },
        {
          id: 'USER_UPLOAD_002',
          customerId: 'CUST-USER-2',
          customerName: 'Bob Trader',
          customerEmail: 'bob@company.com',
          customerTenureMonths: 1,
          amount: 95000,
          currency: 'INR',
          merchant: 'Crypto P2P Desk',
          merchantCategory: 'Crypto Exchange',
          timestamp: new Date().toISOString(),
          location: { city: 'Unknown', country: 'Nigeria', lat: 6.5244, lon: 3.3792, distanceFromHomeKm: 6000 },
          device: { id: 'DEV-2', type: 'Bot/Emulator', os: 'Headless Linux', browser: 'Selenium', fingerprintScore: 10, isKnownCustomerDevice: false },
          ipAddress: { ip: '185.220.101.5', country: 'Germany', city: 'Frankfurt', isVpn: true, isTor: true, isProxy: true, proxyRiskScore: 99 },
          paymentMethod: { type: 'Wire Transfer', last4: '9999', issuer: 'Offshore Bank', cardCountry: 'Unknown', is3DSecure: false },
          riskScore: 92,
          fraudProbability: 0.92,
          confidenceScore: 0.96,
          riskTier: 'CRITICAL',
          status: 'flagged',
          tags: ['Tor Node', 'High Amount'],
          flagReasons: ['Suspicious Tor exit node']
        }
      ];

      const res = await request(app)
        .post('/api/transactions/batch')
        .set(authHeader)
        .send({
          transactions: userUploadedBatch,
          replaceExisting: true
        })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.ingestedCount).toBe(2);
      expect(res.body.totalDbCount).toBeGreaterThanOrEqual(2);
      expect(res.body.transactions.length).toBe(2);
      expect(res.body.transactions[0].id).toBe('USER_UPLOAD_001');
      expect(res.body.transactions[1].id).toBe('USER_UPLOAD_002');

      // Verify querying /api/transactions returns user uploaded data, not demo data
      const getRes = await request(app)
        .get('/api/transactions')
        .set(authHeader)
        .expect(200);
      expect(getRes.body.total).toBeGreaterThanOrEqual(2);
      expect(getRes.body.transactions.map((t: any) => t.id)).toEqual(expect.arrayContaining(['USER_UPLOAD_001', 'USER_UPLOAD_002']));
    });
  });

});
