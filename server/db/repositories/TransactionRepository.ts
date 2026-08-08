import { Transaction } from '../../../src/types/transaction';
import { ITransactionRepository, TransactionFilter, AnalyticsMetricsResult } from '../interfaces/ITransactionRepository';
import { IDataStoreAdapter } from '../interfaces/IDataStoreAdapter';
import { IAuditLogRepository } from '../interfaces/IAuditLogRepository';

export class TransactionRepository implements ITransactionRepository {
  private adapter: IDataStoreAdapter;
  private auditLogRepo?: IAuditLogRepository;

  constructor(adapter: IDataStoreAdapter, auditLogRepo?: IAuditLogRepository) {
    this.adapter = adapter;
    this.auditLogRepo = auditLogRepo;
  }

  public setAdapter(adapter: IDataStoreAdapter): void {
    this.adapter = adapter;
  }

  public setAuditLogRepository(auditLogRepo: IAuditLogRepository): void {
    this.auditLogRepo = auditLogRepo;
  }

  public async getAll(filter?: TransactionFilter): Promise<Transaction[]> {
    return this.adapter.getAllTransactions(filter);
  }

  public async getById(id: string): Promise<Transaction | null> {
    if (!id || typeof id !== 'string') return null;
    return this.adapter.getTransactionById(id.trim());
  }

  public async save(transaction: Transaction): Promise<Transaction> {
    if (!transaction || !transaction.id) {
      throw new Error('Cannot save transaction without a valid id');
    }
    return this.adapter.saveTransaction(transaction);
  }

  public async saveBatch(transactions: Transaction[]): Promise<Transaction[]> {
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return [];
    }
    return this.adapter.saveTransactionBatch(transactions);
  }

  public async update(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    if (!id) return null;
    return this.adapter.updateTransaction(id, updates);
  }

  public async delete(id: string): Promise<boolean> {
    if (!id) return false;
    return this.adapter.deleteTransaction(id);
  }

  public async count(filter?: TransactionFilter): Promise<number> {
    return this.adapter.countTransactions(filter);
  }

  public async clearAll(): Promise<void> {
    await this.adapter.clearTransactions();
  }

  public async seedIfEmpty(initialData: Transaction[]): Promise<number> {
    const existingCount = await this.adapter.countTransactions();
    if (existingCount === 0 && initialData.length > 0) {
      await this.adapter.saveTransactionBatch(initialData);
      return initialData.length;
    }
    return existingCount;
  }

  public async getAnalyticsMetrics(recentLogsLimit = 10): Promise<AnalyticsMetricsResult> {
    const all = await this.adapter.getAllTransactions();
    const totalTransactions = all.length;

    const flaggedCount = all.filter(t => t.status === 'flagged' || t.status === 'held' || t.status === 'rejected').length;
    const rejectedCount = all.filter(t => t.status === 'rejected').length;
    const approvedCount = all.filter(t => t.status === 'approved').length;

    const totalLossPrevented = all
      .filter(t => t.status === 'rejected' || t.status === 'flagged' || t.status === 'held')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalVolume = all.reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgRiskScore = totalTransactions > 0
      ? Math.round(all.reduce((sum, t) => sum + (t.riskScore || 0), 0) / totalTransactions)
      : 0;

    const criticalCount = all.filter(t => t.riskTier === 'CRITICAL').length;
    const highCount = all.filter(t => t.riskTier === 'HIGH').length;
    const mediumCount = all.filter(t => t.riskTier === 'MEDIUM').length;
    const lowCount = all.filter(t => t.riskTier === 'LOW').length;

    const fraudRate = totalTransactions > 0
      ? parseFloat(((flaggedCount / totalTransactions) * 100).toFixed(1))
      : 0;

    const recentLogs = this.auditLogRepo
      ? await this.auditLogRepo.getAll(recentLogsLimit)
      : await this.adapter.getAllAuditLogs(recentLogsLimit);

    return {
      totalTransactions,
      flaggedCount,
      rejectedCount,
      approvedCount,
      totalLossPrevented,
      totalVolume,
      avgRiskScore,
      fraudRate,
      tierDistribution: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      recentLogs,
    };
  }
}
