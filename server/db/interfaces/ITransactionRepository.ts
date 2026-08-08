import { Transaction } from '../../../src/types/transaction';
import { AuditLog } from '../../../src/types/user';

export interface TransactionFilter {
  status?: string;
  tier?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface AnalyticsMetricsResult {
  totalTransactions: number;
  flaggedCount: number;
  rejectedCount: number;
  approvedCount: number;
  totalLossPrevented: number;
  totalVolume: number;
  avgRiskScore: number;
  fraudRate: number;
  tierDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  recentLogs: AuditLog[];
}

export interface ITransactionRepository {
  getAll(filter?: TransactionFilter): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  save(transaction: Transaction): Promise<Transaction>;
  saveBatch(transactions: Transaction[]): Promise<Transaction[]>;
  update(id: string, updates: Partial<Transaction>): Promise<Transaction | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: TransactionFilter): Promise<number>;
  getAnalyticsMetrics(recentLogsLimit?: number): Promise<AnalyticsMetricsResult>;
  seedIfEmpty(initialData: Transaction[]): Promise<number>;
  clearAll(): Promise<void>;
}
