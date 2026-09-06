/**
 * RiskLens AI - Copilot Domain Service
 * 
 * Coordinates:
 * - Real-time conversational AI assistance via Gemini API
 * - Contextual memory injection and transaction grounding
 * - Copilot query metrics tracking
 */

import { Transaction, ChatMessage } from '../../src/types';
import { chatWithInvestigatorCopilot } from '../gemini';
import { metrics } from '../metrics';
import { verifyTenantOwnership } from '../middleware/tenant.middleware';
import { ForbiddenError } from '../errors';

export interface CopilotChatResult {
  success: boolean;
  reply: string;
  timestamp: string;
}

export class CopilotService {
  private static instance: CopilotService | null = null;

  public static getInstance(): CopilotService {
    if (!CopilotService.instance) {
      CopilotService.instance = new CopilotService();
    }
    return CopilotService.instance;
  }

  /**
   * Processes a conversation turn with the AI Investigator Copilot
   */
  public async chat(
    transaction: Transaction,
    chatHistory: ChatMessage[],
    message: string,
    userTenantId?: string,
    investigationContext?: any
  ): Promise<CopilotChatResult> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[RiskLens CopilotService] Tenant ownership check:', {
        txnTenantId: transaction.tenantId,
        userTenantId,
        txnId: transaction.id,
      });
    }
    if (userTenantId && !verifyTenantOwnership(transaction.tenantId, userTenantId)) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[RiskLens CopilotService] FORBIDDEN — tenant mismatch:', {
          txnTenantId: transaction.tenantId,
          userTenantId,
        });
      }
      throw new ForbiddenError(`Forbidden: Access denied to transaction outside tenant scope.`);
    }

    const reply = await chatWithInvestigatorCopilot(transaction, chatHistory || [], message, investigationContext);
    metrics.recordCopilotQuery();

    return {
      success: true,
      reply,
      timestamp: new Date().toISOString(),
    };
  }
}

export const copilotService = CopilotService.getInstance();
