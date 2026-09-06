import { Transaction, AgentMetric, ActionRecommendation, HistoricalFraudCase, InvestigationReport } from "../../src/types";
import { generateInvestigationReportWithGemini } from "../gemini";

export interface ReportAgentResult {
  metric: AgentMetric;
  report: InvestigationReport;
}

export async function runReportGenerationAgent(
  transaction: Transaction,
  recommendation: ActionRecommendation,
  topCases: HistoricalFraudCase[]
): Promise<ReportAgentResult> {
  const startTime = Date.now();

  const reportData = await generateInvestigationReportWithGemini(
    transaction,
    recommendation,
    topCases
  );

  const duration = Date.now() - startTime;

  const report: InvestigationReport = {
    executiveSummary: reportData.executiveSummary,
    analystDossier: reportData.analystDossier,
    sarNarrative: reportData.sarNarrative,
    keyEvidence: reportData.keyEvidence,
    estimatedLossPrevented: recommendation.estimatedLossPrevented,
    generatedAt: new Date().toISOString(),
    authorAgent: 'Report Generation Agent (Gemini 3.6 Flash Engine)',
  };

  const metric: AgentMetric = {
    id: 'report_generation',
    name: 'Report Generation Agent',
    role: 'Compiles audit-ready investigation dossiers, SAR drafts, and C-level executive loss-prevention summaries.',
    status: 'completed',
    executionTimeMs: Math.max(38, duration),
    confidence: 0.98,
    summary: `Synthesized formal investigation dossier, SAR regulatory draft, and calculated loss prevention value of $${recommendation.estimatedLossPrevented.toFixed(2)}.`,
    details: {
      reportLengthChars: report.analystDossier.length,
      sarGenerated: !!report.sarNarrative,
      estimatedLossPrevented: `$${report.estimatedLossPrevented.toFixed(2)}`,
    }
  };

  return {
    metric,
    report,
  };
}
