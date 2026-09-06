/**
 * RiskLens AI - Health Probes & Operational Metrics Routes
 */

import { Router } from 'express';
import { HealthController } from '../controllers/health.controller';
import { MetricsController } from '../controllers/metrics.controller';

const router = Router();

// GET /api/health/live (Liveness probe for Cloud Run / Kubernetes)
router.get('/health/live', HealthController.getLiveness);

// GET /api/health/ready (Readiness probe for subsystem dependency health)
router.get('/health/ready', HealthController.getReadiness);

// GET /api/health (Standard overview)
router.get('/health', HealthController.getHealthOverview);

// GET /api/metrics (Prometheus or JSON metrics)
router.get('/metrics', MetricsController.getMetrics);

export default router;
