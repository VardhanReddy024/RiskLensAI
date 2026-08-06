export type UserRole = 'senior_fraud_analyst';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  roleId: UserRole;
  avatarUrl: string;
  department: string;
  connection: 'Connected via Google AI Studio' | 'Connected via Firebase Authentication';
  status: 'Online';
  permissions: {
    canApprove: boolean;
    canReject: boolean;
    canModifyRules: boolean;
    canExportReports: boolean;
    canTriggerSAR: boolean;
    canInvestigate: boolean;
    canLiveMonitor: boolean;
    canIngestData: boolean;
    canExecutePlaybooks: boolean;
  };
  lastLogin: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorEmail: string;
  actorRole: string;
  action: 'APPROVE_TRANSACTION' | 'HOLD_TRANSACTION' | 'REJECT_TRANSACTION' | 'ESCALATE_TRANSACTION' | 'GENERATE_SAR' | 'MODIFY_THRESHOLD' | 'BULK_INGEST';
  targetId: string;
  details: string;
  status: 'SUCCESS' | 'WARNING' | 'FAILED';
}

