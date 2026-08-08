/**
 * RiskLens AI - Analytics Domain Service
 * 
 * Aggregates:
 * - Portfolio loss prevented
 * - Risk tier distributions
 * - Average risk and confidence scores
 * - Recent audit activity streams
 */

import { AnalyticsMetrics } from '../../src/types';
import { db } from '../db';

export class AnalyticsService {
  private static instance: AnalyticsService | null = null;

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Computes portfolio-wide analytics and audit trail aggregations
   */
  public async getMetrics(auditLogLimit = 10): Promise<AnalyticsMetrics> {
    return db.transactions.getAnalyticsMetrics(auditLogLimit);
  }
}

export const analyticsService = AnalyticsService.getInstance();
