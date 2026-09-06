/**
 * RiskLens AI - Copilot Controller
 */

import { Request, Response, NextFunction } from 'express';
import { copilotService } from '../services/copilot.service';
import { db } from '../db';
import { NotFoundError } from '../errors';

const isDev = process.env.NODE_ENV !== 'production';

export class CopilotController {
  /**
   * POST /api/copilot/chat
   */
  public static async chat(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId, chatHistory, conversationHistory, message, question, context, transaction } = req.body || {};
      const userQuestion = (question !== undefined ? question : message || '').trim();
      const history = conversationHistory || chatHistory || [];
      const effectiveTxnId = transactionId || transaction?.id;

      if (isDev) {
        console.log('[RiskLens Copilot] Request received:', {
          effectiveTxnId,
          userTenantId: req.tenantId,
          userEmail: req.user?.email,
          hasTransactionPayload: !!transaction,
          hasContext: !!context,
          question: userQuestion?.slice(0, 80),
        });
      }

      let txn = effectiveTxnId ? await db.transactions.getById(effectiveTxnId) : null;

      if (isDev) {
        console.log('[RiskLens Copilot] DB lookup result:', {
          found: !!txn,
          txnTenantId: txn?.tenantId,
          txnId: txn?.id,
        });
      }

      // If transaction is not found in DB but was provided in payload (e.g., dynamic live stream),
      // persist it immediately under the authenticated user's tenant.
      if (!txn && transaction && (transaction.id === effectiveTxnId || !effectiveTxnId)) {
        if (isDev) {
          console.log('[RiskLens Copilot] Persisting new transaction under tenant:', req.tenantId);
        }
        txn = await db.transactions.save({
          ...transaction,
          tenantId: req.tenantId || transaction.tenantId || 'default_tenant',
        });
      }

      if (!txn) {
        throw new NotFoundError(`Transaction not found for ID: ${effectiveTxnId || 'undefined'}`);
      }

      // Re-adopt platform sample / unassigned transactions under the authenticated tenant.
      // Any transaction with no tenant or default_tenant is a platform seed record; a real
      // authenticated user who chose to investigate it becomes its tenant owner.
      if (
        req.tenantId &&
        req.tenantId !== 'default_tenant' &&
        (!txn.tenantId || txn.tenantId === 'default_tenant')
      ) {
        if (isDev) {
          console.log(
            `[RiskLens Copilot] Adopting transaction ${txn.id} from ${txn.tenantId || 'undefined'} -> ${req.tenantId}`,
          );
        }
        txn = await db.transactions.save({ ...txn, tenantId: req.tenantId });
      }

      if (isDev) {
        console.log('[RiskLens Copilot] Tenant check:', {
          txnTenantId: txn.tenantId,
          userTenantId: req.tenantId,
        });
      }

      // If context was not explicitly supplied, attempt to retrieve cached dossier from DB
      let investigationContext = context;
      if (!investigationContext && txn.id) {
        const cachedDossier = await db.dossiers.get(txn.id);
        if (cachedDossier) {
          if (isDev) {
            console.log('[RiskLens Copilot] Found cached dossier for:', txn.id);
          }
          investigationContext = cachedDossier;
        }
      }

      const result = await copilotService.chat(txn, history, userQuestion, req.tenantId, investigationContext);

      if (isDev) {
        console.log('[RiskLens Copilot] Success — reply length:', result.reply?.length);
      }

      res.status(200).json(result);
    } catch (err) {
      if (isDev) {
        console.error('[RiskLens Copilot] Error:', err);
      }
      next(err);
    }
  }
}
