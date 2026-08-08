/**
 * RiskLens AI - Investigation Routes
 */

import { Router } from 'express';
import { InvestigationController } from '../controllers/investigation.controller';
import { validateInvestigationRequest } from '../validators/investigation.validator';

const router = Router();

// POST /api/investigate/:id
router.post('/:id', validateInvestigationRequest, InvestigationController.investigateTransaction);

export default router;
