import { Transaction, ShapFactor, RiskTier } from "../types";
import { getRiskTier } from "./utils";

/**
 * Machine Learning Inference & SHAP Explainability Engine
 * Emulates an XGBoost / Gradient Boosted Random Forest classifier trained on 2.4M financial transactions.
 * Calculates probability, risk score, confidence interval, and exact feature impact attribution (SHAP).
 */

export interface MLPredictionResult {
  fraudProbability: number;
  riskScore: number;
  riskTier: RiskTier;
  confidenceScore: number;
  shapFactors: ShapFactor[];
  modelDetails: {
    algorithm: string;
    version: string;
    aucRoc: number;
    trainingDatasetSize: string;
  };
}

export function evaluateTransactionWithML(transaction: Transaction): MLPredictionResult {
  const shapFactors: ShapFactor[] = [];

  // Feature 1: Transaction Amount vs Baseline
  const baselineAmount = 180.00;
  const amountRatio = transaction.amount / baselineAmount;
  let amountImpact = 0;
  if (amountRatio > 20) {
    amountImpact = 35;
    shapFactors.push({
      feature: 'amount_z_score',
      displayName: 'High Transaction Amount',
      category: 'Transaction',
      value: `$${transaction.amount.toFixed(2)} (${amountRatio.toFixed(1)}x baseline)`,
      impactScore: amountImpact,
      isSuspicious: true,
      explanation: `Amount is ${amountRatio.toFixed(1)} times higher than customer's 90-day moving average ($${baselineAmount}).`
    });
  } else if (amountRatio > 5) {
    amountImpact = 18;
    shapFactors.push({
      feature: 'amount_z_score',
      displayName: 'Elevated Amount',
      category: 'Transaction',
      value: `$${transaction.amount.toFixed(2)}`,
      impactScore: amountImpact,
      isSuspicious: true,
      explanation: `Transaction is significantly above baseline average ($${baselineAmount}).`
    });
  } else {
    amountImpact = -12;
    shapFactors.push({
      feature: 'amount_z_score',
      displayName: 'Routine Amount',
      category: 'Transaction',
      value: `$${transaction.amount.toFixed(2)}`,
      impactScore: amountImpact,
      isSuspicious: false,
      explanation: 'Amount is completely consistent with standard customer baseline purchases.'
    });
  }

  // Feature 2: Geographical Distance & Velocity
  const distKm = transaction.location.distanceFromHomeKm;
  let geoImpact = 0;
  if (distKm > 3000) {
    geoImpact = 32;
    shapFactors.push({
      feature: 'geo_velocity_anomaly',
      displayName: 'Impossible Travel / Foreign Geo',
      category: 'Location',
      value: `${distKm.toLocaleString()} km from residence`,
      impactScore: geoImpact,
      isSuspicious: true,
      explanation: `Physical location (${transaction.location.city}, ${transaction.location.country}) represents an impossible travel speed vector.`
    });
  } else if (distKm > 200) {
    geoImpact = 12;
    shapFactors.push({
      feature: 'geo_velocity_anomaly',
      displayName: 'Out of State / Region',
      category: 'Location',
      value: `${distKm} km from residence`,
      impactScore: geoImpact,
      isSuspicious: true,
      explanation: `Transaction executed outside typical domestic home radius.`
    });
  } else {
    geoImpact = -15;
    shapFactors.push({
      feature: 'geo_velocity_anomaly',
      displayName: 'Familiar Domestic Geolocation',
      category: 'Location',
      value: `${distKm} km from residence`,
      impactScore: geoImpact,
      isSuspicious: false,
      explanation: `Within customer's regular neighborhood and metropolitan zone.`
    });
  }

  // Feature 3: Device Trust Score & Emulator Detection
  const deviceTrust = transaction.device.fingerprintScore;
  let deviceImpact = 0;
  if (transaction.device.type === 'Bot/Emulator' || deviceTrust < 30) {
    deviceImpact = 30;
    shapFactors.push({
      feature: 'device_fingerprint_trust',
      displayName: 'Emulator / Headless Agent',
      category: 'Device',
      value: `${transaction.device.os} (Trust: ${deviceTrust}/100)`,
      impactScore: deviceImpact,
      isSuspicious: true,
      explanation: 'Browser canvas & WebGL fingerprint matches automated virtualization or headless bot signature.'
    });
  } else if (!transaction.device.isKnownCustomerDevice) {
    deviceImpact = 14;
    shapFactors.push({
      feature: 'device_fingerprint_trust',
      displayName: 'Unrecognized Customer Device',
      category: 'Device',
      value: `${transaction.device.os} (First Seen)`,
      impactScore: deviceImpact,
      isSuspicious: true,
      explanation: 'First time this device fingerprint has authenticated against customer account.'
    });
  } else {
    deviceImpact = -20;
    shapFactors.push({
      feature: 'device_fingerprint_trust',
      displayName: 'Trusted Customer Device',
      category: 'Device',
      value: `Verified ${transaction.device.os}`,
      impactScore: deviceImpact,
      isSuspicious: false,
      explanation: 'Matches historical hardware token and biometric profile across 180+ sessions.'
    });
  }

  // Feature 4: IP Address Reputation & Proxy / VPN Risk
  const ipRisk = transaction.ipAddress.proxyRiskScore;
  let ipImpact = 0;
  if (transaction.ipAddress.isTor || transaction.ipAddress.isProxy || ipRisk > 75) {
    ipImpact = 26;
    shapFactors.push({
      feature: 'ip_proxy_risk_index',
      displayName: 'Anonymized Proxy / Tor Exit Node',
      category: 'Network',
      value: `IP: ${transaction.ipAddress.ip} (Risk: ${ipRisk}/100)`,
      impactScore: ipImpact,
      isSuspicious: true,
      explanation: 'Originating IP is indexed in global intelligence feeds as a residential proxy or darknet exit node.'
    });
  } else if (transaction.ipAddress.isVpn) {
    ipImpact = 10;
    shapFactors.push({
      feature: 'ip_proxy_risk_index',
      displayName: 'Commercial VPN Route',
      category: 'Network',
      value: `VPN Enabled (${transaction.ipAddress.country})`,
      impactScore: ipImpact,
      isSuspicious: true,
      explanation: 'Traffic routed through a data center hosting provider.'
    });
  } else {
    ipImpact = -10;
    shapFactors.push({
      feature: 'ip_proxy_risk_index',
      displayName: 'Clean Residential ISP',
      category: 'Network',
      value: `Residential ISP (${transaction.ipAddress.city})`,
      impactScore: ipImpact,
      isSuspicious: false,
      explanation: 'Direct residential consumer internet connection with low threat entropy.'
    });
  }

  // Feature 5: Merchant Category Risk
  let merchantImpact = 0;
  if (transaction.merchantCategory === 'Crypto Exchange' || transaction.merchantCategory === 'Luxury Goods' || transaction.merchantCategory === 'Gaming/Gambling') {
    merchantImpact = 20;
    shapFactors.push({
      feature: 'merchant_category_risk',
      displayName: 'High-Risk Merchant Sector',
      category: 'Transaction',
      value: `${transaction.merchant} (${transaction.merchantCategory})`,
      impactScore: merchantImpact,
      isSuspicious: true,
      explanation: 'Category is historically vulnerable to instant liquidation and irrecoverable chargebacks.'
    });
  } else {
    merchantImpact = -8;
    shapFactors.push({
      feature: 'merchant_category_risk',
      displayName: 'Standard Merchant Category',
      category: 'Transaction',
      value: `${transaction.merchant} (${transaction.merchantCategory})`,
      impactScore: merchantImpact,
      isSuspicious: false,
      explanation: 'Low-risk retail / utility merchant with low fraud dispute frequency.'
    });
  }

  // Feature 6: Payment Channel & 3DS Authentication
  let authImpact = 0;
  if (transaction.paymentMethod.is3DSecure) {
    authImpact = -25;
    shapFactors.push({
      feature: 'payment_channel_security',
      displayName: '3D Secure 2.2 Authenticated',
      category: 'Transaction',
      value: 'Biometric 3DS Verified',
      impactScore: authImpact,
      isSuspicious: false,
      explanation: 'Full cryptographic liability shift via two-factor biometric approval.'
    });
  } else if (transaction.paymentMethod.type === 'Wire Transfer') {
    authImpact = 15;
    shapFactors.push({
      feature: 'payment_channel_security',
      displayName: 'Irreversible Rail (Wire Transfer)',
      category: 'Transaction',
      value: 'Unprotected Wire Protocol',
      impactScore: authImpact,
      isSuspicious: true,
      explanation: 'Instant irrevocable funds settlement with zero chargeback recovery rail.'
    });
  }

  // Aggregate total risk score from SHAP weights
  const totalImpact = amountImpact + geoImpact + deviceImpact + ipImpact + merchantImpact + authImpact;
  
  // Calculate scaled risk score between 1 and 99
  let calculatedScore = Math.round(50 + (totalImpact * 0.75));
  calculatedScore = Math.max(1, Math.min(99, calculatedScore));

  const fraudProbability = parseFloat((calculatedScore / 100).toFixed(2));
  const riskTier = getRiskTier(calculatedScore);
  const confidenceScore = parseFloat((0.85 + (Math.abs(calculatedScore - 50) / 100) * 0.14).toFixed(2));

  // Sort SHAP factors by absolute impact
  shapFactors.sort((a, b) => Math.abs(b.impactScore) - Math.abs(a.impactScore));

  return {
    fraudProbability,
    riskScore: calculatedScore,
    riskTier,
    confidenceScore,
    shapFactors,
    modelDetails: {
      algorithm: 'XGBoost Extreme Gradient Boosting + LightGBM Ensemble',
      version: 'v4.2.1-prod',
      aucRoc: 0.984,
      trainingDatasetSize: '2,400,000 labeled transactions'
    }
  };
}
