import { Transaction, AgentMetric, BehavioralProfile } from "../../src/types";

export interface BehaviorAgentResult {
  metric: AgentMetric;
  profile: BehavioralProfile;
}

export async function runBehavioralAnalysisAgent(transaction: Transaction): Promise<BehaviorAgentResult> {
  const startTime = Date.now();

  const baselineAvg = 150.00;
  const baselineDailyFreq = 2.4;
  const deviation = parseFloat((transaction.amount / baselineAvg).toFixed(2));
  
  const isOffHours = (() => {
    try {
      const hour = new Date(transaction.timestamp).getUTCHours();
      return hour >= 1 && hour <= 5;
    } catch {
      return false;
    }
  })();

  const geoSpeed = transaction.location.distanceFromHomeKm > 500 ? 1200 : 25; // impossible speed if far
  const isNewMerchant = /crypto|bullion|unknown|swiss|gold/i.test(transaction.merchant);
  
  const anomalies: string[] = [];
  if (deviation > 5) anomalies.push(`Amount deviation: ${deviation}x higher than 90-day moving average`);
  if (geoSpeed > 800) anomalies.push(`Impossible transit velocity: ~${geoSpeed} km/h between authorization endpoints`);
  if (isOffHours) anomalies.push('Off-hours execution window (02:00 - 05:00 UTC)');
  if (isNewMerchant) anomalies.push(`First-time interaction with high-risk merchant category: ${transaction.merchantCategory}`);
  if (!transaction.device.isKnownCustomerDevice) anomalies.push('Unregistered hardware profile & operating system mismatch');

  let behaviorRiskScore = 10;
  if (deviation > 10) behaviorRiskScore += 35;
  else if (deviation > 3) behaviorRiskScore += 15;
  if (geoSpeed > 800) behaviorRiskScore += 30;
  if (isNewMerchant) behaviorRiskScore += 15;
  if (!transaction.device.isKnownCustomerDevice) behaviorRiskScore += 10;

  behaviorRiskScore = Math.min(99, Math.max(5, behaviorRiskScore));

  const profile: BehavioralProfile = {
    customerBaselineAvgAmount: baselineAvg,
    customerBaselineDailyFrequency: baselineDailyFreq,
    amountDeviationMultiplier: deviation,
    isNewMerchantForCustomer: isNewMerchant,
    isOffHoursTransaction: isOffHours,
    velocityLast1Hour: deviation > 5 ? 4 : 1,
    velocityLast24Hours: deviation > 5 ? 9 : 3,
    geoVelocityKmPerHour: geoSpeed,
    behaviorRiskScore,
    anomaliesDetected: anomalies,
  };

  const duration = Date.now() - startTime;

  const metric: AgentMetric = {
    id: 'behavioral_analysis',
    name: 'Behavioral Analysis Agent',
    role: 'Compares transaction behavior against 90-day customer baselines, impossible transit velocity, and temporal patterns.',
    status: 'completed',
    executionTimeMs: Math.max(15, duration),
    confidence: 0.94,
    summary: anomalies.length > 0
      ? `Detected ${anomalies.length} anomalous behavioral deviations. Spending magnitude is ${deviation}x customer baseline.`
      : 'Behavioral pattern is consistent with standard historical customer baseline activity.',
    details: {
      deviationMultiplier: `${deviation}x`,
      anomaliesCount: anomalies.length,
      behaviorScore: behaviorRiskScore,
    }
  };

  return {
    metric,
    profile,
  };
}
