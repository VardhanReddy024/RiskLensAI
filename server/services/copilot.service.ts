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
  public async chat(transaction: Transaction, chatHistory: ChatMessage[], message: string): Promise<CopilotChatResult> {
    const reply = await chatWithInvestigatorCopilot(transaction, chatHistory || [], message);
    metrics.recordCopilotQuery();

    return {
      success: true,
      reply,
      timestamp: new Date().toISOString(),
    };
  }
}

export const copilotService = CopilotService.getInstance();
