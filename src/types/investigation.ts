import { Transaction } from './transaction';
import { AgentMetric, ShapFactor, BehavioralProfile, ComplianceCheckResult, ActionRecommendation } from './agent';
import { HistoricalFraudCase } from './vector';

export interface ExplainabilityData {
  plainEnglishSummary: string;
  executiveRationale: string;
  keyRiskDrivers: string[];
  mitigatingFactors: string[];
  shapValues: ShapFactor[];
  analystTakeaway: string;
}

export interface InvestigationReport {
  executiveSummary: string;
  analystDossier: string;
  sarNarrative?: string;
  keyEvidence: string[];
  estimatedLossPrevented: number;
  generatedAt: string;
  authorAgent: string;
}

export interface InvestigationDossier {
  id: string;
  transaction: Transaction;
  startedAt: string;
  completedAt?: string;
  status: 'in_progress' | 'completed' | 'failed';
  
  // 8 Agents' Output
  orchestrator: {
    totalDurationMs: number;
    agentsRun: number;
    pipelineStage: string;
    metrics: AgentMetric[];
  };
  
  fraudDetection: {
    probability: number;
    riskScore: number;
    riskTier: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    confidence: number;
    modelType: string;
  };
  
  behavioralAnalysis: BehavioralProfile;
  
  similarCases: {
    retrievedCount: number;
    topMatches: HistoricalFraudCase[];
    vectorIndex: string;
  };
  
  explainability: ExplainabilityData;
  
  compliance: ComplianceCheckResult;
  
  recommendation: ActionRecommendation;
  
  report: InvestigationReport;
  
  // Interactive Chat Thread with AI Investigator
  chatHistory: Array<{
    id: string;
    sender: 'user' | 'agent';
    agentName?: string;
    message: string;
    timestamp: string;
  }>;
}
