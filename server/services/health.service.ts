/**
 * RiskLens AI - Health & Subsystems Diagnostics Service
 */

import { db } from '../db';

export interface LivenessStatus {
  status: 'UP';
  liveness: true;
  service: string;
  version: string;
  timestamp: string;
}

export interface ReadinessStatus {
  status: 'LIVE' | 'DEGRADED' | 'UNAVAILABLE';
  readiness: boolean;
  service: string;
  version: string;
  database: any;
  services: {
    gemini: boolean;
    qdrant: boolean;
    ml_engine: boolean;
    orchestrator: boolean;
    logger: boolean;
    metrics: boolean;
  };
  timestamp: string;
}

export class HealthService {
  private static instance: HealthService | null = null;
  private readonly serviceName = 'risklens-ai';
  private readonly version = '2.4.0-prod';

  public static getInstance(): HealthService {
    if (!HealthService.instance) {
      HealthService.instance = new HealthService();
    }
    return HealthService.instance;
  }

  public getLiveness(): LivenessStatus {
    return {
      status: 'UP',
      liveness: true,
      service: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString(),
    };
  }

  public async getReadiness(): Promise<{ isReady: boolean; data: ReadinessStatus }> {
    const dbHealth = await db.getHealth();
    const isStrict = process.env.STRICT_DATABASE === 'true' || (process.env.NODE_ENV === 'production' && process.env.DATA_STORE_PROVIDER === 'postgres');

    const isReady = isStrict ? (db.isInitialized() && dbHealth.status === 'connected') : true;

    return {
      isReady,
      data: {
        status: isReady ? 'LIVE' : (dbHealth.status === 'fallback_memory' ? 'DEGRADED' : 'UNAVAILABLE'),
        readiness: isReady,
        service: this.serviceName,
        version: this.version,
        database: dbHealth,
        services: {
          gemini: !!process.env.GEMINI_API_KEY,
          qdrant: Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY),
          ml_engine: true,
          orchestrator: true,
          logger: true,
          metrics: true,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  public async getStandardHealth() {
    const dbHealth = await db.getHealth();
    const isStrict = process.env.STRICT_DATABASE === 'true' || (process.env.NODE_ENV === 'production' && process.env.DATA_STORE_PROVIDER === 'postgres');
    const isHealthy = isStrict ? (db.isInitialized() && dbHealth.status === 'connected') : true;

    return {
      status: isHealthy ? 'LIVE' : (dbHealth.status === 'fallback_memory' ? 'DEGRADED' : 'UNAVAILABLE'),
      legacyStatus: isHealthy ? 'ok' : 'down',
      platform: 'RiskLens AI',
      version: this.version,
      database: {
        status: dbHealth.status,
        adapter: dbHealth.adapter,
        isCloudActive: dbHealth.isCloudActive,
        counts: {
          transactions: dbHealth.transactionsCount,
          auditLogs: dbHealth.auditLogsCount,
          dossiers: dbHealth.dossiersCount,
        },
      },
      services: {
        gemini: !!process.env.GEMINI_API_KEY,
          qdrant: Boolean(process.env.QDRANT_URL && process.env.QDRANT_API_KEY),
        ml_engine: true,
        orchestrator: true,
        firestore_repository: process.env.DATA_STORE_PROVIDER === 'firestore',
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = HealthService.getInstance();
