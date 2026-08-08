/**
 * RiskLens AI - Action Controller
 */

import { Request, Response, NextFunction } from 'express';
import { actionService } from '../services/action.service';

export class ActionController {
  /**
   * POST /api/actions/resolve
   */
  public static async resolveAction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId, action, notes, actorEmail, actorRole } = req.body;
      const result = await actionService.resolve({
        transactionId,
        action,
        notes,
        actorEmail,
        actorRole,
      });

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
