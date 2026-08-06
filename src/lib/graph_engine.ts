import { Transaction, RiskTier } from '../types';
import { 
  GraphNode, 
  GraphEdge, 
  GraphNodeType, 
  FraudCluster, 
  TimelineEvent, 
  HeatmapRegion, 
  ShortestPathResult 
} from '../types/graph';
import { HISTORICAL_FRAUD_CASES } from '../data/historical_cases';

// Color Palette & Metadata Definition for all 12+ Node Types
export const NODE_TYPE_CONFIG: Record<
  GraphNodeType,
  {
    label: string;
    bgColor: string;
    borderColor: string;
    glowColor: string;
    textColor: string;
    iconName: string;
    defaultRadius: number;
    description: string;
  }
> = {
  transaction: {
    label: 'Transaction',
    bgColor: '#2563eb', // Blue-600
    borderColor: '#60a5fa',
    glowColor: 'rgba(37, 99, 235, 0.4)',
    textColor: '#ffffff',
    iconName: 'CreditCard',
    defaultRadius: 28,
    description: 'Financial exchange and settlement record',
  },
  customer: {
    label: 'Customer',
    bgColor: '#0284c7', // Sky-600
    borderColor: '#38bdf8',
    glowColor: 'rgba(2, 132, 199, 0.35)',
    textColor: '#ffffff',
    iconName: 'User',
    defaultRadius: 24,
    description: 'Account holder identity persona',
  },
  account: {
    label: 'Account',
    bgColor: '#059669', // Emerald-600
    borderColor: '#34d399',
    glowColor: 'rgba(5, 150, 105, 0.35)',
    textColor: '#ffffff',
    iconName: 'Landmark',
    defaultRadius: 22,
    description: 'Financial ledger / bank account',
  },
  merchant: {
    label: 'Merchant',
    bgColor: '#7c3aed', // Violet-600
    borderColor: '#a78bfa',
    glowColor: 'rgba(124, 58, 237, 0.35)',
    textColor: '#ffffff',
    iconName: 'Store',
    defaultRadius: 22,
    description: 'Commercial point of sale gateway',
  },
  device: {
    label: 'Device',
    bgColor: '#ea580c', // Orange-600
    borderColor: '#fb923c',
    glowColor: 'rgba(234, 88, 12, 0.35)',
    textColor: '#ffffff',
    iconName: 'Smartphone',
    defaultRadius: 20,
    description: 'Hardware fingerprint and OS profile',
  },
  ip_address: {
    label: 'IP Address',
    bgColor: '#dc2626', // Red-600
    borderColor: '#f87171',
    glowColor: 'rgba(220, 38, 38, 0.4)',
    textColor: '#ffffff',
    iconName: 'Globe',
    defaultRadius: 20,
    description: 'Network ingress routing and proxy ASN',
  },
  location: {
    label: 'Location',
    bgColor: '#0d9488', // Teal-600
    borderColor: '#2dd4bf',
    glowColor: 'rgba(13, 148, 136, 0.35)',
    textColor: '#ffffff',
    iconName: 'MapPin',
    defaultRadius: 20,
    description: 'Geographical coordinate and city zone',
  },
  phone: {
    label: 'Phone Number',
    bgColor: '#d97706', // Amber-600
    borderColor: '#fbbf24',
    glowColor: 'rgba(217, 119, 6, 0.35)',
    textColor: '#ffffff',
    iconName: 'Phone',
    defaultRadius: 18,
    description: 'Telephony verification line / SMS route',
  },
  email: {
    label: 'Email',
    bgColor: '#4f46e5', // Indigo-600
    borderColor: '#818cf8',
    glowColor: 'rgba(79, 70, 229, 0.35)',
    textColor: '#ffffff',
    iconName: 'Mail',
    defaultRadius: 18,
    description: 'Digital mailbox and account login email',
  },
  beneficiary: {
    label: 'Beneficiary Account',
    bgColor: '#c026d3', // Fuchsia-600
    borderColor: '#e879f9',
    glowColor: 'rgba(192, 38, 211, 0.35)',
    textColor: '#ffffff',
    iconName: 'ArrowRightLeft',
    defaultRadius: 22,
    description: 'Receiving destination and mule account',
  },
  historical_case: {
    label: 'Historical Fraud Case',
    bgColor: '#be123c', // Rose-700
    borderColor: '#fb7185',
    glowColor: 'rgba(190, 18, 60, 0.45)',
    textColor: '#ffffff',
    iconName: 'ShieldAlert',
    defaultRadius: 24,
    description: 'Indexed prior incident in vector memory',
  },
  fraud_ring: {
    label: 'Known Fraud Ring',
    bgColor: '#7f1d1d', // Red-900 (High-threat syndicate)
    borderColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    textColor: '#ffffff',
    iconName: 'Skull',
    defaultRadius: 30,
    description: 'Organized criminal cyber syndicate',
  },
  ai_recommendation: {
    label: 'AI Recommendation',
    bgColor: '#0f172a', // Slate-900
    borderColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)',
    textColor: '#ffffff',
    iconName: 'Sparkles',
    defaultRadius: 20,
    description: 'Autonomous multi-agent consensus action',
  },
};

export const AGENT_COLOR_MAP: Record<string, string> = {
  fraud_detection: '#3b82f6', // Blue
  behavioral_analysis: '#10b981', // Emerald
  similar_case_retrieval: '#8b5cf6', // Violet
  explainability: '#a855f7', // Purple
  compliance: '#f59e0b', // Amber
  recommendation: '#06b6d4', // Cyan
  report_generation: '#ec4899', // Pink
  supervisor: '#6366f1', // Indigo
};

export const AGENT_DISPLAY_NAME_MAP: Record<string, string> = {
  fraud_detection: 'Fraud Detector Agent',
  behavioral_analysis: 'Behavior Analysis Agent',
  similar_case_retrieval: 'Historical Case Retrieval Agent',
  explainability: 'Explainability Agent',
  compliance: 'Compliance Agent',
  recommendation: 'Recommendation Agent',
  report_generation: 'Report Agent',
  supervisor: 'Supervisor Agent',
};

/**
 * Builds an interconnected Intelligence Graph around a primary Transaction
 */
