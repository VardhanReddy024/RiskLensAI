import { IDataStoreAdapter } from './interfaces/IDataStoreAdapter';
import { InMemoryAdapter } from './adapters/InMemoryAdapter';
import { FirestoreAdapter } from './adapters/FirestoreAdapter';
import { PgAdapter } from './adapters/PgAdapter';
import { TransactionRepository } from './repositories/TransactionRepository';
import { AuditLogRepository } from './repositories/AuditLogRepository';
import { DossierRepository } from './repositories/DossierRepository';
import { seedDatabaseIfEmpty, INITIAL_AUDIT_LOGS } from './seed';
import { INITIAL_TRANSACTIONS } from '../../src/data/sample_datasets';

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  
  public adapter: IDataStoreAdapter;
  public readonly transactions: TransactionRepository;
  public readonly auditLogs: AuditLogRepository;
  public readonly dossiers: DossierRepository;
  private initialized = false;

  private constructor() {
    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    const provider = process.env.DATA_STORE_PROVIDER || (process.env.DATABASE_URL ? 'postgres' : (isTest ? 'in-memory' : 'firestore'));
    
    if (provider === 'postgres' || process.env.DATABASE_URL) {
      this.adapter = new PgAdapter();
    } else if (provider === 'in-memory' || isTest) {
      this.adapter = new InMemoryAdapter();
    } else {
      this.adapter = new FirestoreAdapter();
    }

    this.auditLogs = new AuditLogRepository(this.adapter);
    this.transactions = new TransactionRepository(this.adapter, this.auditLogs);
    this.dossiers = new DossierRepository(this.adapter);

    // Eager synchronous fallback seeding so in-memory store is instantly populated
    this.transactions.seedIfEmpty(INITIAL_TRANSACTIONS);
    this.auditLogs.seedIfEmpty(INITIAL_AUDIT_LOGS);
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.adapter.initialize();
      this.initialized = true;

      // Auto-seed initial data on startup if empty
      await seedDatabaseIfEmpty(this.transactions, this.auditLogs);
    } catch (err: any) {
      console.warn('[DatabaseService] Initialization warning, switching to memory adapter fallback:', err?.message);
      this.adapter = new InMemoryAdapter();
      await this.adapter.initialize();
      this.transactions.setAdapter(this.adapter);
      this.auditLogs.setAdapter(this.adapter);
      this.dossiers.setAdapter(this.adapter);
      this.initialized = true;
      await seedDatabaseIfEmpty(this.transactions, this.auditLogs);
    }
  }

  public async switchAdapter(provider: 'postgres' | 'firestore' | 'in-memory'): Promise<void> {
    if (provider === 'postgres') {
      this.adapter = new PgAdapter();
    } else if (provider === 'firestore') {
      this.adapter = new FirestoreAdapter();
    } else {
      this.adapter = new InMemoryAdapter();
    }

    await this.adapter.initialize();
    this.transactions.setAdapter(this.adapter);
    this.auditLogs.setAdapter(this.adapter);
    this.dossiers.setAdapter(this.adapter);
    await seedDatabaseIfEmpty(this.transactions, this.auditLogs);
  }

  public async getHealth(): Promise<{
    status: 'connected' | 'fallback_memory' | 'uninitialized';
    adapter: string;
    isCloudActive: boolean;
    transactionsCount: number;
    auditLogsCount: number;
    dossiersCount: number;
    timestamp: string;
  }> {
    const txnCount = await this.transactions.count();
    const logCount = await this.auditLogs.count();
    const dossierCount = await this.dossiers.count();

    const isCloud = this.adapter instanceof FirestoreAdapter && this.adapter.isCloudConnected();

    return {
      status: this.initialized ? (isCloud ? 'connected' : 'fallback_memory') : 'uninitialized',
      adapter: this.adapter.name,
      isCloudActive: isCloud,
      transactionsCount: txnCount,
      auditLogsCount: logCount,
      dossiersCount: dossierCount,
      timestamp: new Date().toISOString(),
    };
  }

  public async close(): Promise<void> {
    // Flush any pending operations on shutdown
    this.initialized = false;
  }
}

// Export singleton database instance
export const db = DatabaseService.getInstance();

// Re-export all sub-modules
export * from './interfaces';
export * from './adapters';
export * from './repositories';
export * from './seed';
