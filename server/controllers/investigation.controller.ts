/**
 * RiskLens AI - Investigation Controller
 */

import { Request, Response, NextFunction } from 'express';
import { investigationService } from '../services/investigation.service';

export class InvestigationController {
  /**
   * POST /api/investigate/:id
   */
  public static async investigateTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const transactionOverride = req.body ? req.body.transaction : undefined;
      const result = await investigationService.investigate(id, transactionOverride);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
