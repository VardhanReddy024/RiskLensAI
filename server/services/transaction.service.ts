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
import { NotFoundError } from '../errors';

export interface TransactionFilterOptions {
  status?: string;
  tier?: string;
  search?: string;
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
   * Retrieves transactions with optional filtering and search
   */
  public async getTransactions(options: TransactionFilterOptions): Promise<{ transactions: Transaction[]; total: number }> {
    const results = await db.transactions.getAll({
      status: options.status ? String(options.status) : undefined,
      tier: options.tier ? String(options.tier) : undefined,
      search: options.search ? String(options.search) : undefined,
    });

    return {
      transactions: results,
      total: results.length,
    };
  }

  /**
   * Retrieves a single transaction by ID or throws a NotFoundError
   */
  public async getTransactionById(id: string): Promise<Transaction> {
    const transaction = await db.transactions.getById(id);
    if (!transaction) {
      throw new NotFoundError(`Transaction ${id} not found in database.`);
    }
    return transaction;
  }

  /**
   * Ingests a batch of transactions, scores with ML engine, and writes immutable audit logs
   */
  public async ingestBatch(transactions: Transaction[]): Promise<BatchIngestResult> {
    const processed: Transaction[] = transactions.map(txn => {
      const mlResult = evaluateTransactionWithML(txn);
      const score = txn.riskScore || mlResult.riskScore;
      if (score >= 60) {
        metrics.recordFraudDetected();
      }
      return {
        ...txn,
        riskScore: score,
        fraudProbability: txn.fraudProbability || mlResult.fraudProbability,
        riskTier: txn.riskTier || mlResult.riskTier,
        confidenceScore: txn.confidenceScore || mlResult.confidenceScore,
        status: txn.status || (score >= 60 ? 'flagged' : (score >= 30 ? 'pending' : 'approved')),
        estimatedLossPrevented: score >= 60 ? txn.amount : 0,
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
      details: `Successfully ingested and ML-scored batch of ${processed.length} transactions via persistent repository.`,
      status: 'SUCCESS',
    });

    const totalDbCount = await db.transactions.count();

    return {
      success: true,
      ingestedCount: processed.length,
      totalDbCount,
      transactions: processed.slice(0, 50),
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
