import { Transaction } from '../../../src/types/transaction';
import { AuditLog } from '../../../src/types/user';
import { InvestigationDossier } from '../../../src/types/investigation';
import { TransactionFilter } from './ITransactionRepository';
import { NewAuditLogInput } from './IAuditLogRepository';

export interface IDataStoreAdapter {
  name: 'postgres' | 'firestore' | 'in-memory';
  isInitialized(): boolean;
  initialize(): Promise<void>;
  
  // Transaction operations
  getAllTransactions(filter?: TransactionFilter): Promise<Transaction[]>;
  getTransactionById(id: string): Promise<Transaction | null>;
  saveTransaction(transaction: Transaction): Promise<Transaction>;
  saveTransactionBatch(transactions: Transaction[]): Promise<Transaction[]>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null>;
  deleteTransaction(id: string): Promise<boolean>;
  countTransactions(filter?: TransactionFilter): Promise<number>;
  clearTransactions(): Promise<void>;

  // Audit Log operations
  getAllAuditLogs(limitCount?: number): Promise<AuditLog[]>;
  getAuditLogById(id: string): Promise<AuditLog | null>;
  getAuditLogsByTargetId(targetId: string, limitCount?: number): Promise<AuditLog[]>;
  saveAuditLog(entry: NewAuditLogInput): Promise<AuditLog>;
  saveAuditLogBatch(entries: NewAuditLogInput[]): Promise<AuditLog[]>;
  countAuditLogs(): Promise<number>;
  clearAuditLogs(): Promise<void>;

  // Dossier operations
  getDossier(transactionId: string): Promise<InvestigationDossier | null>;
  saveDossier(transactionId: string, dossier: InvestigationDossier): Promise<InvestigationDossier>;
  hasDossier(transactionId: string): Promise<boolean>;
  deleteDossier(transactionId: string): Promise<boolean>;
  getAllDossiers(limitCount?: number): Promise<InvestigationDossier[]>;
  countDossiers(): Promise<number>;
  clearDossiers(): Promise<void>;
}
