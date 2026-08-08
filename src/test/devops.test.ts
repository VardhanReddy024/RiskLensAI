// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createExpressApp } from '../../server';
import { logger } from '../../server/logger';
import { metrics } from '../../server/metrics';
import { Express } from 'express';

describe('RiskLens AI Phase 4 DevOps & Production Readiness Suite', () => {
  let app: Express;

  beforeAll(() => {
    app = createExpressApp();
  });

  describe('1. Structured JSON Logger & Tracing', () => {
    it('records and formats structured log entries with ISO timestamp and levels', () => {
      const testCorrelationId = 'corr_test_999';
      
      logger.info('Test informational production log', {
        correlationId: testCorrelationId,
        customKey: 'enterprise_validation',
      });

      const recentLogs = logger.getRecentLogs(10);
      const foundLog = recentLogs.find(l => l.correlationId === testCorrelationId);

      expect(foundLog).toBeDefined();
      expect(foundLog?.level).toBe('INFO');
      expect(foundLog?.service).toBe('risklens-ai');
      expect(foundLog?.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(foundLog?.metadata?.customKey).toBe('enterprise_validation');
    });

    it('records error logs with error name and message', () => {
      const sampleError = new Error('Database connection pool transient failure');
      logger.error('Failed executing transaction audit query', {
        error: sampleError,
        correlationId: 'corr_err_123',
      });

      const recentLogs = logger.getRecentLogs(5);
      const errorLog = recentLogs.find(l => l.correlationId === 'corr_err_123');

      expect(errorLog).toBeDefined();
      expect(errorLog?.level).toBe('ERROR');
      expect(errorLog?.error?.message).toContain('Database connection pool transient failure');
    });

    it('flushes logger buffers gracefully', () => {
      expect(() => logger.flush()).not.toThrow();
    });
  });

  describe('2. Request Tracing & Correlation ID Propagation', () => {
    it('generates a unique X-Request-ID if none is provided in request headers', async () => {
      const res = await request(app).get('/api/health/live');

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBeDefined();
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect(res.headers['x-request-id'].length).toBeGreaterThan(5);
    });

    it('propagates incoming X-Request-ID and X-Correlation-ID from client', async () => {
      const customId = 'req_custom_trace_888444';
      const res = await request(app)
        .get('/api/health/live')
        .set('X-Request-ID', customId);

      expect(res.status).toBe(200);
      expect(res.headers['x-request-id']).toBe(customId);
      expect(res.headers['x-correlation-id']).toBe(customId);
    });
  });

  describe('3. Production Security Headers & CORS', () => {
    it('attaches Helmet security headers to HTTP responses', async () => {
      const res = await request(app).get('/api/health/live');

      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-xss-protection']).toBe('0');
      expect(res.headers['strict-transport-security']).toBeDefined();
    });

    it('sets CORS and credential headers appropriately for trusted origins', async () => {
      const res = await request(app)
        .get('/api/health/live')
        .set('Origin', 'https://risklens-platform.vercel.app');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://risklens-platform.vercel.app');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });
  });

  describe('4. Health Probes (Live & Ready) and Metrics Endpoints', () => {
    it('GET /api/health/live returns 200 OK for Docker/K8s liveness probes', async () => {
      const res = await request(app).get('/api/health/live');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.liveness).toBe(true);
      expect(res.body.service).toBe('risklens-ai');
      expect(res.body.timestamp).toBeDefined();
    });

    it('GET /api/health/ready returns 200 OK with deep subsystem readiness', async () => {
      const res = await request(app).get('/api/health/ready');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UP');
      expect(res.body.readiness).toBe(true);
      expect(res.body.database).toBeDefined();
      expect(res.body.services.ml_engine).toBe(true);
      expect(res.body.services.orchestrator).toBe(true);
    });

    it('GET /api/metrics returns full JSON operational and business metrics', async () => {
      const res = await request(app).get('/api/metrics');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.system).toBeDefined();
      expect(res.body.system.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(res.body.system.memory.heapUsedMb).toBeGreaterThan(0);
      expect(res.body.http).toBeDefined();
      expect(res.body.http.totalRequests).toBeGreaterThan(0);
      expect(res.body.business).toBeDefined();
    });

    it('GET /api/metrics?format=prometheus returns Prometheus exposition format', async () => {
      const res = await request(app).get('/api/metrics?format=prometheus');

      expect(res.status).toBe(200);
      expect(res.text).toContain('risklens_process_uptime_seconds');
      expect(res.text).toContain('risklens_http_requests_total');
      expect(res.text).toContain('risklens_investigations_total');
    });

    it('GET /api/health maintains backward compatibility for existing frontend', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.platform).toBe('RiskLens AI');
      expect(res.body.database).toBeDefined();
      expect(res.body.services).toBeDefined();
    });
  });

  describe('5. Metrics Registry In-Flight Tracking', () => {
    it('records business events and updates counter metrics accurately', () => {
      const before = metrics.getBusinessMetrics().transactionsIngested;
      metrics.recordTransactionIngest(5);
      const after = metrics.getBusinessMetrics().transactionsIngested;

      expect(after).toBe(before + 5);
    });

    it('computes system resource metrics accurately', () => {
      const sys = metrics.getSystemMetrics();

      expect(sys.pid).toBe(process.pid);
      expect(sys.nodeVersion).toBe(process.version);
      expect(sys.memory.rssMb).toBeGreaterThan(0);
    });
  });
});
