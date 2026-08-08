import { describe, it, expect } from 'vitest';
import { 
  buildGraphForTransaction, 
  generateSimulatedFraudRing, 
  findShortestPath, 
  NODE_TYPE_CONFIG 
} from '../lib/graph_engine';
import { Transaction } from '../types';

describe('Graph Intelligence Engine & Shortest Path Graph Algorithms', () => {
  const sampleTxn: Transaction = {
    id: 'TXN-7788',
    customerId: 'CUST-3341',
    customerName: 'Elena Rostova',
    amount: 8400.00,
    currency: 'USD',
    timestamp: new Date().toISOString(),
    merchant: 'Swiss Bullion Liquidity Vault',
    merchantCategory: 'Wire Transfer',
    location: {
      city: 'Zurich',
      country: 'Switzerland',
      distanceFromHomeKm: 6400,
      lat: 47.3769,
      lon: 8.5417,
    },
    device: {
      id: 'DEV-EMU-09',
      type: 'Bot/Emulator',
      os: 'Android 14 VM',
      browser: 'Headless Chrome',
      isKnownCustomerDevice: false,
      fingerprintScore: 15,
    },
    ipAddress: {
      ip: '185.220.101.5',
      city: 'Zurich',
      country: 'Switzerland',
      isTor: true,
      isProxy: true,
      isVpn: true,
      proxyRiskScore: 99,
    },
    paymentMethod: {
      type: 'Wire Transfer',
      last4: '0098',
      issuer: 'Credit Suisse Banking',
      cardCountry: 'Switzerland',
      is3DSecure: false,
    },
    riskScore: 92,
    fraudProbability: 0.92,
    riskTier: 'CRITICAL',
    status: 'flagged',
    confidenceScore: 0.97,
    tags: ['Tor Exit', 'Wire Transfer', 'Emulator'],
    flagReasons: ['Tor Exit', 'Wire Transfer', 'Emulator'],
  };

  it('buildGraphForTransaction builds a multi-entity connected graph with all required nodes and edges', () => {
    const graph = buildGraphForTransaction(sampleTxn);

    expect(graph).toBeDefined();
    expect(graph.nodes.length).toBeGreaterThanOrEqual(8);
    expect(graph.edges.length).toBeGreaterThanOrEqual(8);
    expect(graph.clusters.length).toBeGreaterThan(0);
    expect(graph.timeline.length).toBeGreaterThan(0);
    expect(graph.heatmap.length).toBeGreaterThan(0);

    // Verify presence of primary node types
    const nodeTypes = new Set(graph.nodes.map(n => n.type));
    expect(nodeTypes.has('transaction')).toBe(true);
    expect(nodeTypes.has('customer')).toBe(true);
    expect(nodeTypes.has('merchant')).toBe(true);
    expect(nodeTypes.has('device')).toBe(true);
    expect(nodeTypes.has('ip_address')).toBe(true);
    expect(nodeTypes.has('location')).toBe(true);
    expect(nodeTypes.has('account')).toBe(true);
    expect(nodeTypes.has('beneficiary')).toBe(true);

    // Verify edge connection validity (sources and targets exist in nodes list)
    const nodeIds = new Set(graph.nodes.map(n => n.id));
    graph.edges.forEach(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      expect(nodeIds.has(sourceId)).toBe(true);
      expect(nodeIds.has(targetId)).toBe(true);
      expect(edge.relationshipType).toBeDefined();
    });
  });

  it('generateSimulatedFraudRing synthesizes large-scale syndicate topology and cluster stats', () => {
    const ring = generateSimulatedFraudRing('hydra_mule');

    expect(ring.nodes.length).toBeGreaterThanOrEqual(20);
    expect(ring.edges.length).toBeGreaterThanOrEqual(20);
    expect(ring.clusters.length).toBeGreaterThan(0);
    expect(ring.insights).toContain('Operation Hydra');

    // Central syndicate node should exist
    const syndicateNode = ring.nodes.find(n => n.type === 'fraud_ring');
    expect(syndicateNode).toBeDefined();
    expect(syndicateNode?.riskScore).toBe(99);
  });

  it('findShortestPath returns optimal route, hop count, and risk accumulation across graph nodes', () => {
    const graph = buildGraphForTransaction(sampleTxn);
    const startNode = graph.nodes.find(n => n.type === 'customer')!;
    const targetNode = graph.nodes.find(n => n.type === 'ip_address')!;

    expect(startNode).toBeDefined();
    expect(targetNode).toBeDefined();

    const pathResult = findShortestPath(graph.nodes, graph.edges, startNode.id, targetNode.id);

    expect(pathResult).not.toBeNull();
    expect(pathResult?.totalHops).toBeGreaterThan(0);
    expect(pathResult?.pathNodeIds[0]).toBe(startNode.id);
    expect(pathResult?.pathNodeIds[pathResult.pathNodeIds.length - 1]).toBe(targetNode.id);
    expect(pathResult?.intermediateEntities.length).toBe(pathResult!.pathNodeIds.length);
    expect(pathResult?.totalRiskScore).toBeGreaterThan(0);
  });

  it('findShortestPath handles edge cases: same start/end, non-existent nodes, and disconnected components', () => {
    const graph = buildGraphForTransaction(sampleTxn);

    // 1. Same node
    const sameResult = findShortestPath(graph.nodes, graph.edges, 'TXN-7788', 'TXN-7788');
    expect(sameResult).toBeNull();

    // 2. Non-existent node
    const nonExistent = findShortestPath(graph.nodes, graph.edges, 'TXN-7788', 'DOES-NOT-EXIST');
    expect(nonExistent).toBeNull();

    // 3. Disconnected isolated node
    const isolatedNode = {
      id: 'ISOLATED-NODE-999',
      label: 'Isolated Entity',
      sublabel: 'No Edges',
      type: 'device' as const,
      riskScore: 50,
      riskTier: 'MEDIUM' as const,
      confidenceScore: 0.8,
      importance: 5,
    };
    const disconnectedResult = findShortestPath(
      [...graph.nodes, isolatedNode],
      graph.edges,
      'TXN-7788',
      'ISOLATED-NODE-999'
    );
    expect(disconnectedResult).toBeNull();
  });

  it('validates node configuration palette styling for all supported node types', () => {
    const types = [
      'transaction',
      'customer',
      'account',
      'merchant',
      'device',
      'ip_address',
      'location',
      'phone',
      'email',
      'beneficiary',
      'fraud_ring',
      'historical_case'
    ] as const;

    types.forEach(t => {
      const config = NODE_TYPE_CONFIG[t];
      expect(config).toBeDefined();
      expect(config.label).toBeDefined();
      expect(config.bgColor).toMatch(/^#|^rgba/);
      expect(config.defaultRadius).toBeGreaterThan(10);
    });
  });
});
