/**
 * RiskLens AI - Phase 5 Clean Architecture, Configuration & Error Handling Test Suite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { createExpressApp } from '../../server';
import { serverConfig, validateServerConfig, redactSecret, redactConfig, loadServerConfig } from '../../server/config';
import { clientConfig, loadClientConfig } from '../config';
import {
  AppError,
  ValidationError,
  NotFoundError,
  RateLimitError,
  UnauthorizedError,
  ForbiddenError,
  InternalServerError,
} from '../../server/errors';
import { ErrorBoundary } from '../components/ErrorBoundary';

describe('RiskLens AI Phase 5: Configuration Management & Clean Architecture Suite', () => {
  let app: any;

  beforeEach(() => {
    app = createExpressApp();
  });

  // ============================================================================
  // 1. Runtime Configuration & Secrets Redaction
  // ============================================================================
  describe('1. Runtime Configuration & Redaction', () => {
    it('loads and validates server configuration correctly', () => {
      expect(serverConfig).toBeDefined();
      expect(typeof serverConfig.port).toBe('number');
      expect(['development', 'production', 'test']).toContain(serverConfig.env);
      expect(['DEBUG', 'INFO', 'WARN', 'ERROR']).toContain(serverConfig.logLevel);
      expect(['firestore', 'memory']).toContain(serverConfig.dataStoreProvider);
    });

    it('validates configuration schema and detects invalid parameters', () => {
      const invalidConfig: any = {
        port: -1,
        env: 'invalid_env',
        dataStoreProvider: 'invalid_db',
      };

      const result = validateServerConfig(invalidConfig);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(3);
    });

    it('redacts sensitive API keys and secrets properly', () => {
      expect(redactSecret(undefined)).toBe('[NOT_CONFIGURED]');
      expect(redactSecret('')).toBe('[NOT_CONFIGURED]');
      expect(redactSecret('12345')).toBe('****');
      expect(redactSecret('AIzaSyD_SECRET_KEY_123456789')).toMatch(/^AIza\.\.\.6789$/);

      const sampleConfig = {
        ...serverConfig,
        geminiApiKey: 'AIzaSyD_SECRET_GEMINI_KEY_9999',
        qdrantApiKey: 'QDRANT_SUPER_SECRET_TOKEN_8888',
      };

      const sanitized = redactConfig(sampleConfig);
      expect(sanitized.geminiApiKey).not.toBe('AIzaSyD_SECRET_GEMINI_KEY_9999');
      expect(sanitized.geminiApiKey).toContain('AIza...');
      expect(sanitized.qdrantApiKey).not.toBe('QDRANT_SUPER_SECRET_TOKEN_8888');
    });

    it('loads strongly typed client configuration with feature flags', () => {
      expect(clientConfig).toBeDefined();
      expect(clientConfig.appName).toBe('RiskLens AI');
      expect(clientConfig.version).toBeDefined();
      expect(clientConfig.features.qdrantGraph).toBe(true);
      expect(clientConfig.features.copilotStream).toBe(true);
    });
  });

  // ============================================================================
  // 2. Custom Error Hierarchy & Standardized Error Schema
  // ============================================================================
  describe('2. Standardized Error Handling Hierarchy', () => {
    it('creates polymorphic AppErrors with correct status codes and codes', () => {
      const valErr = new ValidationError('Invalid amount', { field: 'amount' });
      expect(valErr.statusCode).toBe(400);
      expect(valErr.code).toBe('VALIDATION_ERROR');
      expect(valErr.details).toEqual({ field: 'amount' });
      expect(valErr.isOperational).toBe(true);

      const notFound = new NotFoundError('Transaction TX-404 not found');
      expect(notFound.statusCode).toBe(404);
      expect(notFound.code).toBe('NOT_FOUND');

      const rateErr = new RateLimitError('Rate limit exceeded');
      expect(rateErr.statusCode).toBe(429);
      expect(rateErr.code).toBe('RATE_LIMIT_EXCEEDED');

      const authErr = new UnauthorizedError();
      expect(authErr.statusCode).toBe(401);
      expect(authErr.code).toBe('UNAUTHORIZED');

      const serverErr = new InternalServerError();
      expect(serverErr.statusCode).toBe(500);
      expect(serverErr.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('returns standardized JSON error format from centralized error middleware', async () => {
      const res = await request(app).get('/api/transactions/NON_EXISTENT_TXN_9999');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toContain('NON_EXISTENT_TXN_9999');
      expect(res.body.requestId).toBeDefined();
      expect(res.body.timestamp).toBeDefined();
    });

    it('handles 404 for unmapped API endpoints with standardized JSON', async () => {
      const res = await request(app).get('/api/unmapped/unknown/endpoint');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // ============================================================================
  // 3. Request Validators Layer
  // ============================================================================
  describe('3. Request Validators Layer', () => {
    it('validates batch uploads and rejects missing or empty transactions array', async () => {
      const missingRes = await request(app)
        .post('/api/transactions/batch')
        .send({});
      expect(missingRes.status).toBe(400);
      expect(missingRes.body.success).toBe(false);
      expect(missingRes.body.error.code).toBe('VALIDATION_ERROR');

      const emptyRes = await request(app)
        .post('/api/transactions/batch')
        .send({ transactions: [] });
      expect(emptyRes.status).toBe(400);
      expect(emptyRes.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('validates item structure in transaction batch uploads', async () => {
      const invalidItemRes = await request(app)
        .post('/api/transactions/batch')
        .send({
          transactions: [
            { id: 'TX-1', amount: -50 }, // negative amount
          ],
        });
      expect(invalidItemRes.status).toBe(400);
      expect(invalidItemRes.body.error.code).toBe('VALIDATION_ERROR');
      expect(invalidItemRes.body.error.message).toContain('amount');
    });

    it('validates action resolution payload and rejects invalid action enums', async () => {
      const invalidActionRes = await request(app)
        .post('/api/actions/resolve')
        .send({
          transactionId: 'TX-2026-0001',
          action: 'INVALID_UNKNOWN_ACTION',
        });
      expect(invalidActionRes.status).toBe(400);
      expect(invalidActionRes.body.error.code).toBe('VALIDATION_ERROR');
      expect(invalidActionRes.body.error.message).toContain('Invalid action');
    });

    it('validates copilot inquiry payload and rejects empty message', async () => {
      const invalidCopilotRes = await request(app)
        .post('/api/copilot/chat')
        .send({
          transaction: { id: 'TX-1' },
          message: '   ',
        });
      expect(invalidCopilotRes.status).toBe(400);
      expect(invalidCopilotRes.body.error.code).toBe('VALIDATION_ERROR');
      expect(invalidCopilotRes.body.error.message).toContain('Message cannot be empty');
    });
  });

  // ============================================================================
  // 4. Clean Architecture End-to-End Execution
  // ============================================================================
  describe('4. Clean Architecture Domain Flow', () => {
    it('executes batch ingestion through validators, controllers, and services', async () => {
      const testTxn = {
        id: `TX-PHASE5-${Date.now()}`,
        amount: 8500,
        currency: 'USD',
        customerId: 'CUST-P5-99',
        customerName: 'Marcus Vance',
        merchant: 'Binance Digital',
        merchantCategory: 'Crypto',
        timestamp: new Date().toISOString(),
        location: 'Lagos, Nigeria',
        ipAddress: '102.89.22.1',
        deviceType: 'Linux / TOR Exit Node',
        status: 'pending' as const,
      };

      const ingestRes = await request(app)
        .post('/api/transactions/batch')
        .send({ transactions: [testTxn] });

      expect(ingestRes.status).toBe(200);
      expect(ingestRes.body.success).toBe(true);
      expect(ingestRes.body.ingestedCount).toBe(1);

      // Verify retrieval by ID
      const getRes = await request(app).get(`/api/transactions/${testTxn.id}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.id).toBe(testTxn.id);
      expect(getRes.body.riskScore).toBeGreaterThanOrEqual(0);

      // Verify investigation through clean service architecture
      const investRes = await request(app).post(`/api/investigate/${testTxn.id}`);
      expect(investRes.status).toBe(200);
      expect(investRes.body.success).toBe(true);
      expect(investRes.body.dossier).toBeDefined();

      // Verify analyst action resolution
      const resolveRes = await request(app)
        .post('/api/actions/resolve')
        .send({
          transactionId: testTxn.id,
          action: 'APPROVE',
          notes: 'Phase 5 clean architecture test resolution.',
          actorEmail: 'test_lead@risklens.ai',
          actorRole: 'lead_architect',
        });

      expect(resolveRes.status).toBe(200);
      expect(resolveRes.body.success).toBe(true);
      expect(resolveRes.body.transaction.status).toBe('approved');
      expect(resolveRes.body.auditLog).toBeDefined();

      // Verify analytics aggregation endpoint
      const analyticsRes = await request(app).get('/api/analytics/metrics');
      expect(analyticsRes.status).toBe(200);
      expect(analyticsRes.body.totalTransactions).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // 5. React Error Boundary Component
  // ============================================================================
  describe('5. React Error Boundary Component', () => {
    const ProblemChild = ({ shouldThrow }: { shouldThrow: boolean }) => {
      if (shouldThrow) {
        throw new Error('Simulated Component Crash in Transaction Graph');
      }
      return <div data-testid="healthy-child">System Operational</div>;
    };

    it('renders children normally when no exception is thrown', () => {
      render(
        <ErrorBoundary>
          <ProblemChild shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.getByTestId('healthy-child')).toBeInTheDocument();
      expect(screen.getByText('System Operational')).toBeInTheDocument();
    });

    it('intercepts rendering exceptions and displays recovery screen with action buttons', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      render(
        <ErrorBoundary>
          <ProblemChild shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('RiskLens AI Application Exception')).toBeInTheDocument();
      expect(screen.getByText(/Fault Intercepted/i)).toBeInTheDocument();
      expect(screen.getByText(/Simulated Component Crash in Transaction Graph/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Operation/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Return to Dashboard/i })).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('toggles collapsible diagnostic details when clicked', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

      render(
        <ErrorBoundary>
          <ProblemChild shouldThrow={true} />
        </ErrorBoundary>
      );

      const toggleBtn = screen.getByText('Technical Diagnostic Details');
      expect(screen.queryByText(/Stack Trace:/i)).not.toBeInTheDocument();

      fireEvent.click(toggleBtn);
      expect(screen.getByText(/Stack Trace:/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });
  });
});
