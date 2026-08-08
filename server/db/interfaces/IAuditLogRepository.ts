import { AuditLog } from '../../../src/types/user';

export type NewAuditLogInput = Omit<AuditLog, 'id' | 'timestamp'> & {
  id?: string;
  timestamp?: string;
};

export interface IAuditLogRepository {
  getAll(limitCount?: number): Promise<AuditLog[]>;
  getById(id: string): Promise<AuditLog | null>;
  getByTargetId(targetId: string, limitCount?: number): Promise<AuditLog[]>;
  log(entry: NewAuditLogInput): Promise<AuditLog>;
  logBatch(entries: NewAuditLogInput[]): Promise<AuditLog[]>;
  count(): Promise<number>;
  seedIfEmpty(initialLogs: AuditLog[]): Promise<number>;
  clearAll(): Promise<void>;
}
