export type AgentId = 
  | 'orchestrator'
  | 'fraud_detection'
  | 'behavioral_analysis'
  | 'similar_case_retrieval'
  | 'explainability'
  | 'compliance'
  | 'recommendation'
  | 'report_generation';

export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'skipped';

export interface AgentMetric {
  id: AgentId;
  name: string;
  role: string;
  status: AgentStatus;
  executionTimeMs: number;
  confidence: number;
  summary: string;
  details?: Record<string, any>;
  error?: string;
}

export interface ShapFactor {
  feature: string;
  displayName: string;
  category: 'Behavior' | 'Device' | 'Location' | 'Transaction' | 'Network';
  value: string | number;
  impactScore: number; // -100 to +100 (positive pushes towards fraud, negative towards legitimate)
  isSuspicious: boolean;
  explanation: string;
}

export interface BehavioralProfile {
  customerBaselineAvgAmount: number;
  customerBaselineDailyFrequency: number;
  amountDeviationMultiplier: number;
  isNewMerchantForCustomer: boolean;
  isOffHoursTransaction: boolean;
  velocityLast1Hour: number; // number of transactions in last 60 mins
  velocityLast24Hours: number;
  geoVelocityKmPerHour: number; // e.g. impossible travel speed
  behaviorRiskScore: number; // 0-100
  anomaliesDetected: string[];
}

export interface ComplianceCheckResult {
  passed: boolean;
  amlTriggered: boolean;
  sanctionsMatch: boolean;
  pepMatch: boolean; // Politically Exposed Person
  sarRequired: boolean; // Suspicious Activity Report (FinCEN / Reg)
  regECompliant: boolean;
  psd3ScaRequired: boolean; // Strong Customer Authentication
  triggeredRules: string[];
  notes: string;
}

export interface ActionRecommendation {
  action: 'APPROVE' | 'HOLD' | 'ESCALATE' | 'REJECT';
  urgency: 'IMMEDIATE' | 'HIGH' | 'STANDARD' | 'LOW';
  confidence: number; // 0-100
  reasonCode: string;
  recommendedPlaybook: string;
  stepUpAuthType?: 'SMS_OTP' | 'BIOMETRIC_PASSKEY' | 'HARDWARE_TOKEN' | 'MANUAL_VOICE_VERIFICATION';
  suggestedNextSteps: string[];
  estimatedLossPrevented: number;
}
