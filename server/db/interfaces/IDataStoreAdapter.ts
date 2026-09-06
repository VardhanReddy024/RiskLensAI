import { Transaction } from '../../../src/types/transaction';
import { AuditLog } from '../../../src/types/user';
import { InvestigationDossier } from '../../../src/types/investigation';
import { TransactionFilter } from './ITransactionRepository';
import { NewAuditLogInput } from './IAuditLogRepository';

export interface WebhookEventRecord {
  id: string;
  provider: string;
  eventId: string;
  eventType: string;
  payload: Record<string, any>;
  signatureVerified: boolean;
  processingStatus: 'PENDING' | 'PROCESSED' | 'FAILED' | 'IGNORED';
  receivedAt: string;
  processedAt?: string;
  error?: string;
}

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
  clearTransactions(tenantId?: string): Promise<void>;

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

  // Webhook Event operations (Idempotency storage)
  claimWebhookEvent(event: WebhookEventRecord): Promise<boolean>;
  getWebhookEvent(provider: string, eventId: string): Promise<WebhookEventRecord | null>;
  saveWebhookEvent(event: WebhookEventRecord): Promise<WebhookEventRecord>;
  
  // Lifecycle operations
  close?(): Promise<void>;
}
