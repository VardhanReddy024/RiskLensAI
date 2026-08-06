import { Transaction, AgentMetric, HistoricalFraudCase } from "../../src/types";
import { searchSimilarFraudCases } from "../qdrant";

export interface SimilarCaseAgentResult {
  metric: AgentMetric;
  topMatches: HistoricalFraudCase[];
}

export async function runSimilarCaseRetrievalAgent(transaction: Transaction): Promise<SimilarCaseAgentResult> {
  const startTime = Date.now();
  const topMatches = searchSimilarFraudCases(transaction, { limit: 3, scoreThreshold: 0.60 });
  const duration = Date.now() - startTime;

  const topMatch = topMatches[0];
  const metric: AgentMetric = {
    id: 'similar_case_retrieval',
    name: 'Similar Case Retrieval Agent',
    role: 'Performs semantic vector nearest-neighbor search across indexed historical fraud incidents in Qdrant.',
    status: 'completed',
    executionTimeMs: Math.max(22, duration),
    confidence: topMatch ? topMatch.similarityScore : 0.85,
    summary: topMatch
      ? `Retrieved ${topMatches.length} historical cases. Strongest cluster match: "${topMatch.title}" (${(topMatch.similarityScore * 100).toFixed(0)}% vector match, Case ${topMatch.caseNumber}).`
      : 'No high-confidence historical vector clusters identified in database.',
    details: {
      matchedCaseId: topMatch?.caseNumber,
      topSimilarity: topMatch ? `${(topMatch.similarityScore * 100).toFixed(1)}%` : 'N/A',
      vectorDistance: topMatch?.vectorDistance,
      preventedLossPrecedent: topMatch ? `$${topMatch.preventedLossAmount.toLocaleString()}` : '$0',
    }
  };

  return {
    metric,
    topMatches,
  };
}
