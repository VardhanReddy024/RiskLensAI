// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseService } from '../../server/db';
import { InMemoryAdapter } from '../../server/db/adapters/InMemoryAdapter';
import { FirestoreAdapter } from '../../server/db/adapters/FirestoreAdapter';
import { TransactionRepository } from '../../server/db/repositories/TransactionRepository';
import { AuditLogRepository } from '../../server/db/repositories/AuditLogRepository';
import { DossierRepository } from '../../server/db/repositories/DossierRepository';
import { INITIAL_TRANSACTIONS } from '../data/sample_datasets';
import { Transaction } from '../types/transaction';
import { InvestigationDossier } from '../types/investigation';

describe('RiskLens AI Persistent Database Layer Suite', () => {
  let db: DatabaseService;
  let inMemoryAdapter: InMemoryAdapter;
  let txRepo: TransactionRepository;
  let auditRepo: AuditLogRepository;
  let dossierRepo: DossierRepository;

  beforeEach(async () => {
    inMemoryAdapter = new InMemoryAdapter();
    await inMemoryAdapter.initialize();

    auditRepo = new AuditLogRepository(inMemoryAdapter);
    txRepo = new TransactionRepository(inMemoryAdapter, auditRepo);
    dossierRepo = new DossierRepository(inMemoryAdapter);

    db = DatabaseService.getInstance();
    await db.initialize();
  });

  describe('1. InMemoryAdapter & Data Safety', () => {
    it('initializes and executes CRUD operations for transactions with clone isolation', async () => {
      const sampleTxn: Transaction = {
        ...INITIAL_TRANSACTIONS[0],
        id: 'TXN-TEST-ISOLATION-01',
        amount: 5400.00,
        status: 'pending',
      };

      // Save
      await inMemoryAdapter.saveTransaction(sampleTxn);
      const retrieved = await inMemoryAdapter.getTransactionById('TXN-TEST-ISOLATION-01');
      expect(retrieved).toBeDefined();
      expect(retrieved?.amount).toBe(5400.00);

      // Verify object clone isolation (modifying original doesn't alter stored)
      sampleTxn.amount = 9999.00;
      const afterMod = await inMemoryAdapter.getTransactionById('TXN-TEST-ISOLATION-01');
      expect(afterMod?.amount).toBe(5400.00);

      // Update
      const updated = await inMemoryAdapter.updateTransaction('TXN-TEST-ISOLATION-01', {
        status: 'approved',
        resolvedBy: 'lead.officer@risklens.ai',
      });
      expect(updated?.status).toBe('approved');
      expect(updated?.resolvedBy).toBe('lead.officer@risklens.ai');

      // Count
      const count = await inMemoryAdapter.countTransactions();
      expect(count).toBeGreaterThanOrEqual(1);

      // Delete
      const deleted = await inMemoryAdapter.deleteTransaction('TXN-TEST-ISOLATION-01');
      expect(deleted).toBe(true);
      const afterDelete = await inMemoryAdapter.getTransactionById('TXN-TEST-ISOLATION-01');
      expect(afterDelete).toBeNull();
    });

    it('handles query filtering by status, tier, search substring, and pagination', async () => {
      await inMemoryAdapter.clearTransactions();
      await inMemoryAdapter.saveTransactionBatch(INITIAL_TRANSACTIONS);

      // Filter by status
      const flagged = await inMemoryAdapter.getAllTransactions({ status: 'flagged' });
      expect(flagged.length).toBeGreaterThan(0);
      flagged.forEach(t => expect(t.status.toLowerCase()).toBe('flagged'));

      // Filter by tier
      const critical = await inMemoryAdapter.getAllTransactions({ tier: 'CRITICAL' });
      expect(critical.length).toBeGreaterThan(0);
      critical.forEach(t => expect(t.riskTier).toBe('CRITICAL'));

      // Search
      const searched = await inMemoryAdapter.getAllTransactions({ search: 'Lagos' });
      expect(searched.length).toBeGreaterThanOrEqual(1);

      // Pagination
      const paginated = await inMemoryAdapter.getAllTransactions({ limit: 2, offset: 0 });
      expect(paginated.length).toBe(2);
    });
  });

  describe('2. AuditLogRepository & Immutable Logging', () => {
    it('creates immutable chronological audit logs with role tagging', async () => {
      const log1 = await auditRepo.log({
        actorEmail: 'compliance@risklens.ai',
        actorRole: 'compliance_officer',
        action: 'HOLD_TRANSACTION',
        targetId: 'TXN-HOLD-001',
        details: 'Held for secondary KYC check.',
        status: 'SUCCESS',
      });

      expect(log1.id).toBeDefined();
      expect(log1.timestamp).toBeDefined();
      expect(log1.action).toBe('HOLD_TRANSACTION');

      const allLogs = await auditRepo.getAll();
      expect(allLogs.length).toBeGreaterThanOrEqual(1);
      expect(allLogs[0].id).toBe(log1.id); // Newest first

      const byTarget = await auditRepo.getByTargetId('TXN-HOLD-001');
      expect(byTarget.length).toBe(1);
      expect(byTarget[0].targetId).toBe('TXN-HOLD-001');
    });

    it('rejects logging with missing required fields', async () => {
      await expect(auditRepo.log({
        actorEmail: 'test@risklens.ai',
        actorRole: 'analyst',
        action: undefined as any,
        targetId: 'TXN-1',
        details: 'test',
        status: 'SUCCESS',
      })).rejects.toThrow();
    });
  });

  describe('3. DossierRepository & Investigation Caching', () => {
    it('stores and retrieves comprehensive investigation dossiers', async () => {
      const mockDossier: InvestigationDossier = {
        id: 'DOSSIER-TEST-99',
        transaction: INITIAL_TRANSACTIONS[0],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        status: 'completed',
        orchestrator: {
          totalDurationMs: 120,
          agentsRun: 8,
          pipelineStage: 'COMPLETED',
          metrics: [],
        },
        fraudDetection: {
          probability: 0.95,
          riskScore: 92,
          riskTier: 'CRITICAL',
          confidence: 0.94,
          modelType: 'Hybrid Ensemble',
        },
        behavioralAnalysis: {
          customerBaselineAvgAmount: 120,
          customerBaselineDailyFrequency: 2,
          amountDeviationMultiplier: 12.5,
          isNewMerchantForCustomer: true,
          isOffHoursTransaction: true,
          velocityLast1Hour: 3,
          velocityLast24Hours: 5,
          geoVelocityKmPerHour: 3400,
          behaviorRiskScore: 90,
          anomaliesDetected: ['Velocity Spike', 'Impossible Travel'],
        },
        similarCases: {
          retrievedCount: 3,
          topMatches: [],
          vectorIndex: 'fraud-cases-v2',
        },
        explainability: {
          plainEnglishSummary: 'Critical risk wire transfer detected.',
          executiveRationale: 'High probability fraud ring.',
          keyRiskDrivers: ['Tor Exit Node', 'High Amount'],
          mitigatingFactors: [],
          shapValues: [],
          analystTakeaway: 'Immediate freeze recommended.',
        },
        compliance: {
          passed: false,
          amlTriggered: true,
          sanctionsMatch: false,
          pepMatch: false,
          sarRequired: true,
          regECompliant: true,
          psd3ScaRequired: true,
          triggeredRules: ['FINCEN_CTR_EXCEEDED'],
          notes: 'SAR generated.',
        },
        recommendation: {
          action: 'REJECT',
          urgency: 'IMMEDIATE',
          confidence: 96,
          reasonCode: 'TOR_EXIT_HIGH_VELOCITY',
          recommendedPlaybook: 'PLAYBOOK-AML-CRITICAL',
          suggestedNextSteps: ['Freeze Account', 'Notify FinCEN'],
          estimatedLossPrevented: 8500,
        },
        report: {
          executiveSummary: 'Automated 8-Agent Investigation Summary.',
          analystDossier: 'Full forensic findings.',
          keyEvidence: ['Tor Proxy IP'],
          estimatedLossPrevented: 8500,
          generatedAt: new Date().toISOString(),
          authorAgent: 'ReportGeneratorAgent',
        },
        chatHistory: [],
      };

      const txnId = mockDossier.transaction.id;
      await dossierRepo.save(txnId, mockDossier);

      const hasDoc = await dossierRepo.has(txnId);
      expect(hasDoc).toBe(true);

      const retrieved = await dossierRepo.get(txnId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('DOSSIER-TEST-99');
      expect(retrieved?.orchestrator.agentsRun).toBe(8);

      const count = await dossierRepo.count();
      expect(count).toBeGreaterThanOrEqual(1);

      await dossierRepo.delete(txnId);
      const afterDelete = await dossierRepo.has(txnId);
      expect(afterDelete).toBe(false);
    });
  });

  describe('4. TransactionRepository & Analytics Aggregator', () => {
    it('aggregates portfolio analytics, loss prevented, and risk tier distributions', async () => {
      await txRepo.clearAll();
      await txRepo.saveBatch(INITIAL_TRANSACTIONS);

      const metrics = await txRepo.getAnalyticsMetrics(5);

      expect(metrics.totalTransactions).toBe(INITIAL_TRANSACTIONS.length);
      expect(metrics.totalVolume).toBeGreaterThan(0);
      expect(metrics.avgRiskScore).toBeGreaterThanOrEqual(0);
      expect(metrics.tierDistribution.critical).toBeDefined();
      expect(metrics.tierDistribution.high).toBeDefined();
      expect(metrics.tierDistribution.medium).toBeDefined();
      expect(metrics.tierDistribution.low).toBeDefined();
      expect(Array.isArray(metrics.recentLogs)).toBe(true);
    });
  });

  describe('5. FirestoreAdapter Initialization & Fallback Resilience', () => {
    it('instantiates FirestoreAdapter with automatic fallback to memory when offline', async () => {
      const firestoreAdapter = new FirestoreAdapter();
      await firestoreAdapter.initialize();

      expect(firestoreAdapter.isInitialized()).toBe(true);
      expect(firestoreAdapter.name).toBe('firestore');

      // Test write and read through adapter
      const testTxn: Transaction = {
        ...INITIAL_TRANSACTIONS[0],
        id: 'TXN-FIRESTORE-ADAPTER-TEST',
        amount: 3200,
      };

      await firestoreAdapter.saveTransaction(testTxn);
      const found = await firestoreAdapter.getTransactionById('TXN-FIRESTORE-ADAPTER-TEST');
      expect(found).toBeDefined();
      expect(found?.amount).toBe(3200);
    });
  });

  describe('6. DatabaseService Singleton & Health Status', () => {
    it('provides centralized singleton access and comprehensive health metrics', async () => {
      const health = await db.getHealth();
      expect(health.status).toBeDefined();
      expect(health.adapter).toBeDefined();
      expect(health.transactionsCount).toBeGreaterThanOrEqual(0);
      expect(health.auditLogsCount).toBeGreaterThanOrEqual(0);
      expect(health.dossiersCount).toBeGreaterThanOrEqual(0);
    });

    it('supports hot-swapping persistence adapters seamlessly', async () => {
      await db.switchAdapter('in-memory');
      const inMemHealth = await db.getHealth();
      expect(inMemHealth.adapter).toBe('in-memory');

      await db.switchAdapter('firestore');
      const firestoreHealth = await db.getHealth();
      expect(firestoreHealth.adapter).toBe('firestore');

      await db.switchAdapter('postgres');
      const pgHealth = await db.getHealth();
      expect(pgHealth.adapter).toBe('postgres');
    });
  });

  describe('7. PgAdapter & PostgreSQL Integration Layer', () => {
    it('initializes PgAdapter with memory fallback when DATABASE_URL is not set', async () => {
      const { PgAdapter } = await import('../../server/db/adapters/PgAdapter');
      const pgAdapter = new PgAdapter();
      await pgAdapter.initialize();

      expect(pgAdapter.isInitialized()).toBe(true);
      expect(pgAdapter.name).toBe('postgres');

      // Writes and reads fall back gracefully
      const testTxn: Transaction = {
        ...INITIAL_TRANSACTIONS[0],
        id: 'TXN-PG-FALLBACK-TEST',
        amount: 8900,
      };

      await pgAdapter.saveTransaction(testTxn);
      const fetched = await pgAdapter.getTransactionById('TXN-PG-FALLBACK-TEST');
      expect(fetched).toBeDefined();
      expect(fetched?.amount).toBe(8900);
    });
  });
});