export function buildGraphForTransaction(
  transaction: Transaction,
  allTransactions: Transaction[] = []
): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: FraudCluster[];
  timeline: TimelineEvent[];
  heatmap: HeatmapRegion[];
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const timeline: TimelineEvent[] = [];
  const heatmap: HeatmapRegion[] = [];

  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();

  function addNode(node: GraphNode) {
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node);
      nodes.push(node);
    }
  }

  function addEdge(edge: GraphEdge) {
    const key = `${typeof edge.source === 'string' ? edge.source : edge.source.id}->${typeof edge.target === 'string' ? edge.target : edge.target.id}:${edge.relationshipType}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push(edge);
    }
  }

  // 1. Primary Central Transaction Node
  const primaryTxnNode: GraphNode = {
    id: transaction.id,
    label: transaction.id,
    sublabel: `${transaction.currency} ${transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
    type: 'transaction',
    riskScore: transaction.riskScore,
    riskTier: transaction.riskTier,
    confidenceScore: transaction.confidenceScore,
    detectionTime: transaction.timestamp,
    country: transaction.location.country,
    locationDetails: `${transaction.location.city}, ${transaction.location.country}`,
    deviceInfo: {
      id: transaction.device.id,
      os: transaction.device.os,
      browser: transaction.device.browser,
      type: transaction.device.type,
      fingerprintScore: transaction.device.fingerprintScore,
      isEmulator: transaction.device.type === 'Bot/Emulator',
    },
    ipInfo: {
      ip: transaction.ipAddress.ip,
      isTor: transaction.ipAddress.isTor,
      isProxy: transaction.ipAddress.isProxy,
      isVpn: transaction.ipAddress.isVpn,
      proxyRiskScore: transaction.ipAddress.proxyRiskScore,
      country: transaction.ipAddress.country,
      city: transaction.ipAddress.city,
    },
    lastActivity: transaction.timestamp,
    relatedTransactions: [transaction.id],
    aiSummary: `Focal investigation transaction for ${transaction.customerName || transaction.customerId} at ${transaction.merchant}. Evaluated with ${transaction.riskScore}/100 composite risk score.`,
    isCenter: true,
    isHighlighted: true,
    importance: 10,
    rawTransaction: transaction,
  };
  addNode(primaryTxnNode);

  // 2. Customer Node
  const customerId = transaction.customerId;
  const customerName = transaction.customerName || `Customer ${customerId.split('-')[1] || customerId}`;
  const customerNode: GraphNode = {
    id: `CUST-${customerId}`,
    label: customerName,
    sublabel: customerId,
    type: 'customer',
    riskScore: Math.min(100, transaction.riskScore + (transaction.riskTier === 'CRITICAL' ? 5 : 0)),
    riskTier: transaction.riskTier,
    confidenceScore: 0.96,
    country: transaction.location.country,
    customerInfo: {
      id: customerId,
      name: customerName,
      email: transaction.customerEmail || `${customerName.toLowerCase().replace(/[^a-z]/g, '')}@domain.com`,
      phone: `+1 (555) ${Math.floor(100 + Math.random() * 899)}-${Math.floor(1000 + Math.random() * 8999)}`,
      tenureMonths: transaction.customerTenureMonths || 14,
      kycStatus: transaction.riskTier === 'CRITICAL' ? 'FLAGGED' : 'TIER_1',
    },
    lastActivity: transaction.timestamp,
    aiSummary: `Account holder associated with ${customerName}. Tenure is ${transaction.customerTenureMonths || 14} months.`,
    importance: 8,
  };
  addNode(customerNode);

  addEdge({
    id: `EDGE-${transaction.id}-${customerNode.id}`,
    source: transaction.id,
    target: customerNode.id,
    label: 'Same Customer',
    relationshipType: 'SAME_CUSTOMER',
    discoveredByAgent: 'fraud_detection',
    confidence: 0.99,
    riskLevel: transaction.riskTier,
  });

  // 3. Customer Email & Phone Nodes
  const emailNode: GraphNode = {
    id: `EMAIL-${customerNode.customerInfo?.email || 'user@domain.com'}`,
    label: customerNode.customerInfo?.email || 'user@domain.com',
    sublabel: 'Primary Account Email',
    type: 'email',
    riskScore: transaction.riskScore > 70 ? 78 : 25,
    riskTier: transaction.riskScore > 70 ? 'HIGH' : 'LOW',
    confidenceScore: 0.94,
    aiSummary: `Verified registration email for ${customerName}.`,
    importance: 5,
  };
  addNode(emailNode);

  addEdge({
    id: `EDGE-${customerNode.id}-${emailNode.id}`,
    source: customerNode.id,
    target: emailNode.id,
    label: 'Same Email',
    relationshipType: 'SAME_EMAIL',
    discoveredByAgent: 'behavioral_analysis',
    confidence: 0.98,
    riskLevel: emailNode.riskTier,
  });

  const phoneNode: GraphNode = {
    id: `PHONE-${customerNode.customerInfo?.phone || '+1-555-0199'}`,
    label: customerNode.customerInfo?.phone || '+1-555-0199',
    sublabel: 'SMS 2FA Endpoint',
    type: 'phone',
    riskScore: transaction.riskScore > 70 ? 82 : 20,
    riskTier: transaction.riskScore > 70 ? 'HIGH' : 'LOW',
    confidenceScore: 0.92,
    aiSummary: `Primary mobile phone registered for out-of-band alerts and OTP tokens.`,
    importance: 5,
  };
  addNode(phoneNode);

  addEdge({
    id: `EDGE-${customerNode.id}-${phoneNode.id}`,
    source: customerNode.id,
    target: phoneNode.id,
    label: 'Same Phone',
    relationshipType: 'SAME_PHONE',
    discoveredByAgent: 'behavioral_analysis',
    confidence: 0.97,
    riskLevel: phoneNode.riskTier,
  });

  // 4. Device Node
  const deviceNode: GraphNode = {
    id: `DEV-${transaction.device.id}`,
    label: transaction.device.os,
    sublabel: `Trust Score: ${transaction.device.fingerprintScore}/100`,
    type: 'device',
    riskScore: 100 - transaction.device.fingerprintScore,
    riskTier: transaction.device.fingerprintScore < 35 ? 'CRITICAL' : (transaction.device.fingerprintScore < 60 ? 'HIGH' : 'LOW'),
    confidenceScore: 0.95,
    deviceInfo: {
      id: transaction.device.id,
      os: transaction.device.os,
      browser: transaction.device.browser,
      type: transaction.device.type,
      fingerprintScore: transaction.device.fingerprintScore,
      isEmulator: transaction.device.type === 'Bot/Emulator',
    },
    lastActivity: transaction.timestamp,
    aiSummary: `Hardware profile: ${transaction.device.os} (${transaction.device.browser}). Fingerprint entropy score is ${transaction.device.fingerprintScore}/100.`,
    importance: 7,
  };
  addNode(deviceNode);

  addEdge({
    id: `EDGE-${transaction.id}-${deviceNode.id}`,
    source: transaction.id,
    target: deviceNode.id,
    label: 'Uses Same Device',
    relationshipType: 'USES_SAME_DEVICE',
    discoveredByAgent: 'behavioral_analysis',
    confidence: 0.98,
    riskLevel: deviceNode.riskTier,
  });

  // 5. IP Address Node
  const ipNode: GraphNode = {
    id: `IP-${transaction.ipAddress.ip}`,
    label: transaction.ipAddress.ip,
    sublabel: `${transaction.ipAddress.city}, ${transaction.ipAddress.country}`,
    type: 'ip_address',
    riskScore: transaction.ipAddress.proxyRiskScore,
    riskTier: transaction.ipAddress.proxyRiskScore >= 80 ? 'CRITICAL' : (transaction.ipAddress.proxyRiskScore >= 50 ? 'HIGH' : 'LOW'),
    confidenceScore: 0.99,
    country: transaction.ipAddress.country,
    locationDetails: `${transaction.ipAddress.city}, ${transaction.ipAddress.country}`,
    ipInfo: {
      ip: transaction.ipAddress.ip,
      isTor: transaction.ipAddress.isTor,
      isProxy: transaction.ipAddress.isProxy,
      isVpn: transaction.ipAddress.isVpn,
      proxyRiskScore: transaction.ipAddress.proxyRiskScore,
      isp: transaction.ipAddress.isTor ? 'The Onion Router Network' : (transaction.ipAddress.isProxy ? 'DataCenter Proxy ASN-4412' : 'Tier-1 Residential ISP'),
      country: transaction.ipAddress.country,
      city: transaction.ipAddress.city,
    },
    lastActivity: transaction.timestamp,
    aiSummary: `Ingress IP node: ${transaction.ipAddress.ip}. Tor: ${transaction.ipAddress.isTor ? 'TRUE' : 'FALSE'}, Proxy: ${transaction.ipAddress.isProxy ? 'TRUE' : 'FALSE'}.`,
    importance: 8,
  };
  addNode(ipNode);

  addEdge({
    id: `EDGE-${transaction.id}-${ipNode.id}`,
    source: transaction.id,
    target: ipNode.id,
    label: 'Uses Same IP',
    relationshipType: 'USES_SAME_IP',
    discoveredByAgent: 'fraud_detection',
    confidence: 0.99,
    riskLevel: ipNode.riskTier,
  });

  addEdge({
    id: `EDGE-${deviceNode.id}-${ipNode.id}`,
    source: deviceNode.id,
    target: ipNode.id,
    label: 'Shared Device Cluster',
    relationshipType: 'SHARED_DEVICE_CLUSTER',
    discoveredByAgent: 'behavioral_analysis',
    confidence: 0.96,
    riskLevel: ipNode.riskTier,
  });

  // 6. Location Node
  const locationNode: GraphNode = {
    id: `LOC-${transaction.location.city}-${transaction.location.country}`,
    label: `${transaction.location.city}, ${transaction.location.country}`,
    sublabel: `${transaction.location.distanceFromHomeKm} km from domicile`,
    type: 'location',
    riskScore: transaction.location.distanceFromHomeKm > 2000 ? 90 : (transaction.location.distanceFromHomeKm > 500 ? 65 : 20),
    riskTier: transaction.location.distanceFromHomeKm > 2000 ? 'CRITICAL' : (transaction.location.distanceFromHomeKm > 500 ? 'HIGH' : 'LOW'),
    confidenceScore: 0.95,
    country: transaction.location.country,
    locationDetails: `Lat: ${transaction.location.lat.toFixed(4)}, Lon: ${transaction.location.lon.toFixed(4)}`,
    aiSummary: `Geographical execution point for transaction ${transaction.id}. Physical velocity violation detected.`,
    importance: 6,
  };
  addNode(locationNode);

  addEdge({
    id: `EDGE-${transaction.id}-${locationNode.id}`,
    source: transaction.id,
    target: locationNode.id,
    label: 'Same Location',
    relationshipType: 'SAME_LOCATION',
    discoveredByAgent: 'compliance',
    confidence: 0.97,
    riskLevel: locationNode.riskTier,
  });

  // 7. Merchant Node
  const merchantNode: GraphNode = {
    id: `MERCH-${transaction.merchant.replace(/[^a-zA-Z0-9]/g, '_')}`,
    label: transaction.merchant,
    sublabel: transaction.merchantCategory,
    type: 'merchant',
    riskScore: transaction.merchantCategory === 'Crypto Exchange' || transaction.merchantCategory === 'Gaming/Gambling' ? 82 : 35,
    riskTier: transaction.merchantCategory === 'Crypto Exchange' || transaction.merchantCategory === 'Gaming/Gambling' ? 'HIGH' : 'LOW',
    confidenceScore: 0.97,
    merchantInfo: {
      name: transaction.merchant,
      category: transaction.merchantCategory,
      mcc: '6051',
      chargebackRate: 2.8,
    },
    aiSummary: `Merchant destination: ${transaction.merchant} categorized under ${transaction.merchantCategory}.`,
    importance: 7,
  };
  addNode(merchantNode);

  addEdge({
    id: `EDGE-${transaction.id}-${merchantNode.id}`,
    source: transaction.id,
    target: merchantNode.id,
    label: 'Same Merchant',
    relationshipType: 'SAME_MERCHANT',
    discoveredByAgent: 'fraud_detection',
    confidence: 0.99,
    riskLevel: merchantNode.riskTier,
  });

  // 8. Account & Beneficiary Node
  const accountNode: GraphNode = {
    id: `ACC-${transaction.paymentMethod.issuer.replace(/[^a-zA-Z0-9]/g, '_')}-${transaction.paymentMethod.last4}`,
    label: `${transaction.paymentMethod.issuer} •••• ${transaction.paymentMethod.last4}`,
    sublabel: transaction.paymentMethod.type,
    type: 'account',
    riskScore: transaction.riskScore > 75 ? 85 : 30,
    riskTier: transaction.riskScore > 75 ? 'HIGH' : 'LOW',
    confidenceScore: 0.98,
    accountInfo: {
      accountNumber: `•••• ${transaction.paymentMethod.last4}`,
      bankName: transaction.paymentMethod.issuer,
      type: transaction.paymentMethod.type,
      routingNumber: '021000021',
    },
    aiSummary: `Settlement instrument issued by ${transaction.paymentMethod.issuer} in ${transaction.paymentMethod.cardCountry}. 3DS: ${transaction.paymentMethod.is3DSecure ? 'Authenticated' : 'Unsecured'}.`,
    importance: 7,
  };
  addNode(accountNode);

  addEdge({
    id: `EDGE-${customerNode.id}-${accountNode.id}`,
    source: customerNode.id,
    target: accountNode.id,
    label: 'Shared Account Cluster',
    relationshipType: 'SHARED_ACCOUNT_CLUSTER',
    discoveredByAgent: 'behavioral_analysis',
    confidence: 0.99,
    riskLevel: accountNode.riskTier,
  });

  addEdge({
    id: `EDGE-${transaction.id}-${accountNode.id}`,
    source: transaction.id,
    target: accountNode.id,
    label: 'Money Transfer Chain',
    relationshipType: 'MONEY_TRANSFER_CHAIN',
    discoveredByAgent: 'compliance',
    confidence: 0.99,
    amount: transaction.amount,
    currency: transaction.currency,
    riskLevel: accountNode.riskTier,
  });

  // If High Risk or Wire/Crypto, add Beneficiary Mule Account
  if (transaction.riskScore >= 60 || transaction.merchantCategory === 'Crypto Exchange' || transaction.merchantCategory === 'Wire Transfer') {
    const beneficiaryNode: GraphNode = {
      id: `BENEF-MULE-8831`,
      label: 'Offshore Liquidity Mule Vault',
      sublabel: 'Beneficiary Routing #KYC-4091',
      type: 'beneficiary',
      riskScore: 96,
      riskTier: 'CRITICAL',
      confidenceScore: 0.97,
      country: 'Cayman Islands',
      locationDetails: 'George Town, Cayman Islands',
      accountInfo: {
        accountNumber: 'ACC-CY-9948210',
        bankName: 'First Caribbean Private Trust Bank',
        type: 'Offshore Escrow',
      },
      aiSummary: `Target liquidity account flagged in prior FinCEN advisory bulletin for mule account layering.`,
      importance: 8,
    };
    addNode(beneficiaryNode);

    addEdge({
      id: `EDGE-${merchantNode.id}-${beneficiaryNode.id}`,
      source: merchantNode.id,
      target: beneficiaryNode.id,
      label: 'Same Beneficiary',
      relationshipType: 'SAME_BENEFICIARY',
      discoveredByAgent: 'compliance',
      confidence: 0.95,
      riskLevel: 'CRITICAL',
    });

    addEdge({
      id: `EDGE-${transaction.id}-${beneficiaryNode.id}`,
      source: transaction.id,
      target: beneficiaryNode.id,
      label: 'Money Transfer Chain',
      relationshipType: 'MONEY_TRANSFER_CHAIN',
      discoveredByAgent: 'recommendation',
      confidence: 0.94,
      amount: transaction.amount,
      currency: transaction.currency,
      riskLevel: 'CRITICAL',
    });
  }

  // 9. Historical Fraud Case Matches (from Qdrant Vector Memory)
  const matchedCase = HISTORICAL_FRAUD_CASES[0];
  if (matchedCase) {
    const caseNode: GraphNode = {
      id: `CASE-${matchedCase.caseNumber}`,
      label: `${matchedCase.caseNumber}: ${matchedCase.title}`,
      sublabel: `${(matchedCase.similarityScore * 100).toFixed(0)}% Vector Similarity`,
      type: 'historical_case',
      riskScore: 92,
      riskTier: 'CRITICAL',
      confidenceScore: matchedCase.similarityScore,
      historicalCaseInfo: {
        caseNumber: matchedCase.caseNumber,
        title: matchedCase.title,
        fraudType: matchedCase.fraudType,
        similarityScore: matchedCase.similarityScore,
        lossAmount: matchedCase.preventedLossAmount,
      },
      aiSummary: `Historical incident ${matchedCase.caseNumber} (${matchedCase.fraudType}). Action taken: ${matchedCase.historicalActionTaken}. Loss prevented: $${matchedCase.preventedLossAmount.toLocaleString()}.`,
      importance: 8,
    };
    addNode(caseNode);

    addEdge({
      id: `EDGE-${transaction.id}-${caseNode.id}`,
      source: transaction.id,
      target: caseNode.id,
      label: 'Previous Fraud Connection',
      relationshipType: 'PREVIOUS_FRAUD_CONNECTION',
      discoveredByAgent: 'similar_case_retrieval',
      confidence: matchedCase.similarityScore,
      riskLevel: 'CRITICAL',
    });

    addEdge({
      id: `EDGE-${deviceNode.id}-${caseNode.id}`,
      source: deviceNode.id,
      target: caseNode.id,
      label: 'Previous Fraud Connection',
      relationshipType: 'PREVIOUS_FRAUD_CONNECTION',
      discoveredByAgent: 'similar_case_retrieval',
      confidence: 0.91,
      riskLevel: 'CRITICAL',
    });
  }

  // 10. Known Fraud Ring Syndicate Node
  if (transaction.riskScore >= 70) {
    const ringNode: GraphNode = {
      id: `RING-HYDRA-SYNDICATE`,
      label: 'Operation Hydra Syndicate',
      sublabel: 'Organized ATO & Mule Ring',
      type: 'fraud_ring',
      riskScore: 98,
      riskTier: 'CRITICAL',
      confidenceScore: 0.984,
      fraudRingInfo: {
        ringId: 'RING-HYDRA-08',
        name: 'Operation Hydra Syndicate',
        typology: 'Automated Account Takeover & Fast Mule Splitting',
        activeNodesCount: 58,
        estimatedSyndicateLoss: 1485000,
        jurisdictions: ['Nigeria', 'United States', 'Cayman Islands', 'Romania'],
      },
      aiSummary: `Organized cyber fraud syndicate operating coordinated headless emulators, bulletproof proxy infrastructure, and layered mule hops.`,
      importance: 10,
    };
    addNode(ringNode);

    addEdge({
      id: `EDGE-${deviceNode.id}-${ringNode.id}`,
      source: deviceNode.id,
      target: ringNode.id,
      label: 'High Risk Relationship',
      relationshipType: 'HIGH_RISK_RELATIONSHIP',
      discoveredByAgent: 'supervisor',
      confidence: 0.98,
      riskLevel: 'CRITICAL',
    });

    addEdge({
      id: `EDGE-${ipNode.id}-${ringNode.id}`,
      source: ipNode.id,
      target: ringNode.id,
      label: 'High Risk Relationship',
      relationshipType: 'HIGH_RISK_RELATIONSHIP',
      discoveredByAgent: 'supervisor',
      confidence: 0.97,
      riskLevel: 'CRITICAL',
    });
  }

  // 11. AI Autonomous Recommendation Node
  const aiRecNode: GraphNode = {
    id: `AI-REC-${transaction.id}`,
    label: transaction.riskScore >= 75 ? 'EXECUTE REJECT & FREEZE' : (transaction.riskScore >= 40 ? 'HOLD & CHALLENGE 2FA' : 'AUTO-APPROVE'),
    sublabel: `Confidence: ${(transaction.confidenceScore * 100).toFixed(1)}%`,
    type: 'ai_recommendation',
    riskScore: transaction.riskScore,
    riskTier: transaction.riskTier,
    confidenceScore: transaction.confidenceScore,
    aiSummary: `Supervisor Agent consensus directive based on 8 autonomous pipeline checks. Recommended playbook: ${transaction.riskScore >= 75 ? 'PB-ATO-04 (Account Takeover Immediate Freeze)' : 'PB-STD-01'}.`,
    importance: 6,
  };
  addNode(aiRecNode);

  addEdge({
    id: `EDGE-${transaction.id}-${aiRecNode.id}`,
    source: transaction.id,
    target: aiRecNode.id,
    label: 'High Risk Relationship',
    relationshipType: 'HIGH_RISK_RELATIONSHIP',
    discoveredByAgent: 'recommendation',
    confidence: transaction.confidenceScore,
    riskLevel: transaction.riskTier,
  });

  // 12. Connect Second-Degree Related Transactions from the Database
  const relatedOtherTxns = allTransactions
    .filter(t => t.id !== transaction.id)
    .slice(0, 4);

  relatedOtherTxns.forEach((otherTxn, idx) => {
    const otherNode: GraphNode = {
      id: otherTxn.id,
      label: otherTxn.id,
      sublabel: `${otherTxn.currency} ${otherTxn.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      type: 'transaction',
      riskScore: otherTxn.riskScore,
      riskTier: otherTxn.riskTier,
      confidenceScore: otherTxn.confidenceScore,
      detectionTime: otherTxn.timestamp,
      country: otherTxn.location.country,
      locationDetails: `${otherTxn.location.city}, ${otherTxn.location.country}`,
      aiSummary: `Related transaction in customer cluster at ${otherTxn.merchant}.`,
      importance: 7,
      rawTransaction: otherTxn,
    };
    addNode(otherNode);

    // Link by merchant, IP, or customer
    if (otherTxn.merchant === transaction.merchant) {
      addEdge({
        id: `EDGE-${otherTxn.id}-${merchantNode.id}`,
        source: otherTxn.id,
        target: merchantNode.id,
        label: 'Same Merchant',
        relationshipType: 'SAME_MERCHANT',
        discoveredByAgent: 'fraud_detection',
        confidence: 0.99,
        riskLevel: otherTxn.riskTier,
      });
    } else {
      addEdge({
        id: `EDGE-${otherTxn.id}-${deviceNode.id}`,
        source: otherTxn.id,
        target: deviceNode.id,
        label: 'Uses Same Device',
        relationshipType: 'USES_SAME_DEVICE',
        discoveredByAgent: 'behavioral_analysis',
        confidence: 0.94,
        riskLevel: otherTxn.riskTier,
      });
    }
  });

  // 13. High-Risk Cluster Identification
  const clusters: FraudCluster[] = [];
  if (transaction.riskScore >= 70) {
    clusters.push({
      id: 'CLUSTER-HYDRA-ATO',
      name: 'High-Risk Syndicate Cluster: Operation Hydra',
      ringType: 'Coordinated ATO & Mule Syndicate',
      riskScore: 96,
      riskTier: 'CRITICAL',
      nodeIds: nodes.map(n => n.id),
      deviceCount: 1,
      accountCount: 12,
      transactionCount: 38,
      caseCount: 8,
      totalExposure: 248500.0,
      aiAssessment: 'Automated clustering algorithm flagged a tightly linked subgraph sharing device emulator DEV-EMU-9921 across 12 distinct synthetic accounts and 38 velocity transactions.',
      centerNodeId: transaction.id,
      glowingColor: '#ef4444',
    });
  }

  // 14. Build Chronological Timeline
  const baseTime = new Date(transaction.timestamp).getTime();
  timeline.push(
    {
      id: 'TL-1',
      time: new Date(baseTime - 1000 * 60 * 18).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: 'Initial Session Authorization',
      nodeId: customerNode.id,
      entityType: 'customer',
      riskTier: 'LOW',
      riskScore: 15,
      description: `Customer ${customerName} credential login initiated from ${transaction.location.city}.`,
      agent: 'Behavior Analysis Agent',
    },
    {
      id: 'TL-2',
      time: new Date(baseTime - 1000 * 60 * 12).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: 'Hardware Fingerprint Mismatch',
      nodeId: deviceNode.id,
      entityType: 'device',
      riskTier: 'HIGH',
      riskScore: 78,
      description: `Device ID ${transaction.device.id} detected with degraded canvas fingerprint score (${transaction.device.fingerprintScore}/100).`,
      agent: 'Fraud Detector Agent',
    },
    {
      id: 'TL-3',
      time: new Date(baseTime - 1000 * 60 * 6).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: 'Tor Exit Node & Impossible Travel Routing',
      nodeId: ipNode.id,
      entityType: 'ip_address',
      riskTier: 'CRITICAL',
      riskScore: 94,
      description: `IP address ${transaction.ipAddress.ip} verified as proxy/Tor exit node with 9,420 km displacement.`,
      agent: 'Compliance Agent',
    },
    {
      id: 'TL-4',
      time: new Date(baseTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: `High-Velocity Transaction Intercepted`,
      nodeId: transaction.id,
      entityType: 'transaction',
      riskTier: transaction.riskTier,
      riskScore: transaction.riskScore,
      description: `${transaction.currency} ${transaction.amount.toFixed(2)} requested at ${transaction.merchant}. Intercepted by multi-agent consensus.`,
      agent: 'Supervisor Agent',
      amount: transaction.amount,
      currency: transaction.currency,
    },
    {
      id: 'TL-5',
      time: new Date(baseTime + 1000 * 30).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      title: 'Syndicate Ring Correlation (Operation Hydra)',
      nodeId: 'RING-HYDRA-SYNDICATE',
      entityType: 'fraud_ring',
      riskTier: 'CRITICAL',
      riskScore: 98,
      description: 'Historical vector search matched 8 prior incidents and classified as part of Operation Hydra.',
      agent: 'Historical Case Retrieval Agent',
    }
  );

  // 15. Risk Heatmap Regions
  heatmap.push(
    {
      id: 'GEO-NGA',
      name: 'Nigeria (Lagos)',
      type: 'Country',
      lat: 6.5244,
      lng: 3.3792,
      fraudCount: 42,
      totalVolume: 418200,
      avgRiskScore: 92,
      riskTier: 'CRITICAL',
      activeClusters: ['Operation Hydra', 'ShadowPhantom Syndicate'],
      flaggedEntities: 68,
    },
    {
      id: 'GEO-USA-NY',
      name: 'United States (New York)',
      type: 'City',
      lat: 40.7128,
      lng: -74.006,
      fraudCount: 18,
      totalVolume: 184500,
      avgRiskScore: 68,
      riskTier: 'HIGH',
      activeClusters: ['Velox Botnet'],
      flaggedEntities: 34,
    },
    {
      id: 'GEO-CYM',
      name: 'Cayman Islands (George Town)',
      type: 'Country',
      lat: 19.2869,
      lng: -81.3674,
      fraudCount: 14,
      totalVolume: 742000,
      avgRiskScore: 95,
      riskTier: 'CRITICAL',
      activeClusters: ['Mule Vault Escrow Layer'],
      flaggedEntities: 22,
    },
    {
      id: 'GEO-GBR',
      name: 'United Kingdom (London)',
      type: 'City',
      lat: 51.5074,
      lng: -0.1278,
      fraudCount: 9,
      totalVolume: 96000,
      avgRiskScore: 45,
      riskTier: 'MEDIUM',
      activeClusters: ['Card Probe Ring'],
      flaggedEntities: 15,
    },
    {
      id: 'GEO-ROU',
      name: 'Romania (Bucharest)',
      type: 'Country',
      lat: 44.4268,
      lng: 26.1025,
      fraudCount: 26,
      totalVolume: 310000,
      avgRiskScore: 89,
      riskTier: 'CRITICAL',
      activeClusters: ['Bulletproof Proxy ASN-4412'],
      flaggedEntities: 41,
    }
  );

  return { nodes, edges, clusters, timeline, heatmap };
}

/**
 * Generates an Enterprise Realistic Simulated Fraud Ring (High Performance, 100 to 500+ nodes)
 */
export function generateSimulatedFraudRing(scenario: string = 'hydra_mule'): {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: FraudCluster[];
  timeline: TimelineEvent[];
  heatmap: HeatmapRegion[];
  insights: string;
} {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const timeline: TimelineEvent[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const edgeSet = new Set<string>();

  function addNode(n: GraphNode) {
    if (!nodeMap.has(n.id)) {
      nodeMap.set(n.id, n);
      nodes.push(n);
    }
  }

  function addEdge(e: GraphEdge) {
    const key = `${typeof e.source === 'string' ? e.source : e.source.id}->${typeof e.target === 'string' ? e.target : e.target.id}:${e.relationshipType}`;
    if (!edgeSet.has(key)) {
      edgeSet.add(key);
      edges.push(e);
    }
  }

  // 1. Central Syndicate Node
  const syndicateRing: GraphNode = {
    id: 'RING-OP-HYDRA',
    label: 'Operation Hydra Syndicate',
    sublabel: 'Automated Mule Ring #HYDRA-99',
    type: 'fraud_ring',
    riskScore: 99,
    riskTier: 'CRITICAL',
    confidenceScore: 0.988,
    country: 'International',
    locationDetails: 'Distributed across 5 Jurisdictions',
    fraudRingInfo: {
      ringId: 'HYDRA-09',
      name: 'Operation Hydra Syndicate',
      typology: 'Automated Account Takeover & Fast Mule Splitting',
      activeNodesCount: 124,
      estimatedSyndicateLoss: 2840000,
      jurisdictions: ['Nigeria', 'United States', 'Cayman Islands', 'Romania', 'Russia'],
    },
    aiSummary: 'Global organized fraud syndicate orchestrating simultaneous emulator cluster logins, proxy tunneling, and automated micro-splits.',
    isCenter: true,
    isHighlighted: true,
    importance: 10,
  };
  addNode(syndicateRing);

  // 2. Primary Shared Device & IP Clusters
  const masterDevice: GraphNode = {
    id: 'DEV-EMU-HYDRA-MASTER',
    label: 'Android 14 (Bluestacks VM Cluster)',
    sublabel: 'Hardware ID: 0x98FA-41B0',
    type: 'device',
    riskScore: 98,
    riskTier: 'CRITICAL',
    confidenceScore: 0.97,
    deviceInfo: {
      id: 'DEV-EMU-HYDRA-MASTER',
      os: 'Android 14 VM',
      browser: 'Chrome 122 Headless',
      type: 'Bot/Emulator',
      fingerprintScore: 12,
      isEmulator: true,
    },
    aiSummary: 'Master headless emulator instance executing automated credential stuffing and velocity transfers.',
    importance: 9,
  };
  addNode(masterDevice);

  addEdge({
    id: 'E-RING-DEV',
    source: syndicateRing.id,
    target: masterDevice.id,
    label: 'Shared Device Cluster',
    relationshipType: 'SHARED_DEVICE_CLUSTER',
    discoveredByAgent: 'supervisor',
    confidence: 0.99,
    riskLevel: 'CRITICAL',
  });

  const masterIP: GraphNode = {
    id: 'IP-197-210-226-45',
    label: '197.210.226.45 (Tor Exit / Proxy)',
    sublabel: 'Lagos, Nigeria (ASN-4412)',
    type: 'ip_address',
    riskScore: 96,
    riskTier: 'CRITICAL',
    confidenceScore: 0.99,
    country: 'Nigeria',
    locationDetails: 'Lagos, Nigeria',
    ipInfo: {
      ip: '197.210.226.45',
      isTor: true,
      isProxy: true,
      isVpn: true,
      proxyRiskScore: 96,
      isp: 'Bulletproof Darknet Relay ASN-4412',
    },
    aiSummary: 'Bulletproof relay node facilitating anonymized ingress for automated bot accounts.',
    importance: 9,
  };
  addNode(masterIP);

  addEdge({
    id: 'E-DEV-IP',
    source: masterDevice.id,
    target: masterIP.id,
    label: 'Uses Same IP',
    relationshipType: 'USES_SAME_IP',
    discoveredByAgent: 'fraud_detection',
    confidence: 0.99,
    riskLevel: 'CRITICAL',
  });

  // 3. Generate 12 Suspicious Synthetic Accounts & Customers
  const customerNames = [
    'Marcus Vance', 'Elena Rostova', 'Darius Sterling', 'Chloe Zhao',
    'Amara Okafor', 'Victor Santos', 'Liam Montgomery', 'Sophia Chen',
    'Tariq Al-Mansoor', 'Katarina Novak', 'Andre Dubois', 'Sarah Jenkins'
  ];

  const merchantNames = [
    'CryptoBit Global Gateway', 'FastCash Remit Wire', 'LuxuryTime Chronos',
    'CoinFlow Settlement LLC', 'Nexus Exchange Gateway', 'Apex Bullion & Gold'
  ];

  customerNames.forEach((name, i) => {
    const custId = `CUST-HYDRA-${100 + i}`;
    const custNode: GraphNode = {
      id: custId,
      label: name,
      sublabel: `Mule Persona #${i + 1}`,
      type: 'customer',
      riskScore: 88 + (i % 12),
      riskTier: 'CRITICAL',
      confidenceScore: 0.94,
      customerInfo: {
        id: custId,
        name,
        email: `${name.toLowerCase().replace(/[^a-z]/g, '')}.mule${i}@ghostmail.net`,
        phone: `+1 (555) ${800 + i}-99${i}`,
        tenureMonths: 1 + (i % 4),
        kycStatus: 'SYNTHETIC_SUSPECT',
      },
      aiSummary: `Synthetic identity created to execute rapid micro-deposits and wire drain.`,
      importance: 7,
    };
    addNode(custNode);

    // Link customer to master device
    addEdge({
      id: `E-CUST-${i}-DEV`,
      source: custNode.id,
      target: masterDevice.id,
      label: 'Uses Same Device',
      relationshipType: 'USES_SAME_DEVICE',
      discoveredByAgent: 'behavioral_analysis',
      confidence: 0.96,
      riskLevel: 'CRITICAL',
    });

    // Create Account for each customer
    const accId = `ACC-MULE-${200 + i}`;
    const accNode: GraphNode = {
      id: accId,
      label: `Account •••• ${7000 + i}`,
      sublabel: i % 2 === 0 ? 'JPMorgan Chase' : 'Citibank N.A.',
      type: 'account',
      riskScore: 90,
      riskTier: 'CRITICAL',
      confidenceScore: 0.96,
      accountInfo: {
        accountNumber: `•••• ${7000 + i}`,
        bankName: i % 2 === 0 ? 'JPMorgan Chase' : 'Citibank N.A.',
        type: 'Checking',
      },
      importance: 6,
    };
    addNode(accNode);

    addEdge({
      id: `E-CUST-ACC-${i}`,
      source: custNode.id,
      target: accNode.id,
      label: 'Shared Account Cluster',
      relationshipType: 'SHARED_ACCOUNT_CLUSTER',
      discoveredByAgent: 'behavioral_analysis',
      confidence: 0.99,
      riskLevel: 'CRITICAL',
    });

    // Create 3 Transactions per Customer (Total ~36 transactions)
    for (let t = 1; t <= 3; t++) {
      const txnId = `TXN-HYDRA-${i * 3 + t}`;
      const amount = 4200 + (i * 350) + (t * 800);
      const merchant = merchantNames[(i + t) % merchantNames.length];
      const txnNode: GraphNode = {
        id: txnId,
        label: txnId,
        sublabel: `$${amount.toLocaleString()}`,
        type: 'transaction',
        riskScore: 92 + (t % 8),
        riskTier: 'CRITICAL',
        confidenceScore: 0.98,
        detectionTime: new Date(Date.now() - 1000 * 60 * (i * 10 + t * 2)).toISOString(),
        country: i % 2 === 0 ? 'Nigeria' : 'United States',
        locationDetails: i % 2 === 0 ? 'Lagos, Nigeria' : 'New York, USA',
        aiSummary: `Coordinated velocity transfer of $${amount.toLocaleString()} destined for ${merchant}.`,
        importance: 6,
        rawTransaction: {
          id: txnId,
          customerId: custId,
          customerName: name,
          amount,
          currency: 'USD',
          merchant,
          merchantCategory: 'Crypto Exchange',
          timestamp: new Date(Date.now() - 1000 * 60 * (i * 10 + t * 2)).toISOString(),
          location: {
            city: i % 2 === 0 ? 'Lagos' : 'New York',
            country: i % 2 === 0 ? 'Nigeria' : 'United States',
            lat: 6.5244,
            lon: 3.3792,
            distanceFromHomeKm: 9420,
          },
          device: {
            id: 'DEV-EMU-HYDRA-MASTER',
            type: 'Bot/Emulator',
            os: 'Android 14 VM',
            browser: 'Chrome Headless',
            fingerprintScore: 18,
            isKnownCustomerDevice: false,
          },
          ipAddress: {
            ip: '197.210.226.45',
            country: 'Nigeria',
            city: 'Lagos',
            isVpn: true,
            isTor: true,
            isProxy: true,
            proxyRiskScore: 96,
          },
          paymentMethod: {
            type: 'Wire Transfer',
            last4: String(7000 + i),
            issuer: 'JPMorgan Chase',
            cardCountry: 'United States',
            is3DSecure: false,
          },
          riskScore: 94,
          fraudProbability: 0.97,
          confidenceScore: 0.98,
          riskTier: 'CRITICAL',
          status: 'flagged',
          tags: ['Syndicate Mule', 'Emulator Velocity', 'Tor Ingress'],
          flagReasons: ['Syndicate cluster connection detected to Operation Hydra'],
        },
      };
      addNode(txnNode);

      addEdge({
        id: `E-TXN-ACC-${txnId}`,
        source: txnNode.id,
        target: accNode.id,
        label: 'Money Transfer Chain',
        relationshipType: 'MONEY_TRANSFER_CHAIN',
        discoveredByAgent: 'compliance',
        confidence: 0.99,
        amount,
        riskLevel: 'CRITICAL',
      });
    }
  });

  // 4. Create Merchant Nodes
  merchantNames.forEach((mName, mIdx) => {
    const mId = `MERCH-HYDRA-${mIdx}`;
    const mNode: GraphNode = {
      id: mId,
      label: mName,
      sublabel: 'Crypto / Wire Liquidity',
      type: 'merchant',
      riskScore: 86,
      riskTier: 'HIGH',
      confidenceScore: 0.97,
      merchantInfo: {
        name: mName,
        category: 'Crypto Exchange',
        mcc: '6051',
        chargebackRate: 3.4,
      },
      importance: 8,
    };
    addNode(mNode);

    addEdge({
      id: `E-RING-MERCH-${mIdx}`,
      source: syndicateRing.id,
      target: mNode.id,
      label: 'Same Merchant',
      relationshipType: 'SAME_MERCHANT',
      discoveredByAgent: 'fraud_detection',
      confidence: 0.96,
      riskLevel: 'HIGH',
    });
  });

  // 5. Create 8 Historical Fraud Cases in Vector Memory
  HISTORICAL_FRAUD_CASES.forEach((hCase, cIdx) => {
    const caseId = `CASE-${hCase.caseNumber}`;
    const cNode: GraphNode = {
      id: caseId,
      label: `${hCase.caseNumber}: ${hCase.title}`,
      sublabel: `${(hCase.similarityScore * 100).toFixed(0)}% Vector Match`,
      type: 'historical_case',
      riskScore: 94,
      riskTier: 'CRITICAL',
      confidenceScore: hCase.similarityScore,
      historicalCaseInfo: {
        caseNumber: hCase.caseNumber,
        title: hCase.title,
        fraudType: hCase.fraudType,
        similarityScore: hCase.similarityScore,
        lossAmount: hCase.preventedLossAmount,
      },
      aiSummary: `Historical incident ${hCase.caseNumber} linked to syndicate topology. Loss prevented: $${hCase.preventedLossAmount.toLocaleString()}.`,
      importance: 7,
    };
    addNode(cNode);

    addEdge({
      id: `E-RING-CASE-${cIdx}`,
      source: syndicateRing.id,
      target: cNode.id,
      label: 'Previous Fraud Connection',
      relationshipType: 'PREVIOUS_FRAUD_CONNECTION',
      discoveredByAgent: 'similar_case_retrieval',
      confidence: hCase.similarityScore,
      riskLevel: 'CRITICAL',
    });
  });

  // 6. Define Master Clusters
  const clusters: FraudCluster[] = [
    {
      id: 'CLUSTER-HYDRA-CORE',
      name: 'Operation Hydra Syndicate Core',
      ringType: 'Automated Account Takeover & Fast Mule Splitting',
      riskScore: 99,
      riskTier: 'CRITICAL',
      nodeIds: nodes.map(n => n.id),
      deviceCount: 1,
      accountCount: 12,
      transactionCount: 38,
      caseCount: 8,
      totalExposure: 348250.0,
      aiAssessment: 'Live Graph AI detected a high-density coordinated fraud ring utilizing 1 master emulator instance (DEV-EMU-HYDRA-MASTER) to control 12 mule identities and siphon capital through 6 crypto exchanges.',
      centerNodeId: syndicateRing.id,
      glowingColor: '#ef4444',
    },
    {
      id: 'CLUSTER-OFFSHORE-VAULT',
      name: 'Cayman Mule Layering Vaults',
      ringType: 'Offshore Escrow Funneling',
      riskScore: 95,
      riskTier: 'CRITICAL',
      nodeIds: nodes.filter(n => n.type === 'beneficiary' || n.type === 'merchant').map(n => n.id),
      deviceCount: 0,
      accountCount: 6,
      transactionCount: 18,
      caseCount: 4,
      totalExposure: 680000.0,
      aiAssessment: 'Secondary laundering loop detected routing rapid settlements to offshore trusts in George Town, Cayman Islands.',
      centerNodeId: 'MERCH-HYDRA-0',
      glowingColor: '#f97316',
    }
  ];

  // 7. Simulated Timeline
  const now = Date.now();
  timeline.push(
    {
      id: 'TL-HYDRA-1',
      time: '10:31:00',
      title: 'Headless Emulator Instance Bootstrapped',
      nodeId: masterDevice.id,
      entityType: 'device',
      riskTier: 'HIGH',
      riskScore: 82,
      description: 'Bluestacks VM Cluster initialized with spoofed canvas fingerprint.',
      agent: 'Fraud Detector Agent',
    },
    {
      id: 'TL-HYDRA-2',
      time: '10:33:15',
      title: 'Tor Exit Node Tunneling Established',
      nodeId: masterIP.id,
      entityType: 'ip_address',
      riskTier: 'CRITICAL',
      riskScore: 96,
      description: 'Ingress traffic routed through bulletproof relay ASN-4412 in Lagos, Nigeria.',
      agent: 'Compliance Agent',
    },
    {
      id: 'TL-HYDRA-3',
      time: '10:36:40',
      title: '12 Synthetic Mule Accounts Authenticated',
      nodeId: 'CUST-HYDRA-100',
      entityType: 'customer',
      riskTier: 'CRITICAL',
      riskScore: 94,
      description: 'Simultaneous API credential authentication across 12 synthetic customer personas.',
      agent: 'Behavior Analysis Agent',
    },
    {
      id: 'TL-HYDRA-4',
      time: '10:38:20',
      title: 'Rapid Micro-Split Wire Transfers Intercepted',
      nodeId: 'TXN-HYDRA-1',
      entityType: 'transaction',
      riskTier: 'CRITICAL',
      riskScore: 98,
      description: '38 concurrent velocity transactions intercepted totaling $348,250.00.',
      agent: 'Recommendation Agent',
      amount: 348250,
      currency: 'USD',
    },
    {
      id: 'TL-HYDRA-5',
      time: '10:40:00',
      title: 'Operation Hydra Fraud Ring Syndicate Confirmed',
      nodeId: syndicateRing.id,
      entityType: 'fraud_ring',
      riskTier: 'CRITICAL',
      riskScore: 99,
      description: 'Supervisor Agent consensus confirmed high-risk syndicate match with 98.8% confidence.',
      agent: 'Supervisor Agent',
    }
  );

  const heatmap: HeatmapRegion[] = [
    {
      id: 'GEO-HYDRA-NGA',
      name: 'Nigeria (Lagos Hub)',
      type: 'Country',
      lat: 6.5244,
      lng: 3.3792,
      fraudCount: 38,
      totalVolume: 348250,
      avgRiskScore: 96,
      riskTier: 'CRITICAL',
      activeClusters: ['Operation Hydra Syndicate'],
      flaggedEntities: 54,
    },
    {
      id: 'GEO-HYDRA-CYM',
      name: 'Cayman Islands (Offshore Vaults)',
      type: 'Country',
      lat: 19.2869,
      lng: -81.3674,
      fraudCount: 22,
      totalVolume: 680000,
      avgRiskScore: 95,
      riskTier: 'CRITICAL',
      activeClusters: ['Cayman Mule Layering Vaults'],
      flaggedEntities: 28,
    },
    {
      id: 'GEO-HYDRA-USA',
      name: 'United States (Compromised Banks)',
      type: 'Country',
      lat: 40.7128,
      lng: -74.006,
      fraudCount: 16,
      totalVolume: 195000,
      avgRiskScore: 88,
      riskTier: 'HIGH',
      activeClusters: ['Operation Hydra Syndicate'],
      flaggedEntities: 31,
    }
  ];

  const insights = `Graph Intelligence Engine identified an organized fraud ring (Operation Hydra) linking 1 shared emulator cluster (DEV-EMU-HYDRA-MASTER) across 12 synthetic customer personas, 38 velocity transactions, and 8 historical vector matches. Total capital at risk: $348,250.00. Multi-agent consensus confidence: 98.8%. Immediate automated containment executed.`;

  return { nodes, edges, clusters, timeline, heatmap, insights };
}

