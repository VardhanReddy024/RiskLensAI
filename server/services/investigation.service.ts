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
import { NotFoundError, ForbiddenError } from '../errors';
import { verifyTenantOwnership } from '../middleware/tenant.middleware';

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
  public async investigate(id: string, transactionOverride?: Transaction, userTenantId?: string): Promise<InvestigationResult> {
    let targetTxn = await db.transactions.getById(id);

    if (!targetTxn) {
      if (transactionOverride && transactionOverride.id === id) {
        // Persist new transaction stamped with the authenticated user's tenant
        targetTxn = await db.transactions.save({
          ...transactionOverride,
          tenantId: userTenantId || transactionOverride.tenantId || 'default_tenant',
        });
      } else {
        throw new NotFoundError(`Transaction ${id} not found in database.`);
      }
    }

    // Re-adopt platform sample / unassigned transactions under the authenticated tenant.
    // If the stored record has no tenant or is the platform default, and the request comes
    // from a real authenticated user, stamp it with their tenant so they can own it.
    if (
      userTenantId &&
      userTenantId !== 'default_tenant' &&
      (!targetTxn.tenantId || targetTxn.tenantId === 'default_tenant')
    ) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `[RiskLens] Adopting transaction ${id} from default_tenant -> ${userTenantId}`,
        );
      }
      targetTxn = await db.transactions.save({ ...targetTxn, tenantId: userTenantId });
    }

    if (userTenantId && !verifyTenantOwnership(targetTxn.tenantId, userTenantId)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          `[RiskLens] Tenant mismatch: txn.tenantId=${targetTxn.tenantId} user=${userTenantId}`,
        );
      }
      throw new ForbiddenError(`Forbidden: Access denied to transaction outside tenant scope.`);
    }

    // Check cached dossier to prevent duplicate processing
    const cachedDossier = await db.dossiers.get(id);
    if (cachedDossier) {
      if (userTenantId && !verifyTenantOwnership(cachedDossier.transaction?.tenantId || targetTxn.tenantId, userTenantId)) {
        throw new ForbiddenError(`Forbidden: Access denied to transaction outside tenant scope.`);
      }
      return {
        success: true,
        dossier: cachedDossier,
        cached: true,
      };
    }

    // Run 8-Agent Orchestrator
    const dossier = await orchestrateInvestigation(targetTxn);
    if (dossier.transaction) {
      dossier.transaction.tenantId = targetTxn.tenantId;
    }
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
