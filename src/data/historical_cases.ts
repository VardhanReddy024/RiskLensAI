import { HistoricalFraudCase } from '../types';

export const HISTORICAL_FRAUD_CASES: HistoricalFraudCase[] = [
  {
    id: 'case-vector-8901',
    caseNumber: 'SEC-2025-0891',
    title: 'Distributed Card-Not-Present Credential Stuffing Attack',
    fraudType: 'Card-Not-Present (CNP) Velocity',
    incidentDate: '2025-11-14',
    similarityScore: 0.94,
    vectorDistance: 0.082,
    matchedTraits: [
      'Rapid velocity (<45s inter-arrival time)',
      'Residential Proxy exit nodes (Luminati/BrightData)',
      'High-value electronics merchant category',
      'Unrecognized browser user-agent hash'
    ],
    preventedLossAmount: 142500,
    historicalActionTaken: 'BLOCKED',
    keyTakeaway: 'Botnet cycled through 380 compromised cards within 12 minutes before adaptive velocity rules halted checkout flow.',
    mitigationPlaybook: 'Trigger immediate Card Network Fraud Alert (TC40/SAFE), enforce step-up WebAuthn biometric challenge, and blackhole IP subnet.',
    vectorEmbeddingSummary: 'high_velocity + proxy_ip + cnp_electronics + device_anomaly_score_92'
  },
  {
    id: 'case-vector-7412',
    caseNumber: 'SEC-2025-0412',
    title: 'Impossible Travel & Session Hijack Account Takeover (ATO)',
    fraudType: 'Account Takeover (ATO)',
    incidentDate: '2025-09-22',
    similarityScore: 0.91,
    vectorDistance: 0.115,
    matchedTraits: [
      'Impossible physical velocity (>900 km/h between locations)',
      'New device fingerprint with stale session cookie token',
      'Sudden shipping address modification to freight forwarder',
      'Password reset request initiated 4 minutes prior'
    ],
    preventedLossAmount: 89300,
    historicalActionTaken: 'FROZEN',
    keyTakeaway: 'Attacker used session token theft via infostealer malware (RedLine) to bypass SMS 2FA.',
    mitigationPlaybook: 'Revoke all active JWT sessions, freeze linked debit/credit cards, and prompt out-of-band identity re-verification with driver license liveness scan.',
    vectorEmbeddingSummary: 'geo_velocity_1200kmh + infostealer_device_mismatch + instant_address_change'
  },
  {
    id: 'case-vector-6523',
    caseNumber: 'SEC-2025-0623',
    title: 'Synthetic Identity Multi-Account Credit Bust-Out',
    fraudType: 'Synthetic Identity Fraud',
    incidentDate: '2025-07-08',
    similarityScore: 0.88,
    vectorDistance: 0.142,
    matchedTraits: [
      'Recent account creation (<3 months) with pristine credit score',
      'Max credit limit utilization within 48 hours',
      'Shared SSN root with dormant identity profiles',
      'Immediate cash-equivalent wire or crypto purchasing'
    ],
    preventedLossAmount: 235000,
    historicalActionTaken: 'BLOCKED',
    keyTakeaway: 'Synthetic identity ring nurtured credit lines for 90 days before synchronized high-ticket liquidate attempt.',
    mitigationPlaybook: 'Perform LexisNexis identity attribute correlation, freeze beneficiary account, and file FinCEN Suspicious Activity Report (SAR).',
    vectorEmbeddingSummary: 'synthetic_ssn_cluster + credit_maxout_velocity + crypto_onramp'
  },
  {
    id: 'case-vector-5120',
    caseNumber: 'SEC-2025-0120',
    title: 'Micro-Charge Velocity Probe (Card Testing)',
    fraudType: 'Micro-Charge Card Testing',
    incidentDate: '2025-03-19',
    similarityScore: 0.85,
    vectorDistance: 0.178,
    matchedTraits: [
      'Series of $0.50 - $2.00 micro-authorizations across non-profit donation merchants',
      'Automated headless browser headers',
      'Consecutive CVV trial failures before success',
      'Immediate follow-up $4,500 luxury goods authorization attempt'
    ],
    preventedLossAmount: 64200,
    historicalActionTaken: 'BLOCKED',
    keyTakeaway: 'Script tested thousands of leaked BIN records on vulnerable payment gateways prior to large-scale monetization.',
    mitigationPlaybook: 'Implement aggressive rate-limiting on merchant ID, enforce 3D Secure 2.2 on all high-risk BIN ranges, and issue card reissue requests.',
    vectorEmbeddingSummary: 'micro_charge_probe + cvv_retries + instant_spike_luxury'
  },
  {
    id: 'case-vector-4890',
    caseNumber: 'SEC-2025-0994',
    title: 'Mule Account Rapid Fan-In / Fan-Out Wire Splitting',
    fraudType: 'Mule Account Splitting',
    incidentDate: '2025-10-30',
    similarityScore: 0.82,
    vectorDistance: 0.198,
    matchedTraits: [
      'Sudden incoming $50k wire to historically low-balance student account',
      'Immediate subsequent splitting into 12 peer-to-peer micro transfers under $3,000 (Structuring)',
      'Multiple unverified crypto gateway accounts as endpoints',
      'Access from public Wi-Fi & commercial VPN'
    ],
    preventedLossAmount: 310000,
    historicalActionTaken: 'FROZEN',
    keyTakeaway: 'Coordinated money mule network recruited via social media job scam to launder BEC (Business Email Compromise) proceeds.',
    mitigationPlaybook: 'Place immediate 72-hour regulatory hold on outgoing wire rails, notify correspondent bank, and submit mandatory AML Form SAR-01.',
    vectorEmbeddingSummary: 'mule_structuring_fanout + sudden_balance_spike + p2p_velocity'
  },
  {
    id: 'case-vector-3310',
    caseNumber: 'SEC-2025-0310',
    title: 'High-Value Cryptocurrency Exchange Drain via SIM Swap',
    fraudType: 'High-Value Cryptocurrency Drain',
    incidentDate: '2025-05-15',
    similarityScore: 0.79,
    vectorDistance: 0.231,
    matchedTraits: [
      'Carrier SIM change event registered in telecommunication registry within 1 hour',
      'Instant authorization of non-custodial wallet destination',
      'New device login from unauthorized operating system (Linux VM)',
      'Immediate transfer of maximum daily limits'
    ],
    preventedLossAmount: 520000,
    historicalActionTaken: 'BLOCKED',
    keyTakeaway: 'Targeted executive SIM-swap enabled attacker to intercept SMS 2FA and initiate crypto transfer.',
    mitigationPlaybook: 'Check carrier SIM-swap API metadata, enforce 24-hour mandatory withdrawal hold on new wallet addresses, require voice callback.',
    vectorEmbeddingSummary: 'sim_swap_telecom_flag + crypto_drain_max_limit + linux_headless_agent'
  }
];