/**
 * Dijkstra / Breadth-First Shortest Path Finder between two Entities in the Graph
 */
export function findShortestPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  startNodeId: string,
  endNodeId: string
): ShortestPathResult | null {
  if (!startNodeId || !endNodeId || startNodeId === endNodeId) {
    return null;
  }

  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const startNode = nodeMap.get(startNodeId);
  const endNode = nodeMap.get(endNodeId);
  if (!startNode || !endNode) return null;

  // Build adjacency list
  const adj = new Map<string, Array<{ neighborId: string; edgeId: string; weight: number }>>();
  nodes.forEach(n => adj.set(n.id, []));

  edges.forEach(e => {
    const sId = typeof e.source === 'string' ? e.source : e.source.id;
    const tId = typeof e.target === 'string' ? e.target : e.target.id;
    if (adj.has(sId) && adj.has(tId)) {
      adj.get(sId)!.push({ neighborId: tId, edgeId: e.id, weight: 1 });
      adj.get(tId)!.push({ neighborId: sId, edgeId: e.id, weight: 1 });
    }
  });

  // BFS / Dijkstra for shortest hop path
  const queue: string[] = [startNodeId];
  const visited = new Set<string>([startNodeId]);
  const parentNode = new Map<string, string>();
  const parentEdge = new Map<string, string>();

  let found = false;
  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr === endNodeId) {
      found = true;
      break;
    }

    const neighbors = adj.get(curr) || [];
    for (const { neighborId, edgeId } of neighbors) {
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        parentNode.set(neighborId, curr);
        parentEdge.set(neighborId, edgeId);
        queue.push(neighborId);
      }
    }
  }

  if (!found) return null;

  // Reconstruct path
  const pathNodeIds: string[] = [];
  const pathEdgeIds: string[] = [];
  let curr = endNodeId;

  while (curr !== startNodeId) {
    pathNodeIds.unshift(curr);
    const edgeId = parentEdge.get(curr);
    if (edgeId) pathEdgeIds.unshift(edgeId);
    curr = parentNode.get(curr)!;
  }
  pathNodeIds.unshift(startNodeId);

  const intermediateEntities = pathNodeIds
    .map(id => nodeMap.get(id)!)
    .filter(Boolean);

  const totalRiskScore = intermediateEntities.reduce((sum, n) => sum + (n.riskScore || 0), 0);

  return {
    pathNodeIds,
    pathEdgeIds,
    totalHops: pathNodeIds.length - 1,
    totalRiskScore,
    intermediateEntities,
  };
}
