import { Transaction, AgentMetric } from "../../src/types";
import { evaluateTransactionWithML, MLPredictionResult } from "../ml_engine";

export interface FraudDetectionAgentResult {
  metric: AgentMetric;
  prediction: MLPredictionResult;
}

export async function runFraudDetectionAgent(transaction: Transaction): Promise<FraudDetectionAgentResult> {
  const startTime = Date.now();
  const prediction = evaluateTransactionWithML(transaction);
  const duration = Date.now() - startTime;

  const metric: AgentMetric = {
    id: 'fraud_detection',
    name: 'Fraud Detection Agent',
    role: 'Calculates ML fraud probability, confidence interval, and SHAP vector factors using gradient boosted trees.',
    status: 'completed',
    executionTimeMs: Math.max(12, duration),
    confidence: prediction.confidenceScore,
    summary: `Assessed risk score of ${prediction.riskScore}/100 (${prediction.riskTier}) with ${(prediction.confidenceScore * 100).toFixed(0)}% model confidence. Top driver: ${prediction.shapFactors[0]?.displayName || 'Baseline'}.`,
    details: {
      riskScore: prediction.riskScore,
      probability: prediction.fraudProbability,
      riskTier: prediction.riskTier,
      model: prediction.modelDetails.algorithm,
      aucRoc: prediction.modelDetails.aucRoc,
    }
  };

  return {
    metric,
    prediction,
  };
}
