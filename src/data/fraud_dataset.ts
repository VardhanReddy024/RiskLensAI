export interface FraudFeatureVector {
  amountRatio: number;
  distanceScore: number;
  deviceRisk: number;
  newDevice: number;
  networkRisk: number;
  merchantRisk: number;
  authenticationRisk: number;
  irreversibleRail: number;
}

export interface FraudDatasetRow extends FraudFeatureVector {
  id: string;
  label: 0 | 1;
}

export interface FraudModelThresholds {
  allowBelow: number;
  reviewBelow: number;
  falsePositiveCostUsd: number;
}

export const FRAUD_MODEL_THRESHOLDS: FraudModelThresholds = {
  allowBelow: 0.30,
  reviewBelow: 0.75,
  falsePositiveCostUsd: 25,
};

function seededValue(seed: number): number {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

function createRow(index: number): FraudDatasetRow {
  const label: 0 | 1 = index % 10 < 3 ? 1 : 0;
  const noise = (seededValue(index + 11) - 0.5) * 0.08;

  if (label === 1) {
    return {
      id: `SYN-FRAUD-${String(index).padStart(4, '0')}`,
      label,
      amountRatio: Math.min(1, 0.45 + seededValue(index + 1) * 0.45 + noise),
      distanceScore: Math.min(1, 0.38 + seededValue(index + 2) * 0.50 + noise),
      deviceRisk: Math.min(1, 0.40 + seededValue(index + 3) * 0.48 + noise),
      newDevice: seededValue(index + 4) > 0.30 ? 1 : 0,
      networkRisk: Math.min(1, 0.40 + seededValue(index + 5) * 0.48 + noise),
      merchantRisk: seededValue(index + 6) > 0.28 ? 1 : 0,
      authenticationRisk: seededValue(index + 7) > 0.26 ? 1 : 0,
      irreversibleRail: seededValue(index + 8) > 0.48 ? 1 : 0,
    };
  }

  return {
    id: `SYN-LEGIT-${String(index).padStart(4, '0')}`,
    label,
    amountRatio: Math.max(0, 0.05 + seededValue(index + 21) * 0.50 + noise),
    distanceScore: Math.max(0, 0.02 + seededValue(index + 22) * 0.48 + noise),
    deviceRisk: Math.max(0, 0.02 + seededValue(index + 23) * 0.46 + noise),
    newDevice: seededValue(index + 24) > 0.75 ? 1 : 0,
    networkRisk: Math.max(0, 0.01 + seededValue(index + 25) * 0.45 + noise),
    merchantRisk: seededValue(index + 26) > 0.82 ? 1 : 0,
    authenticationRisk: seededValue(index + 27) > 0.80 ? 1 : 0,
    irreversibleRail: seededValue(index + 28) > 0.84 ? 1 : 0,
  };
}

export const FRAUD_DATASET: FraudDatasetRow[] = Array.from({ length: 500 }, (_, index) => createRow(index));

export const FRAUD_TRAINING_ROWS = FRAUD_DATASET.filter((_, index) => seededValue(index + 101) >= 0.2);
export const FRAUD_TEST_ROWS = FRAUD_DATASET.filter((_, index) => seededValue(index + 101) < 0.2);
