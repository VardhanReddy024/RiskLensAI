/**
 * RiskLens AI - Transaction Domain Service
 * 
 * Encapsulates:
 * - Transaction retrieval with multi-criteria filtering and keyword search
 * - ML scoring pipeline integration
 * - Persistent batch ingestion & immutable audit trail creation
 * - Real-time metrics propagation
 */

import { Transaction } from '../../src/types';
import { db } from '../db';
import { evaluateTransactionWithML } from '../ml_engine';
import { metrics } from '../metrics';
import { NotFoundError, ForbiddenError } from '../errors';
import { verifyTenantOwnership } from '../middleware/tenant.middleware';

export interface TransactionFilterOptions {
  status?: string;
  tier?: string;
  search?: string;
  tenantId?: string;
}

export interface BatchIngestResult {
  success: boolean;
  ingestedCount: number;
  totalDbCount: number;
  transactions: Transaction[];
}

export class TransactionService {
  private static instance: TransactionService | null = null;

  public static getInstance(): TransactionService {
    if (!TransactionService.instance) {
      TransactionService.instance = new TransactionService();
    }
    return TransactionService.instance;
  }

  /**
   * Retrieves transactions with optional filtering, search, and tenant isolation
   */
  public async getTransactions(options: TransactionFilterOptions): Promise<{ transactions: Transaction[]; total: number }> {
    const results = await db.transactions.getAll({
      status: options.status ? String(options.status) : undefined,
      tier: options.tier ? String(options.tier) : undefined,
      search: options.search ? String(options.search) : undefined,
      tenantId: options.tenantId,
    });

    const tenantScoped = options.tenantId
      ? results.filter(t => verifyTenantOwnership(t.tenantId, options.tenantId!))
      : results;

    return {
      transactions: tenantScoped,
      total: tenantScoped.length,
    };
  }

  /**
   * Retrieves a single transaction by ID or throws a NotFoundError / ForbiddenError
   */
  public async getTransactionById(id: string, userTenantId?: string): Promise<Transaction> {
    const transaction = await db.transactions.getById(id);
    if (!transaction) {
      throw new NotFoundError(`Transaction ${id} not found in database.`);
    }

    if (userTenantId && !verifyTenantOwnership(transaction.tenantId, userTenantId)) {
      throw new ForbiddenError(`Forbidden: Access denied to transaction outside tenant scope.`);
    }

    return transaction;
  }

  /**
   * Ingests a batch of transactions, scores with ML engine, tags tenant, and writes immutable audit logs
   */
  public async ingestBatch(transactions: Transaction[], tenantId?: string, replaceExisting = false): Promise<BatchIngestResult> {
    if (!tenantId) {
      throw new ForbiddenError('A tenant context is required to ingest transactions.');
    }
    if (replaceExisting) {
      await db.transactions.clearAll(tenantId);
    }

    const processed: Transaction[] = transactions.map(txn => {
      const mlResult = evaluateTransactionWithML(txn);
      const score = (typeof txn.riskScore === 'number' && txn.riskScore > 0) ? txn.riskScore : mlResult.riskScore;
      if (score >= 60) {
        metrics.recordFraudDetected();
      }

      const tags = (txn.tags && txn.tags.length > 0)
        ? txn.tags
        : mlResult.shapFactors.filter(s => s.isSuspicious).map(s => s.displayName);

      const flagReasons = (txn.flagReasons && txn.flagReasons.length > 0)
        ? txn.flagReasons
        : mlResult.shapFactors.filter(s => s.impactScore > 15).map(s => s.explanation);

      return {
        ...txn,
        tenantId: tenantId || txn.tenantId || 'default_tenant',
        riskScore: score,
        fraudProbability: (typeof txn.fraudProbability === 'number' && txn.fraudProbability > 0) ? txn.fraudProbability : mlResult.fraudProbability,
        riskTier: txn.riskTier || mlResult.riskTier,
        riskLevel: txn.riskTier || mlResult.riskTier,
        confidenceScore: (typeof txn.confidenceScore === 'number' && txn.confidenceScore > 0) ? txn.confidenceScore : mlResult.confidenceScore,
        status: txn.status || (score >= 60 ? 'flagged' : (score >= 30 ? 'pending' : 'approved')),
        estimatedLossPrevented: score >= 60 ? txn.amount : 0,
        tags: tags.length > 0 ? tags : ['Standard Verification'],
        flagReasons,
      };
    });

    // Save batch in database repository
    await db.transactions.saveBatch(processed);
    metrics.recordTransactionIngest(processed.length);

    // Record immutable audit log
    await db.auditLogs.log({
      actorEmail: 'operator@risklens.ai',
      actorRole: 'fraud_analyst',
      action: 'BULK_INGEST',
      targetId: `${processed.length} Transactions`,
      details: `Successfully ingested and ML-scored batch of ${processed.length} transactions via persistent repository.${replaceExisting ? ' (Replaced active dataset)' : ''}`,
      status: 'SUCCESS',
    });

    const totalDbCount = await db.transactions.count();

    return {
      success: true,
      ingestedCount: processed.length,
      totalDbCount,
      transactions: processed,
    };
  }

  /**
   * Returns total transaction count in database
   */
  public async getCount(): Promise<number> {
    return db.transactions.count();
  }
}

export const transactionService = TransactionService.getInstance();
