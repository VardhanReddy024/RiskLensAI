import { RiskTier, Transaction } from './transaction';
import { AgentId } from './agent';
import { HistoricalFraudCase } from './vector';

export type GraphNodeType =
  | 'transaction'
  | 'customer'
  | 'account'
  | 'merchant'
  | 'device'
  | 'ip_address'
  | 'location'
  | 'phone'
  | 'email'
  | 'beneficiary'
  | 'historical_case'
  | 'fraud_ring'
  | 'ai_recommendation';

export type GraphEdgeType =
  | 'USES_SAME_DEVICE'
  | 'USES_SAME_IP'
  | 'SAME_MERCHANT'
  | 'SAME_BENEFICIARY'
  | 'SAME_CUSTOMER'
  | 'SAME_PHONE'
  | 'SAME_EMAIL'
  | 'SAME_BROWSER_FINGERPRINT'
  | 'SAME_LOCATION'
  | 'PREVIOUS_FRAUD_CONNECTION'
  | 'HIGH_RISK_RELATIONSHIP'
  | 'MONEY_TRANSFER_CHAIN'
  | 'SHARED_DEVICE_CLUSTER'
  | 'SHARED_ACCOUNT_CLUSTER';

export interface GraphNode {
  id: string;
  label: string;
  sublabel?: string;
  type: GraphNodeType;
  category?: string;
  riskScore: number; // 0 - 100
  riskTier: RiskTier;
  confidenceScore?: number;
  detectionTime?: string;
  country?: string;
  locationDetails?: string;
  
  // Specific Entity Telemetry
  deviceInfo?: {
    id: string;
    os: string;
    browser: string;
    type: string;
    fingerprintScore: number;
    isEmulator?: boolean;
  };
  ipInfo?: {
    ip: string;
    isTor: boolean;
    isProxy: boolean;
    isVpn: boolean;
    proxyRiskScore: number;
    isp?: string;
    country?: string;
    city?: string;
  };
  customerInfo?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    tenureMonths: number;
    kycStatus: 'VERIFIED' | 'TIER_1' | 'FLAGGED' | 'SYNTHETIC_SUSPECT';
  };
  accountInfo?: {
    accountNumber: string;
    bankName: string;
    type: string;
    balance?: number;
    routingNumber?: string;
  };
  merchantInfo?: {
    name: string;
    category: string;
    mcc: string;
    chargebackRate: number;
  };
  historicalCaseInfo?: {
    caseNumber: string;
    title: string;
    fraudType: string;
    similarityScore: number;
    lossAmount: number;
  };
  fraudRingInfo?: {
    ringId: string;
    name: string;
    typology: string;
    activeNodesCount: number;
    estimatedSyndicateLoss: number;
    jurisdictions: string[];
  };

  lastActivity?: string;
  historicalCases?: string[];
  relatedTransactions?: string[];
  aiSummary?: string;
  clusterId?: string;
  isCenter?: boolean;
  isHighlighted?: boolean;
  isCollapsed?: boolean;
  importance: number; // 1 - 10 (controls sizing & visual weighting)

  // Raw payload reference if node represents a Transaction
  rawTransaction?: Transaction;

  // D3 Physics Simulation coordinates & velocities
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphEdge {
  id: string;
  source: string | GraphNode;
  target: string | GraphNode;
  label: string;
  relationshipType: GraphEdgeType | string;
  discoveredByAgent: AgentId | 'supervisor' | string;
  confidence: number; // 0.00 - 1.00
  riskLevel: RiskTier;
  isHighlighted?: boolean;
  isPath?: boolean;
  amount?: number;
  currency?: string;
  timestamp?: string;
  details?: string;
}

export interface FraudCluster {
  id: string;
  name: string;
  ringType: string;
  riskScore: number;
  riskTier: RiskTier;
  nodeIds: string[];
  deviceCount: number;
  accountCount: number;
  transactionCount: number;
  caseCount: number;
  totalExposure: number;
  aiAssessment: string;
  centerNodeId: string;
  glowingColor?: string;
}

export interface GraphFilterOptions {
  riskLevels: RiskTier[];
  nodeTypes: GraphNodeType[];
  countries: string[];
  merchants: string[];
  agents: string[];
  fraudRings: string[];
  minAmount: number;
  maxAmount: number;
  minConfidence: number;
  dateRange: 'all' | '1h' | '24h' | '7d' | '30d';
  searchQuery: string;
}

export interface TimelineEvent {
  id: string;
  time: string;
  title: string;
  nodeId: string;
  entityType: GraphNodeType;
  riskTier: RiskTier;
  riskScore: number;
  description: string;
  agent: string;
  amount?: number;
  currency?: string;
}

export interface HeatmapRegion {
  id: string;
  name: string;
  type: 'Country' | 'State' | 'City' | 'Branch';
  lat: number;
  lng: number;
  fraudCount: number;
  totalVolume: number;
  avgRiskScore: number;
  riskTier: RiskTier;
  activeClusters: string[];
  flaggedEntities: number;
}

export interface ShortestPathResult {
  pathNodeIds: string[];
  pathEdgeIds: string[];
  totalHops: number;
  totalRiskScore: number;
  intermediateEntities: GraphNode[];
}

export interface GraphExportData {
  title: string;
  generatedAt: string;
  investigator: string;
  activeTransactionId?: string;
  totalNodes: number;
  totalEdges: number;
  clustersFound: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: FraudCluster[];
  aiInsightsSummary?: string;
}
