import pg from 'pg';
import { IDataStoreAdapter, WebhookEventRecord } from '../interfaces/IDataStoreAdapter';
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
  private initializationPromise: Promise<void> | null = null;
  private fallbackAdapter: InMemoryAdapter = new Proxy(new InMemoryAdapter(), {
    get: (target, property, receiver) => {
      if (this.isStrictDatabase()) {
        return () => {
          throw new Error('[PgAdapter] Strict Mode: PostgreSQL operation failed; memory fallback is disabled.');
        };
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
  private isConnectedToPg = false;

  private isStrictDatabase(): boolean {
    return process.env.STRICT_DATABASE === 'true'
      || (process.env.NODE_ENV === 'production' && process.env.DATA_STORE_PROVIDER === 'postgres');
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public isPgConnected(): boolean {
    return this.isConnectedToPg;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.initializeInternal();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async initializeInternal(): Promise<void> {
    const connectionString = process.env.DATABASE_URL;
    const isStrict = this.isStrictDatabase();

    if (!connectionString) {
      if (isStrict) {
        throw new Error('[PgAdapter] Strict Mode: DATABASE_URL is missing but PostgreSQL is required.');
      }
      logger.info('[PgAdapter] DATABASE_URL not set, falling back to in-memory persistence');
      await this.fallbackAdapter.initialize();
      this.initialized = true;
      return;
    }

    try {
      let sslConfig: boolean | { rejectUnauthorized: boolean; ca?: string } = false;

      const isProduction = process.env.NODE_ENV === 'production';
      const forceSsl = connectionString.includes('sslmode=') || Boolean(process.env.PGSSLMODE) || process.env.DATABASE_SSL === 'true';

      if (isProduction || forceSsl) {
        const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';
        const caCert = process.env.DATABASE_CA_CERT || process.env.PGSSLROOTCERT;

        sslConfig = {
          rejectUnauthorized,
          ...(caCert ? { ca: caCert } : {}),
        };
      }

      this.pool = new Pool({
        connectionString,
        ssl: sslConfig,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      // Test connection
      const client = await this.pool.connect();
      client.release();
      this.isConnectedToPg = true;
      logger.info(`[PgAdapter] Connected successfully to PostgreSQL database (TLS: ${Boolean(sslConfig)})`);

      // Ensure relational tables exist
      await this.createTablesIfNotExist();
      this.initialized = true;
    } catch (err: any) {
      // Sanitize credentials from error messages to avoid leaking passwords in logs
      const sanitizedError = (err?.message || 'Database connection failure').replace(/:\/\/.*@/, '://***:***@');
      if (isStrict) {
        logger.error('[PgAdapter] Strict Mode: PostgreSQL connection failed, refusing silent memory fallback:', { error: sanitizedError });
        throw new Error(`[PgAdapter] Strict Mode: Failed to connect to PostgreSQL: ${sanitizedError}`);
      }
      logger.warn('[PgAdapter] PostgreSQL connection failed, switching to memory fallback:', { error: sanitizedError });
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
        tenant_id TEXT,
        provider TEXT,
        provider_payment_id TEXT,
        provider_order_id TEXT,
        provider_event_id TEXT,
        risk_decision TEXT,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_transactions_tenant_id ON transactions (tenant_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_provider ON transactions (provider);
      CREATE INDEX IF NOT EXISTS idx_transactions_provider_payment_id ON transactions (provider_payment_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_provider_event_id ON transactions (provider_event_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions (status);
      CREATE INDEX IF NOT EXISTS idx_transactions_risk_score ON transactions (risk_score);

      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        event_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload JSONB NOT NULL,
        signature_verified BOOLEAN NOT NULL DEFAULT false,
        processing_status TEXT NOT NULL DEFAULT 'PENDING',
        received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at TIMESTAMPTZ,
        error TEXT,
        CONSTRAINT uq_provider_event UNIQUE (provider, event_id)
      );

      CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_event ON webhook_events (provider, event_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events (processing_status);

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
        tenant_id TEXT,
        payload JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Data Isolation Migration: backfill unassigned NULL tenant records to 'default_tenant'
      UPDATE transactions SET tenant_id = 'default_tenant' WHERE tenant_id IS NULL;
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

      if (filter?.tenantId) {
        // Strict tenant isolation: Tenant A never sees Tenant B. Default records are only visible to internal RiskLens operators.
        const isInternalTenant = filter.tenantId === 'default_tenant' || filter.tenantId === 'tenant_risklens_ai' || filter.tenantId === 'tenant_risklens';
        params.push(filter.tenantId);
        if (isInternalTenant) {
          conditions.push(`(tenant_id = $${params.length} OR tenant_id = 'default_tenant' OR tenant_id IS NULL)`);
        } else {
          conditions.push(`tenant_id = $${params.length}`);
        }
      }

      if (filter?.provider) {
        params.push(filter.provider);
        conditions.push(`provider = $${params.length}`);
      }

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
        INSERT INTO transactions (
          id, status, amount, risk_score, tenant_id, provider,
          provider_payment_id, provider_order_id, provider_event_id,
          risk_decision, payload, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          amount = EXCLUDED.amount,
          risk_score = EXCLUDED.risk_score,
          tenant_id = EXCLUDED.tenant_id,
          provider = EXCLUDED.provider,
          provider_payment_id = EXCLUDED.provider_payment_id,
          provider_order_id = EXCLUDED.provider_order_id,
          provider_event_id = EXCLUDED.provider_event_id,
          risk_decision = EXCLUDED.risk_decision,
          payload = EXCLUDED.payload;
      `;

      await this.pool.query(query, [
        transaction.id,
        transaction.status,
        transaction.amount,
        transaction.riskScore,
        transaction.tenantId || 'default_tenant',
        transaction.provider || null,
        transaction.providerPaymentId || null,
        transaction.providerOrderId || null,
        transaction.providerEventId || null,
        transaction.riskDecision || null,
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

  public async clearTransactions(tenantId?: string): Promise<void> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.clearTransactions(tenantId);
    }

    try {
      if (tenantId) {
        await this.pool.query('DELETE FROM transactions WHERE tenant_id = $1', [tenantId]);
      } else {
        await this.pool.query('TRUNCATE TABLE transactions');
      }
    } catch {
      await this.fallbackAdapter.clearTransactions(tenantId);
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

  // --- Webhook Events (Idempotency storage) ---

  public async claimWebhookEvent(event: WebhookEventRecord): Promise<boolean> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.claimWebhookEvent(event);
    }

    try {
      const result = await this.pool.query(
        `INSERT INTO webhook_events (
          id, provider, event_id, event_type, payload,
          signature_verified, processing_status, received_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (provider, event_id) DO NOTHING`,
        [event.id, event.provider, event.eventId, event.eventType, JSON.stringify(event.payload), event.signatureVerified, event.processingStatus, event.receivedAt]
      );
      return (result.rowCount ?? 0) === 1;
    } catch (error) {
      if (process.env.STRICT_DATABASE === 'true') throw error;
      return this.fallbackAdapter.claimWebhookEvent(event);
    }
  }

  public async getWebhookEvent(provider: string, eventId: string): Promise<WebhookEventRecord | null> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.getWebhookEvent(provider, eventId);
    }

    try {
      const res = await this.pool.query(
        'SELECT id, provider, event_id as "eventId", event_type as "eventType", payload, signature_verified as "signatureVerified", processing_status as "processingStatus", received_at as "receivedAt", processed_at as "processedAt", error FROM webhook_events WHERE provider = $1 AND event_id = $2',
        [provider, eventId]
      );
      if (res.rows.length === 0) return null;
      return res.rows[0];
    } catch {
      return this.fallbackAdapter.getWebhookEvent(provider, eventId);
    }
  }

  public async saveWebhookEvent(event: WebhookEventRecord): Promise<WebhookEventRecord> {
    if (!this.isConnectedToPg || !this.pool) {
      return this.fallbackAdapter.saveWebhookEvent(event);
    }

    try {
      const query = `
        INSERT INTO webhook_events (
          id, provider, event_id, event_type, payload,
          signature_verified, processing_status, received_at,
          processed_at, error
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (provider, event_id) DO UPDATE SET
          processing_status = EXCLUDED.processing_status,
          processed_at = EXCLUDED.processed_at,
          signature_verified = EXCLUDED.signature_verified,
          error = EXCLUDED.error;
      `;

      await this.pool.query(query, [
        event.id,
        event.provider,
        event.eventId,
        event.eventType,
        JSON.stringify(event.payload),
        event.signatureVerified,
        event.processingStatus,
        event.receivedAt || new Date().toISOString(),
        event.processedAt || null,
        event.error || null,
      ]);

      return event;
    } catch {
      return this.fallbackAdapter.saveWebhookEvent(event);
    }
  }

  public async close(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.end();
      } catch (err: any) {
        logger.error('[PgAdapter] Error closing connection pool:', { error: err?.message });
      } finally {
        this.pool = null;
        this.isConnectedToPg = false;
        this.initialized = false;
      }
    }
  }
}
