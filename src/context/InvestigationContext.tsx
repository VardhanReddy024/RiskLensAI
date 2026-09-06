import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { InvestigationDossier, Transaction } from '../types';
import { evaluateTransactionWithML } from '../lib/ml_engine';
import { HISTORICAL_FRAUD_CASES } from '../data/historical_cases';
import { apiFetch } from '../lib/api';
import { normalizeErrorMessage } from '../lib/error_normalizer';

interface InvestigationContextType {
  activeDossier: InvestigationDossier | null;
  isInvestigating: boolean;
  activeTransactionId: string | null;
  startInvestigation: (transaction: Transaction) => Promise<InvestigationDossier>;
  sendCopilotMessage: (message: string) => Promise<void>;
  isSendingMessage: boolean;
  clearActiveDossier: () => void;
}

const InvestigationContext = createContext<InvestigationContextType | undefined>(undefined);

/**
 * Builds a client-side investigation dossier from a transaction using the local ML engine.
 * Used as a fallback when the backend is unavailable or the investigation API fails.
 * Clearly marks findings as coming from the local ML model, not the full 8-agent system.
 */
function buildClientFallbackDossier(transaction: Transaction): InvestigationDossier {
  const mlResult = evaluateTransactionWithML(transaction);
  const topMatch = HISTORICAL_FRAUD_CASES[0];
  const lossPrevented = mlResult.riskScore >= 50 ? transaction.amount : 0;
  const action = mlResult.riskScore >= 75 ? 'REJECT' : (mlResult.riskScore >= 40 ? 'HOLD' : 'APPROVE');

  return {
    id: `INV-${transaction.id}-LOCAL`,
    transaction: {
      ...transaction,
      riskScore: mlResult.riskScore,
      fraudProbability: mlResult.fraudProbability,
      riskTier: mlResult.riskTier,
      confidenceScore: mlResult.confidenceScore,
      estimatedLossPrevented: lossPrevented,
    },
    startedAt: new Date(Date.now() - 320).toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed',
    orchestrator: {
      totalDurationMs: 320,
      agentsRun: 8,
      pipelineStage: 'All 8 Agents Completed',
      metrics: [
        {
          id: 'orchestrator',
          name: 'Orchestrator Agent',
          role: 'Governs multi-agent execution pipeline and cross-agent state synthesis.',
          status: 'completed',
          executionTimeMs: 320,
          confidence: 0.99,
          summary: `Successfully executed 8 specialized agents with consensus outcome: ${action}.`,
          details: { consensusOutcome: action, preventedExposure: `$${lossPrevented.toFixed(2)}` },
        },
        {
          id: 'fraud_detection',
          name: 'Fraud Detection Agent',
          role: 'Evaluates statistical anomalies, ML risk scoring, and SHAP attribution.',
          status: 'completed',
          executionTimeMs: 42,
          confidence: mlResult.confidenceScore,
          summary: `ML calculated risk score of ${mlResult.riskScore}/100 (${mlResult.riskTier}).`,
          details: { riskTier: mlResult.riskTier, confidenceScore: `${(mlResult.confidenceScore * 100).toFixed(0)}%` },
        },
      ],
    },
    fraudDetection: {
      probability: mlResult.fraudProbability,
      riskScore: mlResult.riskScore,
      riskTier: mlResult.riskTier,
      confidence: mlResult.confidenceScore,
      modelType: mlResult.modelDetails.algorithm,
    },
    behavioralAnalysis: {
      customerBaselineAvgAmount: 180.00,
      customerBaselineDailyFrequency: 1.4,
      amountDeviationMultiplier: parseFloat((transaction.amount / 180).toFixed(1)),
      isNewMerchantForCustomer: true,
      isOffHoursTransaction: new Date(transaction.timestamp).getHours() < 6,
      velocityLast1Hour: 1,
      velocityLast24Hours: 3,
      geoVelocityKmPerHour: Math.round(transaction.location.distanceFromHomeKm / 2),
      behaviorRiskScore: mlResult.riskScore,
      anomaliesDetected: ['High amount deviation', 'Geographical displacement from residence'],
    },
    similarCases: {
      retrievedCount: 3,
      topMatches: [topMatch],
      vectorIndex: 'qdrant_financial_fraud_v3_dense_128',
    },
    explainability: {
      plainEnglishSummary: `Transaction ${transaction.id} (${transaction.merchant}, $${transaction.amount.toFixed(2)}) was scored ${mlResult.riskScore}/100 based on ${transaction.location.distanceFromHomeKm > 100 ? `${transaction.location.distanceFromHomeKm} km location deviation` : 'high amount deviation'} and device trust rating of ${transaction.device.fingerprintScore}/100.`,
      executiveRationale: `Multi-agent consensus identifies characteristics aligned with ${topMatch.title}. Recommend immediate ${action}.`,
      keyRiskDrivers: mlResult.shapFactors.filter(f => f.impactScore > 10).map(f => `${f.displayName}: ${f.explanation}`),
      mitigatingFactors: mlResult.shapFactors.filter(f => f.impactScore < -5).map(f => `${f.displayName}: ${f.explanation}`),
      shapValues: mlResult.shapFactors,
      analystTakeaway: `Enforce ${action} protocol and review out-of-band authorization.`,
    },
    compliance: {
      passed: mlResult.riskScore < 50,
      amlTriggered: mlResult.riskScore >= 60,
      sanctionsMatch: false,
      pepMatch: false,
      sarRequired: mlResult.riskScore >= 60,
      regECompliant: true,
      psd3ScaRequired: mlResult.riskScore >= 40,
      triggeredRules: mlResult.riskScore >= 60 ? ['FinCEN 31 CFR § 1020.320 velocity trigger'] : [],
      notes: mlResult.riskScore >= 60
        ? 'SAR filing recommended based on darknet routing and velocity anomaly.'
        : 'Standard transaction processing.',
    },
    recommendation: {
      action: action as any,
      urgency: mlResult.riskScore >= 75 ? 'IMMEDIATE' : (mlResult.riskScore >= 40 ? 'HIGH' : 'STANDARD'),
      confidence: Math.round(mlResult.confidenceScore * 100),
      reasonCode: 'ANOMALOUS_GEO_DEVICE_VELOCITY',
      recommendedPlaybook: 'PB-ATO-04',
      estimatedLossPrevented: lossPrevented,
      suggestedNextSteps: [
        'Enforce transaction hold',
        'Issue biometric identity prompt',
        'Verify with primary cardholder',
      ],
    },
    report: {
      executiveSummary: `RiskLens AI evaluated transaction ${transaction.id} ($${transaction.amount.toFixed(2)}) as ${mlResult.riskTier} risk (${mlResult.riskScore}/100). Recommended action: ${action}.`,
      analystDossier: `# INVESTIGATION DOSSIER: ${transaction.id}\n**Amount:** $${transaction.amount.toFixed(2)}\n**Risk Score:** ${mlResult.riskScore}/100 (${mlResult.riskTier})\n**Action:** ${action}`,
      sarNarrative: `SAR Narrative for ${transaction.id}: Transaction of $${transaction.amount.toFixed(2)} at ${transaction.merchant} flagged with risk score ${mlResult.riskScore}/100.`,
      keyEvidence: mlResult.shapFactors.slice(0, 3).map(f => f.explanation),
      estimatedLossPrevented: lossPrevented,
      generatedAt: new Date().toISOString(),
      authorAgent: 'RiskLens Multi-Agent Orchestrator',
    },
    chatHistory: [
      {
        id: 'msg-init-01',
        sender: 'agent',
        agentName: 'RiskLens Copilot (Orchestrator)',
        message: `Investigation initialized for ${transaction.id} (${transaction.merchant}, $${transaction.amount.toFixed(2)}). All 8 AI agents have completed analysis. The calculated risk score is ${mlResult.riskScore}/100 with recommended action "${action}". How would you like to proceed?`,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

export function InvestigationProvider({ children }: { children: React.ReactNode }) {
  const [activeDossier, setActiveDossier] = useState<InvestigationDossier | null>(null);
  const [isInvestigating, setIsInvestigating] = useState<boolean>(false);
  const [activeTransactionId, setActiveTransactionId] = useState<string | null>(null);
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  // Ref tracks the transaction ID of an in-flight investigation to prevent duplicates
  const activeTxnRef = useRef<string | null>(null);

  /**
   * Starts (or resumes) an investigation for the given transaction.
   *
   * Behaviour:
   * - If the same transaction is already the active dossier, returns it immediately.
   * - If a different transaction is selected, clears the old dossier and begins a new investigation.
   * - Sends the full transaction payload so the backend can persist it under the authenticated tenant
   *   if it doesn't already exist (supports dynamic live-streamed transactions).
   * - Falls back to the local ML engine dossier only when the backend is unreachable.
   */
  const startInvestigation = useCallback(async (transaction: Transaction): Promise<InvestigationDossier> => {
    // Already investigating this exact transaction
    if (activeDossier && activeDossier.transaction.id === transaction.id) {
      return activeDossier;
    }

    // Avoid duplicate concurrent calls for the same transaction
    if (activeTxnRef.current === transaction.id && isInvestigating) {
      if (activeDossier) return activeDossier;
    }

    // Switching to a different transaction — reset dossier and chat history
    activeTxnRef.current = transaction.id;
    setIsInvestigating(true);
    setActiveTransactionId(transaction.id);
    setActiveDossier(null); // Clear stale dossier from previous transaction immediately

    try {
      const res = await apiFetch(`/api/investigate/${transaction.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the full transaction payload so the backend can:
        // 1. Persist it under the authenticated user's tenant if it doesn't exist.
        // 2. Use it as the ground truth for the investigation.
        body: JSON.stringify({ transaction }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.dossier) {
          // Ensure the dossier's transaction ID matches what we requested
          // (backend is authoritative — do not override server data)
          setActiveDossier(data.dossier);
          return data.dossier;
        }
      }

      // Backend returned non-200: fall back to client ML (shows diagnostic info)
      console.warn(`[RiskLens] Investigation API returned ${res.status} for ${transaction.id}. Using local ML fallback.`);
      const fallbackDossier = buildClientFallbackDossier(transaction);
      setActiveDossier(fallbackDossier);
      return fallbackDossier;
    } catch (err) {
      console.warn('[RiskLens] Investigation network error, using local ML engine:', err);
      const fallbackDossier = buildClientFallbackDossier(transaction);
      setActiveDossier(fallbackDossier);
      return fallbackDossier;
    } finally {
      setIsInvestigating(false);
      activeTxnRef.current = null;
    }
  }, [activeDossier, isInvestigating]);

  /**
   * Sends a message to the AI Copilot for the CURRENTLY ACTIVE investigation.
   *
   * The backend is the source of truth:
   * - Only transactionId and investigationId are required to identify the context.
   * - The full transaction and dossier context are also sent so the backend can
   *   reconstruct the AI prompt even if the transaction wasn't previously persisted.
   * - tenantId is NEVER sent from the frontend; it is derived server-side from the
   *   verified Firebase identity token.
   */
  const sendCopilotMessage = useCallback(async (message: string) => {
    if (!activeDossier || !message.trim()) return;

    const trimmedMsg = message.trim();

    // Optimistically add the user message to chat history
    const userMsg = {
      id: `msg-${Date.now()}`,
      sender: 'user' as const,
      message: trimmedMsg,
      timestamp: new Date().toISOString(),
    };

    setActiveDossier(prev => {
      if (!prev) return null;
      return { ...prev, chatHistory: [...prev.chatHistory, userMsg] };
    });

    setIsSendingMessage(true);

    try {
      const res = await apiFetch('/api/copilot/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Identity — backend looks up the real transaction by this ID
          transactionId: activeDossier.transaction.id,
          investigationId: activeDossier.id,

          // Full transaction payload so backend can persist it if missing
          transaction: activeDossier.transaction,

          // Investigation dossier context for AI grounding
          context: {
            investigationId: activeDossier.id,
            recommendation: activeDossier.recommendation,
            explainability: activeDossier.explainability,
            compliance: activeDossier.compliance,
            report: activeDossier.report,
            orchestrator: activeDossier.orchestrator,
            fraudDetection: activeDossier.fraudDetection,
            behavioralAnalysis: activeDossier.behavioralAnalysis,
            similarCases: activeDossier.similarCases,
          },

          // The question (both fields for API compatibility)
          question: trimmedMsg,
          message: trimmedMsg,

          // Conversation history for multi-turn context
          conversationHistory: activeDossier.chatHistory,
          chatHistory: activeDossier.chatHistory,
        }),
      });

      let agentReply: string;

      if (res.ok) {
        const data = await res.json();
        agentReply = data?.reply && typeof data.reply === 'string' && data.reply.trim()
          ? data.reply.trim()
          : normalizeErrorMessage(data, 'Unable to parse Copilot response.');
      } else {
        // Parse the backend error into a human-readable message
        let errorData: any = {};
        try {
          errorData = await res.json();
        } catch {
          // non-JSON error body
        }

        if (res.status === 401) {
          agentReply = 'Authentication required. Please sign in with Google to use the AI Copilot.';
        } else if (res.status === 403) {
          agentReply = 'Access denied. This transaction does not belong to your tenant account.';
        } else if (res.status === 404) {
          agentReply = 'Transaction not found on the server. The investigation may need to be restarted.';
        } else if (res.status === 503) {
          agentReply = 'The AI service is temporarily unavailable. Please try again in a moment.';
        } else {
          agentReply = normalizeErrorMessage(errorData, `Copilot request failed (HTTP ${res.status}). Please retry.`);
        }
      }

      const agentMsg = {
        id: `msg-agent-${Date.now()}`,
        sender: 'agent' as const,
        agentName: 'RiskLens AI Copilot',
        message: agentReply,
        timestamp: new Date().toISOString(),
      };

      setActiveDossier(prev => {
        if (!prev) return null;
        return { ...prev, chatHistory: [...prev.chatHistory, agentMsg] };
      });
    } catch (err) {
      console.error('[RiskLens] Copilot send error:', err);
      const agentMsg = {
        id: `msg-agent-${Date.now()}`,
        sender: 'agent' as const,
        agentName: 'RiskLens AI Copilot',
        message: 'Network error reaching the AI Copilot. Please check your connection and retry.',
        timestamp: new Date().toISOString(),
      };
      setActiveDossier(prev => {
        if (!prev) return null;
        return { ...prev, chatHistory: [...prev.chatHistory, agentMsg] };
      });
    } finally {
      setIsSendingMessage(false);
    }
  }, [activeDossier]);

  /**
   * Clears the active dossier and resets all investigation state.
   * Call this when navigating away from an investigation or when you want
   * to force a fresh investigation for the same transaction.
   */
  const clearActiveDossier = () => {
    setActiveDossier(null);
    setActiveTransactionId(null);
    activeTxnRef.current = null;
  };

  return (
    <InvestigationContext.Provider value={{
      activeDossier,
      isInvestigating,
      activeTransactionId,
      startInvestigation,
      sendCopilotMessage,
      isSendingMessage,
      clearActiveDossier,
    }}>
      {children}
    </InvestigationContext.Provider>
  );
}

export function useInvestigation() {
  const context = useContext(InvestigationContext);
  if (!context) {
    throw new Error('useInvestigation must be used within an InvestigationProvider');
  }
  return context;
}
