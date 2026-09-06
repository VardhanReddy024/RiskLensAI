import { Transaction, ShapFactor, RiskTier } from '../types';
import { FRAUD_MODEL_THRESHOLDS, FRAUD_TEST_ROWS, FRAUD_TRAINING_ROWS, FraudDatasetRow } from '../data/fraud_dataset';
import { getRiskTier } from './utils';

export interface FraudEvaluationMetrics {
  trainRows: number;
  testRows: number;
  positiveTestRows: number;
  negativeTestRows: number;
  threshold: number;
  aucRoc: number;
  precision: number;
  recall: number;
  f1: number;
  falsePositiveRate: number;
  falsePositiveCount: number;
  falseNegativeCount: number;
  falsePositiveCostUsd: number;
  confusionMatrix: {
    truePositive: number;
    trueNegative: number;
    falsePositive: number;
    falseNegative: number;
  };
}

export interface MLPredictionResult {
  fraudProbability: number;
  riskScore: number;
  riskTier: RiskTier;
  fraudDecision: 'ALLOW' | 'REVIEW' | 'BLOCK';
  confidenceScore: number;
  shapFactors: ShapFactor[];
  modelDetails: {
    algorithm: string;
    version: string;
    aucRoc: number;
    trainingDatasetSize: string;
    features: string[];
    evaluation: FraudEvaluationMetrics;
  };
}

export interface CurrencyBaselineConfig {
  symbol: string;
  defaultBaselineAmount: number;
}

export const CURRENCY_BASELINES: Record<string, CurrencyBaselineConfig> = {
  USD: { symbol: '$', defaultBaselineAmount: 180.00 },
  INR: { symbol: '₹', defaultBaselineAmount: 15000.00 },
  EUR: { symbol: '€', defaultBaselineAmount: 160.00 },
  GBP: { symbol: '£', defaultBaselineAmount: 140.00 },
  CAD: { symbol: 'CA$', defaultBaselineAmount: 240.00 },
  AUD: { symbol: 'AU$', defaultBaselineAmount: 260.00 },
  SGD: { symbol: 'SG$', defaultBaselineAmount: 240.00 },
  AED: { symbol: 'AED ', defaultBaselineAmount: 650.00 },
};

const FEATURE_NAMES = [
  'amount_ratio',
  'distance_score',
  'device_risk',
  'new_device',
  'network_risk',
  'merchant_risk',
  'authentication_risk',
  'irreversible_rail',
];

interface LogisticModel {
  weights: number[];
  bias: number;
}

export function getCurrencyConfig(currencyCode?: string): { config: CurrencyBaselineConfig; isKnown: boolean; code: string } {
  const code = (currencyCode || 'USD').toUpperCase().trim();
  const config = CURRENCY_BASELINES[code];
  if (config) return { config, isKnown: true, code };
  return { config: { symbol: `${code} `, defaultBaselineAmount: 180.00 }, isKnown: false, code };
}

function sigmoid(value: number): number {
  if (value >= 0) {
    const exponent = Math.exp(-value);
    return 1 / (1 + exponent);
  }
  const exponent = Math.exp(value);
  return exponent / (1 + exponent);
}

function vectorForRow(row: FraudDatasetRow): number[] {
  return [
    row.amountRatio,
    row.distanceScore,
    row.deviceRisk,
    row.newDevice,
    row.networkRisk,
    row.merchantRisk,
    row.authenticationRisk,
    row.irreversibleRail,
  ];
}

function trainLogisticRegression(rows: FraudDatasetRow[]): LogisticModel {
  const weights = Array.from({ length: FEATURE_NAMES.length }, () => 0);
  let bias = 0;
  const learningRate = 0.45;
  const regularization = 0.001;

  for (let epoch = 0; epoch < 1200; epoch += 1) {
    const gradients = Array.from({ length: weights.length }, () => 0);
    let biasGradient = 0;

    for (const row of rows) {
      const vector = vectorForRow(row);
      const probability = sigmoid(bias + vector.reduce((sum, value, index) => sum + value * weights[index], 0));
      const error = probability - row.label;
      vector.forEach((value, index) => {
        gradients[index] += error * value;
      });
      biasGradient += error;
    }

    const scale = 1 / rows.length;
    weights.forEach((weight, index) => {
      weights[index] -= learningRate * (gradients[index] * scale + regularization * weight);
    });
    bias -= learningRate * biasGradient * scale;
  }

  return { weights, bias };
}

