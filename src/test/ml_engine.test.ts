import { describe, it, expect } from 'vitest';
import { evaluateTransactionWithML } from '../lib/ml_engine';
import { Transaction } from '../types';

describe('ML Inference & SHAP Explainability Engine', () => {
  const baseMockTransaction: Transaction = {
    id: 'TXN-TEST-001',
    customerId: 'CUST-1001',
    customerName: 'Sarah Jenkins',
    amount: 150.00,
    currency: 'USD',
    timestamp: new Date().toISOString(),
    merchant: 'Acme Supermarket',
    merchantCategory: 'Grocery',
    location: {
      city: 'Seattle',
      country: 'United States',
      lat: 47.6062,
      lon: -122.3321,
      distanceFromHomeKm: 12,
    },
    device: {
      id: 'DEV-IPHONE-01',
      type: 'Mobile',
      os: 'iOS 17.4',
      browser: 'Mobile Safari',
      isKnownCustomerDevice: true,
      fingerprintScore: 95,
    },
    ipAddress: {
      ip: '73.189.44.12',
      city: 'Seattle',
      country: 'United States',
      isTor: false,
      isVpn: false,
      isProxy: false,
      proxyRiskScore: 5,
    },
    paymentMethod: {
      type: 'Credit Card',
      last4: '4821',
      issuer: 'JPMorgan Chase',
      cardCountry: 'United States',
      is3DSecure: true,
    },
    riskScore: 10,
    fraudProbability: 0.10,
    riskTier: 'LOW',
    status: 'approved',
    confidenceScore: 0.95,
    tags: [],
    flagReasons: [],
  };

  it('correctly evaluates low-risk benign transactions', () => {
    const result = evaluateTransactionWithML(baseMockTransaction);

    expect(result).toBeDefined();
    expect(result.riskTier).toBe('LOW');
    expect(result.riskScore).toBeLessThan(30);
    expect(result.fraudProbability).toBeLessThanOrEqual(0.3);
    expect(result.confidenceScore).toBeGreaterThanOrEqual(0.85);
    expect(result.modelDetails.algorithm).toContain('XGBoost');
    expect(result.modelDetails.aucRoc).toBe(0.984);
    expect(result.shapFactors.length).toBeGreaterThanOrEqual(4);

    // Negative impact factors should dominate for routine baseline transactions
    const amountFactor = result.shapFactors.find(f => f.feature === 'amount_z_score');
    expect(amountFactor).toBeDefined();
    expect(amountFactor?.isSuspicious).toBe(false);
    expect(amountFactor?.impactScore).toBeLessThan(0);
  });

  it('triggers critical risk and high SHAP attribution for high-velocity anomalous transaction', () => {
    const fraudTransaction: Transaction = {
      ...baseMockTransaction,
      id: 'TXN-FRAUD-002',
      amount: 14500.00, // > 20x baseline
      merchant: 'Binance Global Crypto',
      merchantCategory: 'Crypto Exchange',
      location: {
        city: 'Lagos',
        country: 'Nigeria',
        lat: 6.5244,
        lon: 3.3792,
        distanceFromHomeKm: 11200, // > 3000km
      },
      device: {
        id: 'DEV-EMU-99',
        type: 'Bot/Emulator',
        os: 'Android 14 VM',
        browser: 'Headless Chrome',
        isKnownCustomerDevice: false,
        fingerprintScore: 12,
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
    };

    const result = evaluateTransactionWithML(fraudTransaction);

    expect(result.riskScore).toBeGreaterThanOrEqual(80);
    expect(result.riskTier).toBe('CRITICAL');
    expect(result.fraudProbability).toBeGreaterThanOrEqual(0.80);

    // Verify individual SHAP factors
    const amountShap = result.shapFactors.find(f => f.feature === 'amount_z_score');
    expect(amountShap?.impactScore).toBe(35);
    expect(amountShap?.isSuspicious).toBe(true);

    const geoShap = result.shapFactors.find(f => f.feature === 'geo_velocity_anomaly');
    expect(geoShap?.impactScore).toBe(32);
    expect(geoShap?.isSuspicious).toBe(true);

    const deviceShap = result.shapFactors.find(f => f.feature === 'device_fingerprint_trust');
    expect(deviceShap?.impactScore).toBe(30);
    expect(deviceShap?.isSuspicious).toBe(true);

    const ipShap = result.shapFactors.find(f => f.feature === 'ip_proxy_risk_index');
    expect(ipShap?.impactScore).toBe(26);
    expect(ipShap?.isSuspicious).toBe(true);

    const merchantShap = result.shapFactors.find(f => f.feature === 'merchant_category_risk');
    expect(merchantShap?.impactScore).toBe(20);
    expect(merchantShap?.isSuspicious).toBe(true);

    const authShap = result.shapFactors.find(f => f.feature === 'payment_channel_security');
    expect(authShap?.impactScore).toBe(15);
    expect(authShap?.isSuspicious).toBe(true);

    // Factors should be sorted by absolute impact score descending
    for (let i = 0; i < result.shapFactors.length - 1; i++) {
      expect(Math.abs(result.shapFactors[i].impactScore)).toBeGreaterThanOrEqual(
        Math.abs(result.shapFactors[i + 1].impactScore)
      );
    }
  });

  it('handles intermediate tier transitions accurately (Elevated amount, out of state, commercial VPN)', () => {
    const mediumTransaction: Transaction = {
      ...baseMockTransaction,
      amount: 1100.00, // 5x - 20x ratio
      location: {
        city: 'Denver',
        country: 'United States',
        lat: 39.7392,
        lon: -104.9903,
        distanceFromHomeKm: 850, // 200km - 3000km
      },
      device: {
        id: 'DEV-NEW-MAC',
        type: 'Desktop',
        os: 'macOS 14',
        browser: 'Safari',
        isKnownCustomerDevice: false, // first seen
        fingerprintScore: 78,
      },
      ipAddress: {
        ip: '104.28.19.4',
        city: 'Denver',
        country: 'United States',
        isTor: false,
        isProxy: false,
        isVpn: true, // Commercial VPN
        proxyRiskScore: 40,
      },
      paymentMethod: {
        type: 'Credit Card',
        last4: '4821',
        issuer: 'JPMorgan Chase',
        cardCountry: 'United States',
        is3DSecure: false,
      },
    };

    const result = evaluateTransactionWithML(mediumTransaction);

    expect(result.riskScore).toBeGreaterThanOrEqual(50);
    const amountFactor = result.shapFactors.find(f => f.feature === 'amount_z_score');
    expect(amountFactor?.impactScore).toBe(18);

    const geoFactor = result.shapFactors.find(f => f.feature === 'geo_velocity_anomaly');
    expect(geoFactor?.impactScore).toBe(12);

    const deviceFactor = result.shapFactors.find(f => f.feature === 'device_fingerprint_trust');
    expect(deviceFactor?.impactScore).toBe(14);

    const ipFactor = result.shapFactors.find(f => f.feature === 'ip_proxy_risk_index');
    expect(ipFactor?.impactScore).toBe(10);
  });

  it('ensures score output is strictly bounded between 1 and 99', () => {
    // Extreme high-risk input
    const extremeHigh: Transaction = {
      ...baseMockTransaction,
      amount: 1000000.00,
      merchantCategory: 'Crypto Exchange',
      location: { city: 'Unknown', country: 'North Korea', lat: 39.0392, lon: 125.7625, distanceFromHomeKm: 15000 },
      device: { id: 'DEV-BOT-01', type: 'Bot/Emulator', browser: 'Headless', fingerprintScore: 1, isKnownCustomerDevice: false, os: 'Bot' },
      ipAddress: { ip: '1.1.1.1', country: 'North Korea', city: 'Pyongyang', isTor: true, isProxy: true, proxyRiskScore: 100, isVpn: true },
      paymentMethod: { type: 'Wire Transfer', last4: '0000', issuer: 'Unknown Bank', cardCountry: 'North Korea', is3DSecure: false },
    };

    const highResult = evaluateTransactionWithML(extremeHigh);
    expect(highResult.riskScore).toBeLessThanOrEqual(99);
    expect(highResult.riskScore).toBeGreaterThanOrEqual(1);

    // Extreme safe input
    const extremeLow: Transaction = {
      ...baseMockTransaction,
      amount: 1.50,
      merchantCategory: 'Retail',
      location: { city: 'Seattle', country: 'United States', lat: 47.6062, lon: -122.3321, distanceFromHomeKm: 1 },
      device: { id: 'DEV-IPHONE-01', type: 'Mobile', fingerprintScore: 100, isKnownCustomerDevice: true, os: 'iOS', browser: 'Safari' },
      ipAddress: { ip: '127.0.0.1', country: 'United States', city: 'Seattle', isTor: false, isProxy: false, proxyRiskScore: 0, isVpn: false },
      paymentMethod: { type: 'Credit Card', last4: '4821', issuer: 'JPMorgan Chase', cardCountry: 'United States', is3DSecure: true },
    };

    const lowResult = evaluateTransactionWithML(extremeLow);
    expect(lowResult.riskScore).toBeGreaterThanOrEqual(1);
    expect(lowResult.riskScore).toBeLessThanOrEqual(99);
  });
});
