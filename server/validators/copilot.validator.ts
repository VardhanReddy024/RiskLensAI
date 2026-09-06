/**
 * RiskLens AI - Copilot Request Validators
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors';

/**
 * Validates request payload for Copilot interactive inquiry
 */
export function validateCopilotChat(req: Request, res: Response, next: NextFunction): void {
  const { transactionId, message, question } = req.body || {};

  const queryText = (question !== undefined ? question : message);

  if (queryText === undefined || queryText === null || typeof queryText !== 'string' || queryText.trim().length === 0) {
    throw new ValidationError('Message cannot be empty in Copilot chat request', {
      field: 'message',
    });
  }

  const effectiveTxnId = transactionId || req.body?.transaction?.id;

  if (!effectiveTxnId || typeof effectiveTxnId !== 'string' || effectiveTxnId.trim().length === 0) {
    throw new ValidationError('Missing "transactionId" in Copilot chat request', {
      field: 'transactionId',
    });
  }

  next();
}