function predictProbability(model: LogisticModel, vector: number[]): number {
  return sigmoid(model.bias + vector.reduce((sum, value, index) => sum + value * model.weights[index], 0));
}

const TRAINED_MODEL = trainLogisticRegression(FRAUD_TRAINING_ROWS);

function calculateAuc(rows: FraudDatasetRow[], model: LogisticModel): number {
  const positives = rows.filter(row => row.label === 1);
  const negatives = rows.filter(row => row.label === 0);
  let correctlyOrdered = 0;
  for (const positive of positives) {
    const positiveProbability = predictProbability(model, vectorForRow(positive));
    for (const negative of negatives) {
      const negativeProbability = predictProbability(model, vectorForRow(negative));
      if (positiveProbability > negativeProbability) correctlyOrdered += 1;
      else if (positiveProbability === negativeProbability) correctlyOrdered += 0.5;
    }
  }
  return Number((correctlyOrdered / (positives.length * negatives.length)).toFixed(4));
}

export function evaluateFraudModel(rows = FRAUD_TEST_ROWS): FraudEvaluationMetrics {
  const threshold = FRAUD_MODEL_THRESHOLDS.reviewBelow;
  const predictions = rows.map(row => ({
    actual: row.label,
    predicted: predictProbability(TRAINED_MODEL, vectorForRow(row)) >= threshold ? 1 : 0,
  }));
  const truePositive = predictions.filter(item => item.actual === 1 && item.predicted === 1).length;
  const trueNegative = predictions.filter(item => item.actual === 0 && item.predicted === 0).length;
  const falsePositive = predictions.filter(item => item.actual === 0 && item.predicted === 1).length;
  const falseNegative = predictions.filter(item => item.actual === 1 && item.predicted === 0).length;
  const precision = truePositive + falsePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
  const recall = truePositive + falseNegative === 0 ? 0 : truePositive / (truePositive + falseNegative);

  return {
    trainRows: FRAUD_TRAINING_ROWS.length,
    testRows: rows.length,
    positiveTestRows: rows.filter(row => row.label === 1).length,
    negativeTestRows: rows.filter(row => row.label === 0).length,
    threshold,
    aucRoc: calculateAuc(rows, TRAINED_MODEL),
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number((precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)).toFixed(4)),
    falsePositiveRate: Number((falsePositive / Math.max(1, trueNegative + falsePositive)).toFixed(4)),
    falsePositiveCount: falsePositive,
    falseNegativeCount: falseNegative,
    falsePositiveCostUsd: Number((falsePositive * FRAUD_MODEL_THRESHOLDS.falsePositiveCostUsd).toFixed(2)),
    confusionMatrix: { truePositive, trueNegative, falsePositive, falseNegative },
  };
}

export const FRAUD_MODEL_EVALUATION = evaluateFraudModel();

