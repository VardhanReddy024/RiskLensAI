import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Transaction, RiskTier, TransactionStatus } from '../types';
import { INITIAL_TRANSACTIONS } from '../data/sample_datasets';
import { getRiskTier } from '../lib/utils';
import { evaluateTransactionWithML } from '../lib/ml_engine';

interface TransactionContextType {
  transactions: Transaction[];
  isLoading: boolean;
  isStreaming: boolean;
  streamSpeed: number; // in milliseconds (e.g. 3000ms)
  toggleStreaming: () => void;
  setStreamSpeed: (speed: number) => void;
  addTransaction: (txn: Transaction) => void;
  ingestBatch: (txns: Transaction[]) => Promise<void>;
  resolveTransaction: (id: string, action: 'APPROVE' | 'HOLD' | 'ESCALATE' | 'REJECT', notes?: string) => Promise<void>;
  getTransactionById: (id: string) => Transaction | undefined;
  refreshTransactions: () => Promise<void>;
  
  // Quick metrics
  metrics: {
    totalCount: number;
    flaggedCount: number;
    criticalCount: number;
    approvedCount: number;
    heldCount: number;
    rejectedCount: number;
    totalLossPrevented: number;
    totalVolume: number;
    avgRiskScore: number;
  };
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamSpeed, setStreamSpeed] = useState<number>(3500);

  // Fetch from server or initialize
  const refreshTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/transactions');
      if (res.ok) {
        const data = await res.json();
        if (data.transactions && data.transactions.length > 0) {
          setTransactions(data.transactions);
        }
      }
    } catch (err) {
      console.warn('Using client-side transactions cache:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshTransactions();
  }, [refreshTransactions]);

  const addTransaction = useCallback((txn: Transaction) => {
    setTransactions(prev => [txn, ...prev]);
  }, []);

  const ingestBatch = useCallback(async (newTxns: Transaction[]) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/transactions/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: newTxns })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.transactions) {
          setTransactions(prev => [...newTxns, ...prev]);
          return;
        }
      }
      setTransactions(prev => [...newTxns, ...prev]);
    } catch (err) {
      setTransactions(prev => [...newTxns, ...prev]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resolveTransaction = useCallback(async (
    id: string,
    action: 'APPROVE' | 'HOLD' | 'ESCALATE' | 'REJECT',
    notes?: string
  ) => {
    const statusMap: Record<string, TransactionStatus> = {
      APPROVE: 'approved',
      HOLD: 'held',
      ESCALATE: 'escalated',
      REJECT: 'rejected',
    };

    const targetStatus = statusMap[action];

    // Optimistic UI update
    setTransactions(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          status: targetStatus,
          resolutionNote: notes,
          resolvedAt: new Date().toISOString(),
        };
      }
      return t;
    }));

    try {
      await fetch('/api/actions/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: id,
          action,
          notes,
        })
      });
    } catch (err) {
      console.error('Server sync error for resolution:', err);
    }
  }, []);

  const getTransactionById = useCallback((id: string) => {
    return transactions.find(t => t.id === id);
  }, [transactions]);

  const toggleStreaming = () => {
    setIsStreaming(prev => !prev);
  };

  // Real-time transaction simulation generator
  useEffect(() => {
    if (!isStreaming) return;

    const merchants = [
      { name: 'Apple Store Regent St', cat: 'Electronics' as const, avg: 1400 },
      { name: 'CryptoBit Global Gateway', cat: 'Crypto Exchange' as const, avg: 8500 },
      { name: 'Whole Foods Market #102', cat: 'Grocery' as const, avg: 85 },
      { name: 'Swiss Bullion Direct AG', cat: 'Luxury Goods' as const, avg: 18000 },
      { name: 'BestBuy Online', cat: 'Electronics' as const, avg: 620 },
      { name: 'Target Supercenter', cat: 'Retail' as const, avg: 45 },
      { name: 'Binance P2P Settlement', cat: 'Crypto Exchange' as const, avg: 12000 },
      { name: 'Starbucks Coffee', cat: 'Retail' as const, avg: 12 },
    ];

    const cities = [
      { city: 'San Francisco', country: 'United States', lat: 37.7749, lon: -122.4194, dist: 12 },
      { city: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, dist: 890 },
      { city: 'Lagos', country: 'Nigeria', lat: 6.5244, lon: 3.3792, dist: 9400 },
      { city: 'Bucharest', country: 'Romania', lat: 44.4268, lon: 26.1025, dist: 4200 },
      { city: 'Singapore', country: 'Singapore', lat: 1.3521, lon: 103.8198, dist: 7800 },
      { city: 'New York', country: 'United States', lat: 40.7128, lon: -74.0060, dist: 45 },
    ];

    const interval = setInterval(() => {
      const isAnomalous = Math.random() < 0.35; // 35% chance of suspicious transaction
      const mIdx = Math.floor(Math.random() * merchants.length);
      const merchant = merchants[mIdx];
      const loc = cities[Math.floor(Math.random() * cities.length)];
      
      const amount = isAnomalous 
        ? Math.round(merchant.avg * (2 + Math.random() * 4) * 100) / 100
        : Math.round(merchant.avg * (0.6 + Math.random() * 0.8) * 100) / 100;

      const isEmulator = isAnomalous && Math.random() > 0.4;
      const isProxy = isAnomalous && (loc.dist > 1000 || Math.random() > 0.5);

      const streamId = `TXN-LIVE-${Date.now().toString().slice(-6)}`;
      const customerId = `CUST-${Math.floor(1000 + Math.random() * 9000)}`;

      const draftTxn: Transaction = {
        id: streamId,
        customerId,
        customerName: `Client ${customerId.slice(-4)}`,
        customerEmail: `${customerId.toLowerCase()}@clientmail.org`,
        customerTenureMonths: Math.floor(4 + Math.random() * 40),
        amount,
        currency: 'USD',
        merchant: merchant.name,
        merchantCategory: merchant.cat,
        timestamp: new Date().toISOString(),
        location: {
          city: loc.city,
          country: loc.country,
          lat: loc.lat,
          lon: loc.lon,
          distanceFromHomeKm: isProxy ? loc.dist : 15,
        },
        device: {
          id: `DEV-${Math.floor(1000 + Math.random() * 9000)}`,
          type: isEmulator ? 'Bot/Emulator' : (Math.random() > 0.5 ? 'Mobile' : 'Desktop'),
          os: isEmulator ? 'Linux VM (Headless)' : (Math.random() > 0.5 ? 'iOS 18.2' : 'macOS Sequoia'),
          browser: isEmulator ? 'Headless Chrome' : 'Safari 18',
          fingerprintScore: isEmulator ? 18 : (isProxy ? 50 : 96),
          isKnownCustomerDevice: !isEmulator && !isProxy,
        },
        ipAddress: {
          ip: isProxy ? `185.220.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` : `24.180.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`,
          country: loc.country,
          city: loc.city,
          isVpn: isProxy,
          isTor: isProxy && Math.random() > 0.6,
          isProxy,
          proxyRiskScore: isProxy ? 92 : 8,
        },
        paymentMethod: {
          type: amount > 5000 ? 'Wire Transfer' : 'Credit Card',
          last4: `${Math.floor(1000 + Math.random() * 9000)}`,
          issuer: 'Global Tier-1 Issuer',
          cardCountry: loc.country,
          is3DSecure: !isAnomalous,
        },
        riskScore: 5,
        fraudProbability: 0.05,
        confidenceScore: 0.92,
        riskTier: 'LOW',
        status: 'pending',
        tags: [],
        flagReasons: [],
      };

      // Score with ML engine
      const ml = evaluateTransactionWithML(draftTxn);
      const scoredTxn: Transaction = {
        ...draftTxn,
        riskScore: ml.riskScore,
        fraudProbability: ml.fraudProbability,
        riskTier: ml.riskTier,
        confidenceScore: ml.confidenceScore,
        status: ml.riskScore >= 60 ? 'flagged' : (ml.riskScore >= 30 ? 'pending' : 'approved'),
        estimatedLossPrevented: ml.riskScore >= 60 ? amount : 0,
        tags: ml.riskScore >= 60 ? ['Live Alert', isProxy ? 'Proxy IP' : 'High Amount'] : ['Clean Stream'],
        flagReasons: ml.shapFactors.filter(s => s.impactScore > 15).map(s => s.explanation),
      };

      setTransactions(prev => [scoredTxn, ...prev.slice(0, 99)]);
    }, streamSpeed);

    return () => clearInterval(interval);
  }, [isStreaming, streamSpeed]);

  // Aggregated Metrics
  const metrics = useMemo(() => {
    const totalCount = transactions.length;
    const flaggedCount = transactions.filter(t => t.status === 'flagged').length;
    const criticalCount = transactions.filter(t => t.riskTier === 'CRITICAL').length;
    const approvedCount = transactions.filter(t => t.status === 'approved').length;
    const heldCount = transactions.filter(t => t.status === 'held').length;
    const rejectedCount = transactions.filter(t => t.status === 'rejected').length;
    
    const totalLossPrevented = transactions
      .filter(t => t.status === 'rejected' || t.status === 'held' || t.riskTier === 'CRITICAL')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalVolume = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgRiskScore = totalCount > 0 
      ? Math.round(transactions.reduce((sum, t) => sum + t.riskScore, 0) / totalCount)
      : 0;

    return {
      totalCount,
      flaggedCount,
      criticalCount,
      approvedCount,
      heldCount,
      rejectedCount,
      totalLossPrevented,
      totalVolume,
      avgRiskScore,
    };
  }, [transactions]);

  return (
    <TransactionContext.Provider value={{
      transactions,
      isLoading,
      isStreaming,
      streamSpeed,
      toggleStreaming,
      setStreamSpeed,
      addTransaction,
      ingestBatch,
      resolveTransaction,
      getTransactionById,
      refreshTransactions,
      metrics,
    }}>
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error('useTransactions must be used within a TransactionProvider');
  }
  return context;
}
