export type FraudTypology = 
  | 'Account Takeover (ATO)'
  | 'Card-Not-Present (CNP) Velocity'
  | 'Synthetic Identity Fraud'
  | 'Mule Account Splitting'
  | 'Geographic Spoofing & VPN Tunneling'
  | 'Micro-Charge Card Testing'
  | 'High-Value Cryptocurrency Drain'
  | 'Friendly Fraud / Chargeback Abuse';

export interface HistoricalFraudCase {
  id: string;
  caseNumber: string;
  title: string;
  fraudType: FraudTypology;
  incidentDate: string;
  similarityScore: number; // 0.00 to 1.00 (cosine similarity)
  vectorDistance: number;
  matchedTraits: string[];
  preventedLossAmount: number;
  historicalActionTaken: 'BLOCKED' | 'FROZEN' | 'DISMISSED' | 'REFUNDED';
  keyTakeaway: string;
  mitigationPlaybook: string;
  vectorEmbeddingSummary: string;
}
