/**
 * RiskLens AI - Analytics Routes
 */

import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

// GET /api/analytics/metrics
router.get('/metrics', AnalyticsController.getMetrics);

export default router;
