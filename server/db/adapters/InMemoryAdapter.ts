import { Transaction } from '../../../src/types/transaction';
import { AuditLog } from '../../../src/types/user';
import { InvestigationDossier } from '../../../src/types/investigation';
import { IDataStoreAdapter } from '../interfaces/IDataStoreAdapter';
import { TransactionFilter } from '../interfaces/ITransactionRepository';
import { NewAuditLogInput } from '../interfaces/IAuditLogRepository';

export class InMemoryAdapter implements IDataStoreAdapter {
  public readonly name = 'in-memory';
  private initialized = false;
  
  private transactions = new Map<string, Transaction>();
  private auditLogs: AuditLog[] = [];
  private dossiers = new Map<string, InvestigationDossier>();

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async initialize(): Promise<void> {
    this.initialized = true;
  }

  // ==========================================
  // TRANSACTION OPERATIONS
  // ==========================================

  public async getAllTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    let list = Array.from(this.transactions.values());

    if (filter) {
      if (filter.status && filter.status !== 'all') {
        const targetStatus = filter.status.toLowerCase();
        list = list.filter(t => (t.status || '').toLowerCase() === targetStatus);
      }
      if (filter.tier && filter.tier !== 'all') {
        const targetTier = filter.tier.toLowerCase();
        list = list.filter(t => (t.riskTier || '').toLowerCase() === targetTier);
      }
      if (filter.search && filter.search.trim().length > 0) {
        const q = filter.search.toLowerCase().trim();
        list = list.filter(t =>
          (t.id && t.id.toLowerCase().includes(q)) ||
          (t.customerId && t.customerId.toLowerCase().includes(q)) ||
          (t.customerName && t.customerName.toLowerCase().includes(q)) ||
          (t.merchant && t.merchant.toLowerCase().includes(q)) ||
          (t.location?.city && t.location.city.toLowerCase().includes(q)) ||
          (t.location?.country && t.location.country.toLowerCase().includes(q))
        );
      }
      if (typeof filter.offset === 'number' && filter.offset > 0) {
        list = list.slice(filter.offset);
      }
      if (typeof filter.limit === 'number' && filter.limit > 0) {
        list = list.slice(0, filter.limit);
      }
    }

    return list;
  }

  public async getTransactionById(id: string): Promise<Transaction | null> {
    const txn = this.transactions.get(id);
    return txn ? { ...txn } : null;
  }

  public async saveTransaction(transaction: Transaction): Promise<Transaction> {
    if (!transaction.id) {
      throw new Error("Transaction must have an 'id' attribute.");
    }
    const cloned = JSON.parse(JSON.stringify(transaction));
    this.transactions.set(transaction.id, cloned);
    return cloned;
  }

  public async saveTransactionBatch(transactions: Transaction[]): Promise<Transaction[]> {
    const saved: Transaction[] = [];
    for (const txn of transactions) {
      const result = await this.saveTransaction(txn);
      saved.push(result);
    }
    return saved;
  }

  public async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const existing = this.transactions.get(id);
    if (!existing) {
      return null;
    }
    const updated: Transaction = {
      ...existing,
      ...updates,
      id: existing.id, // Immutable ID
    };
    this.transactions.set(id, updated);
    return { ...updated };
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    return this.transactions.delete(id);
  }

  public async countTransactions(filter?: TransactionFilter): Promise<number> {
    const items = await this.getAllTransactions(filter);
    return items.length;
  }

  public async clearTransactions(): Promise<void> {
    this.transactions.clear();
  }

  // ==========================================
  // AUDIT LOG OPERATIONS
  // ==========================================

  public async getAllAuditLogs(limitCount?: number): Promise<AuditLog[]> {
    const logs = [...this.auditLogs];
    if (limitCount && limitCount > 0) {
      return logs.slice(0, limitCount);
    }
    return logs;
  }

  public async getAuditLogById(id: string): Promise<AuditLog | null> {
    const found = this.auditLogs.find(l => l.id === id);
    return found ? { ...found } : null;
  }

  public async getAuditLogsByTargetId(targetId: string, limitCount?: number): Promise<AuditLog[]> {
    let filtered = this.auditLogs.filter(l => l.targetId === targetId);
    if (limitCount && limitCount > 0) {
      filtered = filtered.slice(0, limitCount);
    }
    return filtered;
  }

  public async saveAuditLog(entry: NewAuditLogInput): Promise<AuditLog> {
    const log: AuditLog = {
      id: entry.id || `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      actorEmail: entry.actorEmail || 'system@risklens.ai',
      actorRole: entry.actorRole || 'fraud_analyst',
      action: entry.action,
      targetId: entry.targetId,
      details: entry.details,
      status: entry.status || 'SUCCESS',
    };
    this.auditLogs.unshift(log); // newest first
    return { ...log };
  }

  public async saveAuditLogBatch(entries: NewAuditLogInput[]): Promise<AuditLog[]> {
    const saved: AuditLog[] = [];
    for (const entry of entries) {
      const log = await this.saveAuditLog(entry);
      saved.push(log);
    }
    return saved;
  }

  public async countAuditLogs(): Promise<number> {
    return this.auditLogs.length;
  }

  public async clearAuditLogs(): Promise<void> {
    this.auditLogs = [];
  }

  // ==========================================
  // DOSSIER OPERATIONS
  // ==========================================

  public async getDossier(transactionId: string): Promise<InvestigationDossier | null> {
    const dossier = this.dossiers.get(transactionId);
    return dossier ? JSON.parse(JSON.stringify(dossier)) : null;
  }

  public async saveDossier(transactionId: string, dossier: InvestigationDossier): Promise<InvestigationDossier> {
    const cloned = JSON.parse(JSON.stringify(dossier));
    this.dossiers.set(transactionId, cloned);
    return cloned;
  }

  public async hasDossier(transactionId: string): Promise<boolean> {
    return this.dossiers.has(transactionId);
  }

  public async deleteDossier(transactionId: string): Promise<boolean> {
    return this.dossiers.delete(transactionId);
  }

  public async getAllDossiers(limitCount?: number): Promise<InvestigationDossier[]> {
    let list = Array.from(this.dossiers.values());
    if (limitCount && limitCount > 0) {
      list = list.slice(0, limitCount);
    }
    return list;
  }

  public async countDossiers(): Promise<number> {
    return this.dossiers.size;
  }

  public async clearDossiers(): Promise<void> {
    this.dossiers.clear();
  }
}
