import { Transaction, AgentMetric, ComplianceCheckResult } from "../../src/types";

export interface ComplianceAgentResult {
  metric: AgentMetric;
  compliance: ComplianceCheckResult;
}

export async function runComplianceAgent(transaction: Transaction, riskScore: number): Promise<ComplianceAgentResult> {
  const startTime = Date.now();

  const isHighValue = (transaction.amount || 0) >= 10000;
  const isSanctionCountry = /iran|north korea|syria|cuba|russia/i.test(transaction.location?.country || '');
  const isTor = !!transaction.ipAddress?.isTor;
  const isCryptoOrBullion = /crypto|bullion|gold|wire/i.test(transaction.merchant || '') || transaction.merchantCategory === 'Crypto Exchange' || transaction.merchantCategory === 'Crypto';
  const is3DSecure = !!transaction.paymentMethod?.is3DSecure;
  
  const triggeredRules: string[] = [];
  let amlTriggered = false;
  let sarRequired = false;
  let passed = true;

  if (isHighValue) {
    triggeredRules.push('FinCEN BSA Rule 103.22: Transaction exceeds $10,000 threshold (CTR/SAR applicability)');
    amlTriggered = true;
  }
  if (isSanctionCountry) {
    triggeredRules.push('OFAC SDN Sanctions Screening: Originating or settlement jurisdiction under strict trade sanctions');
    passed = false;
    sarRequired = true;
  }
  if (isTor && isCryptoOrBullion) {
    triggeredRules.push('FATF Recommendation 16 (Travel Rule): Anonymized darknet proxy routing to virtual asset service provider (VASP)');
    amlTriggered = true;
    sarRequired = true;
    passed = false;
  }
  if (riskScore >= 75) {
    triggeredRules.push('Regulation E (12 CFR Part 1005): Suspected unauthorized electronic fund transfer requiring provisional credit hold');
    sarRequired = true;
    passed = false;
  }
  if (!is3DSecure && (transaction.amount || 0) > 250) {
    triggeredRules.push('PSD3 / SCA Rule: Card-Not-Present transaction over €250 executed without two-factor SCA step-up authentication');
  }

  const compliance: ComplianceCheckResult = {
    passed,
    amlTriggered,
    sanctionsMatch: isSanctionCountry,
    pepMatch: false,
    sarRequired,
    regECompliant: !passed,
    psd3ScaRequired: !is3DSecure,
    triggeredRules,
    notes: sarRequired 
      ? 'Mandatory Suspicious Activity Report (SAR) filing recommended within 30 days pursuant to 31 CFR § 1020.320.'
      : 'All primary regulatory and sanctions compliance mandates satisfied.'
  };

  const duration = Date.now() - startTime;

  const metric: AgentMetric = {
    id: 'compliance',
    name: 'Compliance Agent',
    role: 'Enforces AML/BSA screening, OFAC sanctions, Regulation E consumer protections, and SAR filing mandates.',
    status: 'completed',
    executionTimeMs: Math.max(14, duration),
    confidence: 0.99,
    summary: sarRequired
      ? `Identified ${triggeredRules.length} regulatory rule triggers. Formal SAR filing recommended.`
      : (triggeredRules.length > 0 ? `Triggered ${triggeredRules.length} informational policy rules.` : 'Clean compliance clearance. Zero regulatory flags.'),
    details: {
      sarRequired,
      amlTriggered,
      sanctionsScreening: isSanctionCountry ? 'FLAGGED' : 'PASSED',
      rulesTriggeredCount: triggeredRules.length,
    }
  };

  return {
    metric,
    compliance,
  };
}