function transactionFeatures(transaction: Transaction): { vector: number[]; labels: string[]; values: string[]; amountDisplayName: string; amountIsSuspicious: boolean } {
  const location = typeof transaction.location === 'object' && transaction.location !== null ? transaction.location : { distanceFromHomeKm: 45 };
  const device = typeof transaction.device === 'object' && transaction.device !== null ? transaction.device : { fingerprintScore: 85, isKnownCustomerDevice: true, type: 'Desktop/Web' };
  const ipAddress = typeof transaction.ipAddress === 'object' && transaction.ipAddress !== null ? transaction.ipAddress : { proxyRiskScore: 12, isTor: false, isProxy: false, isVpn: false };
  const paymentMethod = typeof transaction.paymentMethod === 'object' && transaction.paymentMethod !== null ? transaction.paymentMethod : { is3DSecure: true, type: 'Credit Card' };
  const { config: currencyConfig, isKnown: isKnownCurrency } = getCurrencyConfig(transaction.currency);
  const rawAmount = Math.max(0, transaction.amount || 0);
  const rawAmountRatio = rawAmount / currencyConfig.defaultBaselineAmount;
  const amountRatio = Math.min(1, Math.log1p(rawAmountRatio) / Math.log1p(25));
  const vector = [
    amountRatio,
    Math.min(1, Math.log1p(Math.max(0, location.distanceFromHomeKm || 0)) / Math.log1p(10000)),
    Math.min(1, Math.max(0, 1 - (device.fingerprintScore ?? 80) / 100)),
    device.isKnownCustomerDevice ? 0 : 1,
    Math.min(1, Math.max(ipAddress.proxyRiskScore ?? 10, ipAddress.isTor || ipAddress.isProxy ? 85 : ipAddress.isVpn ? 55 : 0) / 100),
    ['Crypto Exchange', 'Luxury Goods', 'Gaming/Gambling', 'Crypto'].includes(transaction.merchantCategory) ? 1 : 0,
    paymentMethod.is3DSecure ? 0 : 1,
    paymentMethod.type === 'Wire Transfer' ? 1 : 0,
  ];
  return {
    vector,
    labels: ['Amount anomaly', 'Travel anomaly', 'Device trust', 'New device', 'Network reputation', 'Merchant category', 'Authentication', 'Payment rail'],
    values: vector.map(value => value.toFixed(2)).map((value, index) => index === 0 && !isKnownCurrency
      ? `${currencyConfig.symbol}${rawAmount.toFixed(2)} [INSUFFICIENT_DATA]`
      : index === 0 ? `${currencyConfig.symbol}${rawAmount.toFixed(2)}` : value),
    amountDisplayName: !isKnownCurrency ? 'Unindexed Currency Profile' : rawAmountRatio > 20 ? 'High Transaction Amount' : rawAmountRatio > 5 ? 'Elevated Amount' : 'Routine Amount',
    amountIsSuspicious: !isKnownCurrency || rawAmountRatio > 5,
  };
}

function decisionForProbability(probability: number): 'ALLOW' | 'REVIEW' | 'BLOCK' {
  if (probability >= FRAUD_MODEL_THRESHOLDS.reviewBelow) return 'BLOCK';
  if (probability >= FRAUD_MODEL_THRESHOLDS.allowBelow) return 'REVIEW';
  return 'ALLOW';
}

export function evaluateTransactionWithML(transaction: Transaction): MLPredictionResult {
  const { vector, labels, values, amountDisplayName, amountIsSuspicious } = transactionFeatures(transaction);
  const fraudProbability = Number(predictProbability(TRAINED_MODEL, vector).toFixed(4));
  const riskScore = Math.max(1, Math.min(99, Math.round(fraudProbability * 100)));
  const riskTier = getRiskTier(riskScore);
  const fraudDecision = decisionForProbability(fraudProbability);
  const contributions: ShapFactor[] = vector.map((value, index) => ({
    feature: index === 0 ? 'amount_z_score' : FEATURE_NAMES[index],
    displayName: index === 0 ? amountDisplayName : labels[index],
    category: index === 4 ? 'Network' : index === 1 ? 'Location' : index === 2 || index === 3 ? 'Device' : 'Transaction',
    value: values[index],
    impactScore: Number((TRAINED_MODEL.weights[index] * value * 10).toFixed(2)),
    isSuspicious: index === 0 ? amountIsSuspicious : TRAINED_MODEL.weights[index] * value > 0,
    explanation: `Model contribution from ${labels[index].toLowerCase()} feature.`,
  }));

  contributions.sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore));

  return {
    fraudProbability,
    riskScore,
    riskTier,
    fraudDecision,
    confidenceScore: Number((0.5 + Math.abs(fraudProbability - 0.5)).toFixed(4)),
    shapFactors: contributions,
    modelDetails: {
      algorithm: 'Deterministic binary logistic regression',
      version: 'fraud-logistic-v1',
      aucRoc: calculateAuc(FRAUD_TEST_ROWS, TRAINED_MODEL),
      trainingDatasetSize: `${FRAUD_TRAINING_ROWS.length} synthetic labeled transactions`,
      features: FEATURE_NAMES,
      evaluation: FRAUD_MODEL_EVALUATION,
    },
  };
}
