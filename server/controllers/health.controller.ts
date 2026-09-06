/**
 * RiskLens AI - Health Probes Controller
 */

import { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service';

export class HealthController {
  /**
   * GET /api/health/live (Liveness Probe)
   */
  public static getLiveness(req: Request, res: Response): void {
    const live = healthService.getLiveness();
    res.status(200).json(live);
  }

  /**
   * GET /api/health/ready (Readiness Probe)
   */
  public static async getReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { isReady, data } = await healthService.getReadiness();
      const statusCode = isReady ? 200 : 503;
      res.status(statusCode).json(data);
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/health (Standard backward-compatible overview)
   */
  public static async getHealthOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await healthService.getStandardHealth();
      res.status(200).json(overview);
    } catch (err) {
      next(err);
    }
  }
}
