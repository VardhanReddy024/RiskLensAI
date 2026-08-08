import { INITIAL_TRANSACTIONS } from '../../src/data/sample_datasets';
import { AuditLog } from '../../src/types/user';
import { ITransactionRepository } from './interfaces/ITransactionRepository';
import { IAuditLogRepository } from './interfaces/IAuditLogRepository';

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'LOG-1001',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    actorEmail: 'lead.investigator@risklens.ai',
    actorRole: 'senior_investigator',
    action: 'REJECT_TRANSACTION',
    targetId: 'TXN-98425-FRAUD',
    details: 'Instant settlement blocked due to Tor exit node and FinCEN SAR threshold violation.',
    status: 'SUCCESS',
  },
  {
    id: 'LOG-1002',
    timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
    actorEmail: 'compliance.officer@risklens.ai',
    actorRole: 'compliance_officer',
    action: 'GENERATE_SAR',
    targetId: 'TXN-98425-FRAUD',
    details: 'SAR draft Form-SAR-01 queued for regulatory submission.',
    status: 'SUCCESS',
  },
];

export async function seedDatabaseIfEmpty(
  transactionRepo: ITransactionRepository,
  auditLogRepo: IAuditLogRepository
): Promise<{ seededTransactions: number; seededLogs: number }> {
  try {
    const seededTxns = await transactionRepo.seedIfEmpty(INITIAL_TRANSACTIONS);
    const seededLogs = await auditLogRepo.seedIfEmpty(INITIAL_AUDIT_LOGS);
    return {
      seededTransactions: seededTxns,
      seededLogs,
    };
  } catch (err: any) {
    console.warn('[RiskLens DB Seed] Seed warning or skipped:', err?.message);
    return { seededTransactions: 0, seededLogs: 0 };
  }
}
