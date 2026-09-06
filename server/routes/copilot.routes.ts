/**
 * RiskLens AI - Copilot Chat Routes
 */

import { Router } from 'express';
import { CopilotController } from '../controllers/copilot.controller';
import { validateCopilotChat } from '../validators/copilot.validator';

const router = Router();

// POST /api/copilot/chat
router.post('/chat', validateCopilotChat, CopilotController.chat);

export default router;
