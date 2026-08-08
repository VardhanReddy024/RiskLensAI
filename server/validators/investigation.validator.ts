/**
 * RiskLens AI - Investigation Request Validators
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors';

/**
 * Validates request to trigger or query multi-agent investigation
 */
export function validateInvestigationRequest(req: Request, res: Response, next: NextFunction): void {
  const { id } = req.params;

  if (!id || id.trim().length === 0) {
    throw new ValidationError('Investigation requires a valid transaction ID parameter', {
      param: 'id',
    });
  }

  // If a full transaction payload override was sent in the body, check its structure
  if (req.body && req.body.transaction) {
    const txn = req.body.transaction;
    if (typeof txn !== 'object' || !txn.id) {
      throw new ValidationError('Invalid transaction override payload in investigation request body', {
        field: 'transaction',
      });
    }
  }

  next();
}
