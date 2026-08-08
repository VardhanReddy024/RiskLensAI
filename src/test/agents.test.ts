import { describe, it, expect } from 'vitest';
import { runFraudDetectionAgent } from '../../server/agents/fraud_detector';
import { runBehavioralAnalysisAgent } from '../../server/agents/behavior_analyzer';
import { runComplianceAgent } from '../../server/agents/compliance_checker';
import { runRecommendationAgent } from '../../server/agents/recommender';
import { runSimilarCaseRetrievalAgent } from '../../server/agents/case_retriever';
import { runExplainabilityAgent } from '../../server/agents/explainability';
import { runReportGenerationAgent } from '../../server/agents/report_generator';
import { orchestrateInvestigation } from '../../server/agents/orchestrator';
import { Transaction } from '../types';

describe('Multi-Agent AI Autonomous Consensus Architecture', () => {
  const sampleSuspiciousTxn: Transaction = {
    id: 'TXN-98425-FRAUD',
    customerId: 'CUST-88914',
    customerName: 'Marcus Vance',
    amount: 14500.00,
    currency: 'USD',
    timestamp: new Date('2026-08-07T03:15:00Z').toISOString(), // Off-hours 03:15 UTC
    merchant: 'Binance Holdings Bullion',
    merchantCategory: 'Crypto Exchange',
    location: {
      city: 'Lagos',
      country: 'Nigeria',
      distanceFromHomeKm: 9800,
      lat: 6.5244,
      lon: 3.3792,
    },
    device: {
      id: 'DEV-EMU-89',
      type: 'Bot/Emulator',
      os: 'Android 14 VM',
      browser: 'Headless Chrome',
      isKnownCustomerDevice: false,
      fingerprintScore: 18,
    },
    ipAddress: {
      ip: '197.210.226.45',
      city: 'Lagos',
      country: 'Nigeria',
      isTor: true,
      isProxy: true,
      isVpn: true,
      proxyRiskScore: 98,
    },
    paymentMethod: {
      type: 'Wire Transfer',
      last4: '9901',
      issuer: 'First National Bank',
      cardCountry: 'Nigeria',
      is3DSecure: false,
    },
    riskScore: 94,
    fraudProbability: 0.94,
    riskTier: 'CRITICAL',
    status: 'flagged',
    confidenceScore: 0.98,
    tags: ['Impossible Velocity', 'Tor Exit Node', 'High Value Wire'],
    flagReasons: ['Impossible Velocity', 'Tor Exit Node', 'High Value Wire'],
  };

  const sampleBenignTxn: Transaction = {
    ...sampleSuspiciousTxn,
    id: 'TXN-SAFE-001',
    amount: 85.00,
    merchant: 'Whole Foods Market',
    merchantCategory: 'Grocery',
    location: {
      city: 'Seattle',
      country: 'United States',
      lat: 47.6062,
      lon: -122.3321,
      distanceFromHomeKm: 5,
    },
    device: {
      id: 'DEV-TRUSTED-IPHONE',
      type: 'Mobile',
      os: 'iOS 17.5',
      browser: 'Mobile Safari',
      isKnownCustomerDevice: true,
      fingerprintScore: 96,
    },
    ipAddress: {
      ip: '73.189.44.12',
      city: 'Seattle',
      country: 'United States',
      isTor: false,
      isProxy: false,
      isVpn: false,
      proxyRiskScore: 2,
    },
    paymentMethod: {
      type: 'Credit Card',
      last4: '4112',
      issuer: 'Chase Bank',
      cardCountry: 'United States',
      is3DSecure: true,
    },
    riskScore: 12,
    fraudProbability: 0.05,
    riskTier: 'LOW',
    status: 'approved',
    confidenceScore: 0.99,
    tags: ['Standard Grocery', 'Home Vicinity'],
    flagReasons: [],
  };

  it('Agent 1 (Fraud Detector) produces accurate risk scoring and metrics', async () => {
    const result = await runFraudDetectionAgent(sampleSuspiciousTxn);
    expect(result.metric).toBeDefined();
    expect(result.metric.id).toBe('fraud_detection');
    expect(result.metric.status).toBe('completed');
    expect(result.prediction.riskScore).toBeGreaterThanOrEqual(80);
    expect(result.prediction.riskTier).toBe('CRITICAL');
  });

  it('Agent 2 (Behavioral Analysis) catches anomalies, off-hours, and transit velocity', async () => {
    const result = await runBehavioralAnalysisAgent(sampleSuspiciousTxn);
    expect(result.metric.id).toBe('behavioral_analysis');
    expect(result.profile.amountDeviationMultiplier).toBeGreaterThan(5);
    expect(result.profile.isOffHoursTransaction).toBe(true);
    expect(result.profile.geoVelocityKmPerHour).toBeGreaterThan(800);
    expect(result.profile.anomaliesDetected.length).toBeGreaterThanOrEqual(3);
    expect(result.profile.behaviorRiskScore).toBeGreaterThan(50);
  });

  it('Agent 3 (Compliance Agent) enforces FinCEN BSA $10k, OFAC, and SAR triggers', async () => {
    const fraudCompliance = await runComplianceAgent(sampleSuspiciousTxn, 92);
    expect(fraudCompliance.compliance.amlTriggered).toBe(true);
    expect(fraudCompliance.compliance.sarRequired).toBe(true);
    expect(fraudCompliance.compliance.passed).toBe(false);
    expect(fraudCompliance.compliance.triggeredRules.some(r => r.includes('FinCEN'))).toBe(true);

    const safeCompliance = await runComplianceAgent(sampleBenignTxn, 12);
    expect(safeCompliance.compliance.sarRequired).toBe(false);
    expect(safeCompliance.compliance.amlTriggered).toBe(false);
    expect(safeCompliance.compliance.sanctionsMatch).toBe(false);
  });

  it('Agent 4 (Recommendation Agent) generates defensive actions, Playbook and step-up auth', async () => {
    const compResult = (await runComplianceAgent(sampleSuspiciousTxn, 90)).compliance;
    const recResult = await runRecommendationAgent(sampleSuspiciousTxn, 90, compResult);

    expect(recResult.recommendation.action).toBe('REJECT');
    expect(recResult.recommendation.urgency).toBe('IMMEDIATE');
    expect(recResult.recommendation.estimatedLossPrevented).toBe(14500);
    expect(recResult.recommendation.suggestedNextSteps.length).toBeGreaterThan(0);

    // Test intermediate hold recommendation
    const moderateComp = (await runComplianceAgent(sampleBenignTxn, 65)).compliance;
    const holdRec = await runRecommendationAgent(sampleBenignTxn, 65, moderateComp);
    expect(holdRec.recommendation.action).toBe('HOLD');
    expect(holdRec.recommendation.stepUpAuthType).toBe('BIOMETRIC_PASSKEY');

    // Test low-risk approve recommendation
    const safeComp = (await runComplianceAgent(sampleBenignTxn, 15)).compliance;
    const approveRec = await runRecommendationAgent(sampleBenignTxn, 15, safeComp);
    expect(approveRec.recommendation.action).toBe('APPROVE');
    expect(approveRec.recommendation.urgency).toBe('LOW');
  });

  it('Agent 5 (Case Retriever) queries vector database for similar historical fraud cases', async () => {
    const result = await runSimilarCaseRetrievalAgent(sampleSuspiciousTxn);
    expect(result.metric.id).toBe('similar_case_retrieval');
    expect(result.topMatches.length).toBeGreaterThan(0);
    expect(result.topMatches[0].caseNumber).toBeDefined();
    expect(result.topMatches[0].similarityScore).toBeGreaterThan(0.60);
  });

  it('Agent 6 (Explainability Agent) handles fallback and SHAP attribution', async () => {
    const fraudML = await runFraudDetectionAgent(sampleSuspiciousTxn);
    const similarCases = await runSimilarCaseRetrievalAgent(sampleSuspiciousTxn);

    const result = await runExplainabilityAgent(
      sampleSuspiciousTxn,
      fraudML.prediction.shapFactors,
      similarCases.topMatches,
      fraudML.prediction.riskScore
    );

    expect(result.metric.id).toBe('explainability');
    expect(result.explainability.plainEnglishSummary).toBeDefined();
    expect(result.explainability.plainEnglishSummary.length).toBeGreaterThan(10);
    expect(result.explainability.keyRiskDrivers.length).toBeGreaterThan(0);
    expect(result.explainability.shapValues.length).toBeGreaterThan(0);
  });

  it('Agent 7 (Report Generator) creates formal dossier, executive summary, and SAR narrative', async () => {
    const compResult = (await runComplianceAgent(sampleSuspiciousTxn, 90)).compliance;
    const recResult = (await runRecommendationAgent(sampleSuspiciousTxn, 90, compResult)).recommendation;
    const vectorResult = (await runSimilarCaseRetrievalAgent(sampleSuspiciousTxn)).topMatches;

    const reportRes = await runReportGenerationAgent(sampleSuspiciousTxn, recResult, vectorResult);
    expect(reportRes.metric.id).toBe('report_generation');
    expect(reportRes.report.executiveSummary).toBeDefined();
    expect(reportRes.report.analystDossier).toContain('FORENSIC INVESTIGATION DOSSIER');
    expect(reportRes.report.sarNarrative).toBeDefined();
    expect(reportRes.report.estimatedLossPrevented).toBe(14500);
  });

  it('Agent 8 (Orchestrator Agent) synthesizes full multi-phase consensus and produces dossier', async () => {
    const dossier = await orchestrateInvestigation(sampleSuspiciousTxn);

    expect(dossier).toBeDefined();
    expect(dossier.id).toContain('INV-');
    expect(dossier.status).toBe('completed');
    expect(dossier.orchestrator.agentsRun).toBe(8);
    expect(dossier.orchestrator.metrics.length).toBe(8);

    // Validate metrics in order
    const agentIds = dossier.orchestrator.metrics.map(m => m.id);
    expect(agentIds).toContain('orchestrator');
    expect(agentIds).toContain('fraud_detection');
    expect(agentIds).toContain('behavioral_analysis');
    expect(agentIds).toContain('similar_case_retrieval');
    expect(agentIds).toContain('compliance');
    expect(agentIds).toContain('explainability');
    expect(agentIds).toContain('recommendation');
    expect(agentIds).toContain('report_generation');

    expect(dossier.transaction.riskScore).toBeGreaterThanOrEqual(80);
    expect(dossier.recommendation.action).toBe('REJECT');
    expect(dossier.chatHistory.length).toBeGreaterThan(0);
  });
});
