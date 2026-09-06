import { AuditLog } from '../../../src/types/user';
import { IAuditLogRepository, NewAuditLogInput } from '../interfaces/IAuditLogRepository';
import { IDataStoreAdapter } from '../interfaces/IDataStoreAdapter';

export class AuditLogRepository implements IAuditLogRepository {
  private adapter: IDataStoreAdapter;

  constructor(adapter: IDataStoreAdapter) {
    this.adapter = adapter;
  }

  public setAdapter(adapter: IDataStoreAdapter): void {
    this.adapter = adapter;
  }

  public async getAll(limitCount?: number): Promise<AuditLog[]> {
    return this.adapter.getAllAuditLogs(limitCount);
  }

  public async getById(id: string): Promise<AuditLog | null> {
    if (!id) return null;
    return this.adapter.getAuditLogById(id);
  }

  public async getByTargetId(targetId: string, limitCount?: number): Promise<AuditLog[]> {
    if (!targetId) return [];
    return this.adapter.getAuditLogsByTargetId(targetId, limitCount);
  }

  public async log(entry: NewAuditLogInput): Promise<AuditLog> {
    if (!entry.action || !entry.targetId) {
      throw new Error('Audit log must specify an action and a targetId');
    }
    return this.adapter.saveAuditLog(entry);
  }

  public async logBatch(entries: NewAuditLogInput[]): Promise<AuditLog[]> {
    if (!Array.isArray(entries) || entries.length === 0) {
      return [];
    }
    return this.adapter.saveAuditLogBatch(entries);
  }

  public async count(): Promise<number> {
    return this.adapter.countAuditLogs();
  }

  public async clearAll(): Promise<void> {
    await this.adapter.clearAuditLogs();
  }

  public async seedIfEmpty(initialLogs: AuditLog[]): Promise<number> {
    const existingCount = await this.adapter.countAuditLogs();
    if (existingCount === 0 && initialLogs.length > 0) {
      await this.adapter.saveAuditLogBatch(initialLogs);
      return initialLogs.length;
    }
    return existingCount;
  }
}
