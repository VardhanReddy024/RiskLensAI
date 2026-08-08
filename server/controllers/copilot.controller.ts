/**
 * RiskLens AI - Copilot Controller
 */

import { Request, Response, NextFunction } from 'express';
import { copilotService } from '../services/copilot.service';

export class CopilotController {
  /**
   * POST /api/copilot/chat
   */
  public static async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transaction, chatHistory, message } = req.body;
      const result = await copilotService.chat(transaction, chatHistory, message);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
