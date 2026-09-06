import { Transaction, InvestigationDossier, AgentMetric } from "../../src/types";
import { runFraudDetectionAgent } from "./fraud_detector";
import { runBehavioralAnalysisAgent } from "./behavior_analyzer";
import { runSimilarCaseRetrievalAgent } from "./case_retriever";
import { runExplainabilityAgent } from "./explainability";
import { runComplianceAgent } from "./compliance_checker";
import { runRecommendationAgent } from "./recommender";
import { runReportGenerationAgent } from "./report_generator";

/**
 * Orchestrator Agent (Agent 1)
 * Coordinates the full multi-agent investigation pipeline:
 * Phase 1: Parallel ML scoring, Behavioral analysis, Vector case retrieval
 * Phase 2: Compliance screening & Gemini explainability
 * Phase 3: Action Recommendation & Final Report Generation
 */

export async function orchestrateInvestigation(transaction: Transaction): Promise<InvestigationDossier> {
  const pipelineStartTime = Date.now();
  const metrics: AgentMetric[] = [];

  // Phase 1: Parallel Core Feature Agents
  const [fraudRes, behaviorRes, vectorRes] = await Promise.all([
    runFraudDetectionAgent(transaction),
    runBehavioralAnalysisAgent(transaction),
    runSimilarCaseRetrievalAgent(transaction),
  ]);

  metrics.push(fraudRes.metric);
  metrics.push(behaviorRes.metric);
  metrics.push(vectorRes.metric);

  const effectiveRiskScore = fraudRes.prediction.riskScore;

  // Phase 2: Parallel Compliance & Explainability
  const [complianceRes, explainabilityRes] = await Promise.all([
    runComplianceAgent(transaction, effectiveRiskScore),
    runExplainabilityAgent(
      transaction,
      fraudRes.prediction.shapFactors,
      vectorRes.topMatches,
      effectiveRiskScore
    ),
  ]);

  metrics.push(complianceRes.metric);
  metrics.push(explainabilityRes.metric);

  // Phase 3: Recommendation Agent
  const recommenderRes = await runRecommendationAgent(
    transaction,
    effectiveRiskScore,
    complianceRes.compliance
  );
  metrics.push(recommenderRes.metric);

  // Phase 4: Report Generation Agent
  const reportRes = await runReportGenerationAgent(
    transaction,
    recommenderRes.recommendation,
    vectorRes.topMatches
  );
  metrics.push(reportRes.metric);

  const totalDuration = Date.now() - pipelineStartTime;

  // Orchestrator Metric (Agent 1 itself)
  const orchestratorMetric: AgentMetric = {
    id: 'orchestrator',
    name: 'Orchestrator Agent',
    role: 'Governs multi-agent execution pipeline, parallel dispatch, and cross-agent state synthesis.',
    status: 'completed',
    executionTimeMs: totalDuration,
    confidence: 0.99,
    summary: `Successfully executed 8 specialized agents across 4 parallel phases in ${totalDuration}ms with complete consensus convergence.`,
    details: {
      totalAgentsExecuted: 8,
      totalPipelineLatencyMs: totalDuration,
      consensusOutcome: recommenderRes.recommendation.action,
      preventedExposure: `$${recommenderRes.recommendation.estimatedLossPrevented.toFixed(2)}`,
    }
  };

  // Prepend Orchestrator metric
  const allMetrics = [orchestratorMetric, ...metrics];

  // Assemble comprehensive dossier
  const dossier: InvestigationDossier = {
    id: `INV-${transaction.id}-${Date.now().toString().slice(-4)}`,
    transaction: {
      ...transaction,
      riskScore: effectiveRiskScore,
      fraudProbability: fraudRes.prediction.fraudProbability,
      riskTier: fraudRes.prediction.riskTier,
      confidenceScore: fraudRes.prediction.confidenceScore,
      estimatedLossPrevented: recommenderRes.recommendation.estimatedLossPrevented,
    },
    startedAt: new Date(pipelineStartTime).toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed',
    orchestrator: {
      totalDurationMs: totalDuration,
      agentsRun: 8,
      pipelineStage: 'All 8 Agents Completed',
      metrics: allMetrics,
    },
    fraudDetection: {
      probability: fraudRes.prediction.fraudProbability,
      riskScore: effectiveRiskScore,
      riskTier: fraudRes.prediction.riskTier,
      confidence: fraudRes.prediction.confidenceScore,
      modelType: fraudRes.prediction.modelDetails.algorithm,
    },
    behavioralAnalysis: behaviorRes.profile,
    similarCases: {
      retrievedCount: vectorRes.topMatches.length,
      topMatches: vectorRes.topMatches,
      vectorIndex: 'qdrant_financial_fraud_v3_dense_128',
    },
    explainability: explainabilityRes.explainability,
    compliance: complianceRes.compliance,
    recommendation: recommenderRes.recommendation,
    report: reportRes.report,
    chatHistory: [
      {
        id: 'msg-init-01',
        sender: 'agent',
        agentName: 'RiskLens Copilot (Orchestrator)',
        message: `Investigation initialized for ${transaction.id} (${transaction.merchant}, $${transaction.amount.toFixed(2)}). All 8 AI agents have completed analysis. The calculated risk score is ${effectiveRiskScore}/100 with recommended action "${recommenderRes.recommendation.action}". How would you like to proceed?`,
        timestamp: new Date().toISOString(),
      }
    ],
  };

  return dossier;
}
