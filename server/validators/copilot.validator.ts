/**
 * RiskLens AI - Copilot Request Validators
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors';

/**
 * Validates request payload for Copilot interactive inquiry
 */
export function validateCopilotChat(req: Request, res: Response, next: NextFunction): void {
  const { transaction, message } = req.body || {};

  if (!transaction || typeof transaction !== 'object') {
    throw new ValidationError('Missing or invalid "transaction" object in Copilot chat request', {
      field: 'transaction',
    });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    throw new ValidationError('Message cannot be empty in Copilot chat request', {
      field: 'message',
    });
  }

  next();
}
