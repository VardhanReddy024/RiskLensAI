/**
 * RiskLens AI - Multi-Agent Investigation Service
 * 
 * Coordinates:
 * - Dossier caching and deduplication
 * - Execution of 8 specialized autonomous risk agents
 * - Score enrichment and transaction synchronization
 */

import { Transaction, InvestigationDossier } from '../../src/types';
import { db } from '../db';
import { orchestrateInvestigation } from '../agents/orchestrator';
import { metrics } from '../metrics';
import { NotFoundError } from '../errors';

export interface InvestigationResult {
  success: boolean;
  dossier: InvestigationDossier;
  cached?: boolean;
}

export class InvestigationService {
  private static instance: InvestigationService | null = null;

  public static getInstance(): InvestigationService {
    if (!InvestigationService.instance) {
      InvestigationService.instance = new InvestigationService();
    }
    return InvestigationService.instance;
  }

  /**
   * Runs or retrieves cached multi-agent investigation dossier for a transaction
   */
  public async investigate(id: string, transactionOverride?: Transaction): Promise<InvestigationResult> {
    let targetTxn = await db.transactions.getById(id);

    if (!targetTxn && transactionOverride) {
      targetTxn = transactionOverride;
      await db.transactions.save(targetTxn);
    }

    if (!targetTxn) {
      throw new NotFoundError(`Transaction ${id} not found in database.`);
    }

    // Check cached dossier to prevent duplicate processing
    const cachedDossier = await db.dossiers.get(id);
    if (cachedDossier) {
      return {
        success: true,
        dossier: cachedDossier,
        cached: true,
      };
    }

    // Run 8-Agent Orchestrator
    const dossier = await orchestrateInvestigation(targetTxn);
    await db.dossiers.save(id, dossier);
    metrics.recordInvestigation();

    // Synchronize transaction risk metrics with dossier findings
    await db.transactions.update(targetTxn.id, {
      riskScore: dossier.transaction.riskScore,
      fraudProbability: dossier.transaction.fraudProbability,
      riskTier: dossier.transaction.riskTier,
      confidenceScore: dossier.transaction.confidenceScore,
      estimatedLossPrevented: dossier.recommendation.estimatedLossPrevented,
    });

    return {
      success: true,
      dossier,
    };
  }
}

export const investigationService = InvestigationService.getInstance();
