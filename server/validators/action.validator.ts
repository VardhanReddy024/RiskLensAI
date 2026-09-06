/**
 * RiskLens AI - Action Resolution Request Validators
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors';

const VALID_ACTIONS = ['APPROVE', 'HOLD', 'ESCALATE', 'REJECT'];

/**
 * Validates analyst action resolution payload
 */
export function validateResolveAction(req: Request, res: Response, next: NextFunction): void {
  const { transactionId, action, notes, actorEmail, actorRole } = req.body || {};

  if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length === 0) {
    throw new ValidationError('Missing or invalid "transactionId" in action payload', {
      field: 'transactionId',
    });
  }

  if (!action || typeof action !== 'string' || !VALID_ACTIONS.includes(action.toUpperCase())) {
    throw new ValidationError(`Invalid action: "${action}". Expected one of: ${VALID_ACTIONS.join(', ')}`, {
      field: 'action',
      allowed: VALID_ACTIONS,
    });
  }

  if (actorEmail && typeof actorEmail !== 'string') {
    throw new ValidationError('"actorEmail" must be a valid string', {
      field: 'actorEmail',
    });
  }

  if (actorRole && typeof actorRole !== 'string') {
    throw new ValidationError('"actorRole" must be a valid string', {
      field: 'actorRole',
    });
  }

  next();
}
