/**
 * RiskLens AI - Metrics Controller
 */

import { Request, Response } from 'express';
import { metrics } from '../metrics';

export class MetricsController {
  /**
   * GET /api/metrics (JSON or Prometheus format)
   */
  public static getMetrics(req: Request, res: Response): void {
    const format = req.query.format;
    if (format === 'prometheus' || req.headers.accept?.includes('text/plain')) {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics.toPrometheusFormat());
      return;
    }

    res.status(200).json(metrics.getFullMetrics());
  }
}
