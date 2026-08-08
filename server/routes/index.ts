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

const apiRouter = Router();

// Mount modular sub-routers
apiRouter.use('/', healthRoutes);
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/investigate', investigationRoutes);
apiRouter.use('/copilot', copilotRoutes);
apiRouter.use('/actions', actionRoutes);
apiRouter.use('/analytics', analyticsRoutes);

export default apiRouter;
