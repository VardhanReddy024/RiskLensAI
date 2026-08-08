import pg from 'pg';
import { IDataStoreAdapter } from '../interfaces/IDataStoreAdapter';
import { Transaction } from '../../../src/types/transaction';
import { AuditLog } from '../../../src/types/user';
import { InvestigationDossier } from '../../../src/types/investigation';
import { TransactionFilter } from '../interfaces/ITransactionRepository';
import { NewAuditLogInput } from '../interfaces/IAuditLogRepository';
import { InMemoryAdapter } from './InMemoryAdapter';
import { logger } from '../../logger';

const { Pool } = pg;

export class PgAdapter implements IDataStoreAdapter {
  public name: 'postgres' | 'firestore' | 'in-memory' = 'postgres';
  private pool: pg.Pool | null = null;
  private initialized = false;
  private fallbackAdapter: InMemoryAdapter = new InMemoryAdapter();
  private isConnectedToPg = false;

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isPgConnected(): boolean {
    return this.isConnectedToPg;
  }

  public async initialize(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      logger.info('[PgAdapter] DATABASE_URL not set, falling back to in-memory persistence');
      await this.fallbackAdapter.initialize();
      this.initialized = true;
      return;
    }

    try {
      this.pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test connection
      const client = await this.pool.connect();
      client.release();
      this.isConnectedToPg = true;
      logger.info('[PgAdapter] Connected successfully to PostgreSQL database');

      // Ensure relational tables exist
      await this.createTablesIfNotExist();
      this.initialized = true;
    } catch (err: any) {
      logger.warn('[PgAdapter] PostgreSQL connection failed, switching to memory fallback:', { error: err?.message });
      this.isConnectedToPg = false;
      await this.fallbackAdapter.initialize();
      this.initialized = true;
    }
  }

  private async createTablesIfNotExist(): Promise<void> {
    if (!this.pool || !this.isConnectedToPg) return;

    const query = `
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL,
        amount NUMERIC NOT NULL,
        risk_score NUMERIC NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        target_id TEXT,
        action TEXT NOT NULL,
        actor TEXT NOT NULL,
        payload JSONB NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS dossiers (
        transaction_id TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.pool.query(query);
  }

  // --- Transactions ---

  public async getAllTransactions(filter?: TransactionFilter): Promise<Transaction[]> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.getAllTransactions(filter);
    }

    try {
      let query = 'SELECT payload FROM transactions';
      const params: any[] = [];
      const conditions: string[] = [];

      if (filter?.status) {
        params.push(filter.status);
        conditions.push(`status = $${params.length}`);
      }

      if (filter?.search) {
        params.push(`%${filter.search}%`);
        conditions.push(`(payload->>'merchant' ILIKE $${params.length} OR payload->>'category' ILIKE $${params.length} OR id ILIKE $${params.length})`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY created_at DESC';

      if (filter?.limit) {
        params.push(filter.limit);
        query += ` LIMIT $${params.length}`;
      }

      const res = await this.pool.query(query, params);
      return res.rows.map(r => r.payload);
    } catch {
      return this.fallbackAdapter.getAllTransactions(filter);
    }
  }

  public async getTransactionById(id: string): Promise<Transaction | null> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.getTransactionById(id);
    }

    try {
      const res = await this.pool.query('SELECT payload FROM transactions WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      return res.rows[0].payload;
    } catch {
      return this.fallbackAdapter.getTransactionById(id);
    }
  }

  public async saveTransaction(transaction: Transaction): Promise<Transaction> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.saveTransaction(transaction);
    }

    try {
      const query = `
        INSERT INTO transactions (id, status, amount, risk_score, payload, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          amount = EXCLUDED.amount,
          risk_score = EXCLUDED.risk_score,
          payload = EXCLUDED.payload;
      `;

      await this.pool.query(query, [
        transaction.id,
        transaction.status,
        transaction.amount,
        transaction.riskScore,
        JSON.stringify(transaction),
        transaction.timestamp || new Date().toISOString(),
      ]);

      return transaction;
    } catch {
      return this.fallbackAdapter.saveTransaction(transaction);
    }
  }

  public async saveTransactionBatch(transactions: Transaction[]): Promise<Transaction[]> {
    const saved: Transaction[] = [];
    for (const tx of transactions) {
      saved.push(await this.saveTransaction(tx));
    }
    return saved;
  }

  public async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | null> {
    const current = await this.getTransactionById(id);
    if (!current) return null;

    const updated: Transaction = {
      ...current,
      ...updates,
    };

    return this.saveTransaction(updated);
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.deleteTransaction(id);
    }

    try {
      const res = await this.pool.query('DELETE FROM transactions WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    } catch {
      return this.fallbackAdapter.deleteTransaction(id);
    }
  }

  public async countTransactions(filter?: TransactionFilter): Promise<number> {
    const all = await this.getAllTransactions(filter);
    return all.length;
  }

  public async clearTransactions(): Promise<void> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.clearTransactions();
    }

    try {
      await this.pool.query('TRUNCATE TABLE transactions');
    } catch {
      await this.fallbackAdapter.clearTransactions();
    }
  }

  // --- Audit Logs ---

  public async getAllAuditLogs(limitCount?: number): Promise<AuditLog[]> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.getAllAuditLogs(limitCount);
    }

    try {
      let query = 'SELECT payload FROM audit_logs ORDER BY timestamp DESC';
      const params: any[] = [];
      if (limitCount) {
        params.push(limitCount);
        query += ' LIMIT $1';
      }
      const res = await this.pool.query(query, params);
      return res.rows.map(r => r.payload);
    } catch {
      return this.fallbackAdapter.getAllAuditLogs(limitCount);
    }
  }

  public async getAuditLogById(id: string): Promise<AuditLog | null> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.getAuditLogById(id);
    }

    try {
      const res = await this.pool.query('SELECT payload FROM audit_logs WHERE id = $1', [id]);
      if (res.rows.length === 0) return null;
      return res.rows[0].payload;
    } catch {
      return this.fallbackAdapter.getAuditLogById(id);
    }
  }

  public async getAuditLogsByTargetId(targetId: string, limitCount?: number): Promise<AuditLog[]> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.getAuditLogsByTargetId(targetId, limitCount);
    }

    try {
      let query = 'SELECT payload FROM audit_logs WHERE target_id = $1 ORDER BY timestamp DESC';
      const params: any[] = [targetId];
      if (limitCount) {
        params.push(limitCount);
        query += ' LIMIT $2';
      }
      const res = await this.pool.query(query, params);
      return res.rows.map(r => r.payload);
    } catch {
      return this.fallbackAdapter.getAuditLogsByTargetId(targetId, limitCount);
    }
  }

  public async saveAuditLog(entry: NewAuditLogInput): Promise<AuditLog> {
    const id = entry.id || `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullLog: AuditLog = {
      id,
      timestamp: entry.timestamp || new Date().toISOString(),
      action: entry.action,
      actorEmail: entry.actorEmail || 'system@risklens.ai',
      actorRole: entry.actorRole || 'senior_fraud_analyst',
      targetId: entry.targetId,
      details: entry.details,
      status: entry.status || 'SUCCESS',
    };

    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.saveAuditLog(entry);
    }

    try {
      const query = `
        INSERT INTO audit_logs (id, target_id, action, actor, payload, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6);
      `;
      await this.pool.query(query, [
        fullLog.id,
        fullLog.targetId || null,
        fullLog.action,
        fullLog.actorEmail,
        JSON.stringify(fullLog),
        fullLog.timestamp,
      ]);
      return fullLog;
    } catch {
      return this.fallbackAdapter.saveAuditLog(entry);
    }
  }

  public async saveAuditLogBatch(entries: NewAuditLogInput[]): Promise<AuditLog[]> {
    const saved: AuditLog[] = [];
    for (const e of entries) {
      saved.push(await this.saveAuditLog(e));
    }
    return saved;
  }

  public async countAuditLogs(): Promise<number> {
    const logs = await this.getAllAuditLogs();
    return logs.length;
  }

  public async clearAuditLogs(): Promise<void> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.clearAuditLogs();
    }

    try {
      await this.pool.query('TRUNCATE TABLE audit_logs');
    } catch {
      await this.fallbackAdapter.clearAuditLogs();
    }
  }

  // --- Dossiers ---

  public async getDossier(transactionId: string): Promise<InvestigationDossier | null> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.getDossier(transactionId);
    }

    try {
      const res = await this.pool.query('SELECT payload FROM dossiers WHERE transaction_id = $1', [transactionId]);
      if (res.rows.length === 0) return null;
      return res.rows[0].payload;
    } catch {
      return this.fallbackAdapter.getDossier(transactionId);
    }
  }

  public async saveDossier(transactionId: string, dossier: InvestigationDossier): Promise<InvestigationDossier> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.saveDossier(transactionId, dossier);
    }

    try {
      const query = `
        INSERT INTO dossiers (transaction_id, payload, created_at)
        VALUES ($1, $2, $3)
        ON CONFLICT (transaction_id) DO UPDATE SET
          payload = EXCLUDED.payload;
      `;
      await this.pool.query(query, [
        transactionId,
        JSON.stringify(dossier),
        dossier.startedAt || new Date().toISOString(),
      ]);
      return dossier;
    } catch {
      return this.fallbackAdapter.saveDossier(transactionId, dossier);
    }
  }

  public async hasDossier(transactionId: string): Promise<boolean> {
    const d = await this.getDossier(transactionId);
    return d !== null;
  }

  public async deleteDossier(transactionId: string): Promise<boolean> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.deleteDossier(transactionId);
    }

    try {
      const res = await this.pool.query('DELETE FROM dossiers WHERE transaction_id = $1', [transactionId]);
      return (res.rowCount ?? 0) > 0;
    } catch {
      return this.fallbackAdapter.deleteDossier(transactionId);
    }
  }

  public async getAllDossiers(limitCount?: number): Promise<InvestigationDossier[]> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.getAllDossiers(limitCount);
    }

    try {
      let query = 'SELECT payload FROM dossiers ORDER BY created_at DESC';
      const params: any[] = [];
      if (limitCount) {
        params.push(limitCount);
        query += ' LIMIT $1';
      }
      const res = await this.pool.query(query, params);
      return res.rows.map(r => r.payload);
    } catch {
      return this.fallbackAdapter.getAllDossiers(limitCount);
    }
  }

  public async countDossiers(): Promise<number> {
    const all = await this.getAllDossiers();
    return all.length;
  }

  public async clearDossiers(): Promise<void> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.clearDossiers();
    }

    try {
      await this.pool.query('TRUNCATE TABLE dossiers');
    } catch {
      await this.fallbackAdapter.clearDossiers();
    }
  }
}
