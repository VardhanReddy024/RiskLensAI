/**
 * RiskLens AI - Action Resolution Routes
 */

import { Router } from 'express';
import { ActionController } from '../controllers/action.controller';
import { validateResolveAction } from '../validators/action.validator';

const router = Router();

// POST /api/actions/resolve
router.post('/resolve', validateResolveAction, ActionController.resolveAction);

export default router;
