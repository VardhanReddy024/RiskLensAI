/**
 * RiskLens AI - Transaction Request Validators
 */

import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors';

/**
 * Validates batch transaction ingestion payload
 */
export function validateBatchUpload(req: Request, res: Response, next: NextFunction): void {
  const { transactions } = req.body || {};

  if (!transactions) {
    throw new ValidationError('Missing "transactions" field in request body', {
      field: 'transactions',
      expected: 'Non-empty Array of Transaction objects',
    });
  }

  if (!Array.isArray(transactions)) {
    throw new ValidationError('Invalid "transactions" payload: expected an array', {
      field: 'transactions',
      received: typeof transactions,
    });
  }

  if (transactions.length === 0) {
    throw new ValidationError('Transaction batch cannot be empty. Please provide at least 1 transaction.', {
      field: 'transactions',
      length: 0,
    });
  }

  // Validate item level structure for first 100 items (fast verification)
  const sample = transactions.slice(0, 100);
  for (let i = 0; i < sample.length; i++) {
    const txn = sample[i];
    if (!txn || typeof txn !== 'object') {
      throw new ValidationError(`Transaction at index ${i} is not a valid object`, { index: i });
    }
    if (!txn.id || typeof txn.id !== 'string' || txn.id.trim().length === 0) {
      throw new ValidationError(`Transaction at index ${i} is missing a required "id" string`, { index: i, txn });
    }
    if (typeof txn.amount !== 'number' || isNaN(txn.amount) || txn.amount < 0) {
      throw new ValidationError(`Transaction at index ${i} has an invalid "amount". Must be a non-negative number.`, {
        index: i,
        id: txn.id,
        amount: txn.amount,
      });
    }
  }

  next();
}

/**
 * Validates single transaction retrieval or creation by ID
 */
export function validateTransactionId(req: Request, res: Response, next: NextFunction): void {
  const { id } = req.params;

  if (!id || id.trim().length === 0) {
    throw new ValidationError('Transaction ID parameter is required', {
      param: 'id',
    });
  }

  next();
}

/**
 * Validates query parameters for transaction listing
 */
export function validateTransactionQuery(req: Request, res: Response, next: NextFunction): void {
  const { status, tier } = req.query;

  const validStatuses = ['approved', 'flagged', 'held', 'escalated', 'rejected', 'pending'];
  if (status && typeof status === 'string' && !validStatuses.includes(status.toLowerCase())) {
    throw new ValidationError(`Invalid "status" query filter: "${status}"`, {
      param: 'status',
      allowed: validStatuses,
    });
  }

  const validTiers = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  if (tier && typeof tier === 'string' && !validTiers.includes(tier.toUpperCase())) {
    throw new ValidationError(`Invalid "tier" query filter: "${tier}"`, {
      param: 'tier',
      allowed: validTiers,
    });
  }

  next();
}
