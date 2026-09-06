/**
 * RiskLens AI - Master API Router
 * 
 * Aggregates all modular route handlers under /api namespace
 */

import { Router } from 'express';
import healthRoutes from './health.routes';
import transactionRoutes from './transaction.routes';
import investigationRoutes from './investigation.routes';
import copilotRoutes from './copilot.routes';
import actionRoutes from './action.routes';
import analyticsRoutes from './analytics.routes';
import webhookRoutes from './webhook.routes';
import { requireAuth } from '../middleware/auth.middleware';

const apiRouter = Router();

// Public health, telemetry, and external webhook routes
apiRouter.use('/', healthRoutes);
apiRouter.use('/webhooks', webhookRoutes);

// Protected enterprise intelligence routes (Require verified identity & tenant context)
apiRouter.use('/transactions', requireAuth, transactionRoutes);
apiRouter.use('/investigate', requireAuth, investigationRoutes);
apiRouter.use('/copilot', requireAuth, copilotRoutes);
apiRouter.use('/actions', requireAuth, actionRoutes);
apiRouter.use('/analytics', requireAuth, analyticsRoutes);

export default apiRouter;
