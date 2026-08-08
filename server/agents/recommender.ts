import { Transaction, AgentMetric, ActionRecommendation, ComplianceCheckResult } from "../../src/types";

export interface RecommenderAgentResult {
  metric: AgentMetric;
  recommendation: ActionRecommendation;
}

export async function runRecommendationAgent(
  transaction: Transaction,
  riskScore: number,
  compliance: ComplianceCheckResult
): Promise<RecommenderAgentResult> {
  const startTime = Date.now();

  let action: 'APPROVE' | 'HOLD' | 'ESCALATE' | 'REJECT';
  let urgency: 'IMMEDIATE' | 'HIGH' | 'STANDARD' | 'LOW';
  let reasonCode: string;
  let recommendedPlaybook: string;
  let stepUpAuthType: ActionRecommendation['stepUpAuthType'];
  const suggestedNextSteps: string[] = [];

  if (riskScore >= 80 || compliance.sanctionsMatch) {
    action = 'REJECT';
    urgency = 'IMMEDIATE';
    reasonCode = compliance.sanctionsMatch ? 'RC-SANCTION-BLOCK' : 'RC-CRITICAL-FRAUD-RISK';
    recommendedPlaybook = 'Playbook #8: Instant Settlement Block & Account Quarantine';
    suggestedNextSteps.push(
      'Instantly decline transaction authorization at payment gateway rail.',
      'Place temporary security hold on customer payment credentials and active sessions.',
      'Notify cardholder via verified push notification of suspected unauthorized access.',
      'Submit preliminary SAR dossier to Financial Intelligence Unit.'
    );
  } else if (riskScore >= 60) {
    action = 'HOLD';
    urgency = 'HIGH';
    reasonCode = 'RC-ELEVATED-ANOMALY-HOLD';
    recommendedPlaybook = 'Playbook #3: Step-Up Out-of-Band Multi-Factor Challenge';
    stepUpAuthType = 'BIOMETRIC_PASSKEY';
    suggestedNextSteps.push(
      'Place transaction on pending 15-minute escrow hold.',
      'Trigger FIDO2 WebAuthn or Push Biometric Challenge to customer registered mobile device.',
      'If step-up challenge completes within window, automatically release authorization.',
      'If challenge fails or expires, transition state to REJECT.'
    );
  } else if (riskScore >= 35) {
    action = 'ESCALATE';
    urgency = 'STANDARD';
    reasonCode = 'RC-MANUAL-ANALYST-REVIEW';
    recommendedPlaybook = 'Playbook #2: Tier-2 Fraud Analyst Manual Review';
    stepUpAuthType = 'SMS_OTP';
    suggestedNextSteps.push(
      'Assign case ticket to active queue for Tier-2 fraud analyst.',
      'Verify historical merchant relationship and customer tenure.',
      'Dispatch SMS one-time verification passcode as soft check.'
    );
  } else {
    action = 'APPROVE';
    urgency = 'LOW';
    reasonCode = 'RC-LOW-RISK-AUTHORIZED';
    recommendedPlaybook = 'Playbook #1: Straight-Through Automated Processing';
    suggestedNextSteps.push(
      'Approve transaction authorization immediately.',
      'Update customer baseline feature weights with clean transaction record.'
    );
  }

  const estimatedLossPrevented = (action === 'REJECT' || action === 'HOLD' || action === 'ESCALATE')
    ? (transaction.amount || 0)
    : 0;

  const recommendation: ActionRecommendation = {
    action,
    urgency,
    confidence: Math.round(85 + (Math.abs(riskScore - 50) / 50) * 14),
    reasonCode,
    recommendedPlaybook,
    stepUpAuthType,
    suggestedNextSteps,
    estimatedLossPrevented,
  };

  const duration = Date.now() - startTime;

  const metric: AgentMetric = {
    id: 'recommendation',
    name: 'Recommendation Agent',
    role: 'Formulates decision action (Approve/Hold/Escalate/Reject), operational playbook, and step-up auth protocol.',
    status: 'completed',
    executionTimeMs: Math.max(12, duration),
    confidence: recommendation.confidence / 100,
    summary: `Recommended action: ${action} (${urgency} Urgency). Selected: "${recommendedPlaybook}". Estimated financial loss prevented: $${estimatedLossPrevented.toFixed(2)}.`,
    details: {
      action,
      urgency,
      reasonCode,
      estimatedLossPrevented: `$${estimatedLossPrevented.toFixed(2)}`,
    }
  };

  return {
    metric,
    recommendation,
  };
}
