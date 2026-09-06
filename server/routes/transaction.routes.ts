/**
 * RiskLens AI - Transaction Routes
 */

import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import {
  validateBatchUpload,
  validateTransactionId,
  validateTransactionQuery,
} from '../validators/transaction.validator';

const router = Router();

// GET /api/transactions
router.get('/', validateTransactionQuery, TransactionController.getTransactions);

// GET /api/transactions/:id
router.get('/:id', validateTransactionId, TransactionController.getTransactionById);

// POST /api/transactions/batch
router.post('/batch', validateBatchUpload, TransactionController.ingestBatch);

export default router;
