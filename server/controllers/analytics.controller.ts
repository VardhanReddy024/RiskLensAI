/**
 * RiskLens AI - Analytics Controller
 */

import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';

export class AnalyticsController {
  /**
   * GET /api/analytics/metrics
   */
  public static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;
      const metricsData = await analyticsService.getMetrics(limit);
      res.status(200).json(metricsData);
    } catch (err) {
      next(err);
    }
  }
}
