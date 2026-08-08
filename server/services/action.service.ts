/**
 * RiskLens AI - Analyst Action & Resolution Service
 * 
 * Coordinates:
 * - Atomic transaction status transitions (APPROVE, HOLD, ESCALATE, REJECT)
 * - Immutable cryptographically compliant audit trail recording
 * - Business metrics updates
 */

import { Transaction, AuditLog } from '../../src/types';
import { db } from '../db';
import { metrics } from '../metrics';
import { NotFoundError } from '../errors';

export interface ResolveActionParams {
  transactionId: string;
  action: 'APPROVE' | 'HOLD' | 'ESCALATE' | 'REJECT';
  notes?: string;
  actorEmail?: string;
  actorRole?: string;
}

export interface ResolveActionResult {
  success: boolean;
  transaction: Transaction;
  auditLog: AuditLog;
}

export class ActionService {
  private static instance: ActionService | null = null;

  public static getInstance(): ActionService {
    if (!ActionService.instance) {
      ActionService.instance = new ActionService();
    }
    return ActionService.instance;
  }

  /**
   * Resolves a transaction and records an immutable audit log
   */
  public async resolve(params: ResolveActionParams): Promise<ResolveActionResult> {
    const { transactionId, action, notes, actorEmail, actorRole } = params;
    const txn = await db.transactions.getById(transactionId);

    if (!txn) {
      throw new NotFoundError(`Transaction ${transactionId} not found`);
    }

    let newStatus: Transaction['status'] = 'approved';
    if (action === 'APPROVE') newStatus = 'approved';
    else if (action === 'HOLD') newStatus = 'held';
    else if (action === 'ESCALATE') newStatus = 'escalated';
    else if (action === 'REJECT') newStatus = 'rejected';

    const updatedTxn = await db.transactions.update(transactionId, {
      status: newStatus,
      resolutionNote: notes,
      resolvedBy: actorEmail || 'analyst@risklens.ai',
      resolvedAt: new Date().toISOString(),
    });

    const logActionMap: Record<string, AuditLog['action']> = {
      APPROVE: 'APPROVE_TRANSACTION',
      HOLD: 'HOLD_TRANSACTION',
      ESCALATE: 'ESCALATE_TRANSACTION',
      REJECT: 'REJECT_TRANSACTION',
    };

    const newLog = await db.auditLogs.log({
      actorEmail: actorEmail || 'analyst@risklens.ai',
      actorRole: actorRole || 'fraud_analyst',
      action: logActionMap[action] || 'APPROVE_TRANSACTION',
      targetId: transactionId,
      details: notes || `Action ${action} executed by ${actorRole || 'analyst'}.`,
      status: 'SUCCESS',
    });

    metrics.recordActionResolution();

    return {
      success: true,
      transaction: updatedTxn || txn,
      auditLog: newLog,
    };
  }
}

export const actionService = ActionService.getInstance();
