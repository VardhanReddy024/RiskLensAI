/**
 * RiskLens AI - Transaction Controller
 */

import { Request, Response, NextFunction } from 'express';
import { transactionService } from '../services/transaction.service';

export class TransactionController {
  /**
   * GET /api/transactions
   */
  public static async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { status, tier, search } = req.query;
      const result = await transactionService.getTransactions({
        status: status ? String(status) : undefined,
        tier: tier ? String(tier) : undefined,
        search: search ? String(search) : undefined,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/transactions/:id
   */
  public static async getTransactionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const found = await transactionService.getTransactionById(id);
      res.status(200).json(found);
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/transactions/batch
   */
  public static async ingestBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactions } = req.body;
      const result = await transactionService.ingestBatch(transactions);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
