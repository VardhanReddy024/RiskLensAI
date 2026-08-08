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
  status: 'UP' | 'DEGRADED' | 'DOWN';
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
    const isReady = db.isInitialized() && (dbHealth.status === 'connected' || dbHealth.status === 'fallback_memory');

    return {
      isReady,
      data: {
        status: isReady ? 'UP' : 'DEGRADED',
        readiness: isReady,
        service: this.serviceName,
        version: this.version,
        database: dbHealth,
        services: {
          gemini: !!process.env.GEMINI_API_KEY,
          qdrant: true,
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
    return {
      status: 'ok',
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
        qdrant: true,
        ml_engine: true,
        orchestrator: true,
        firestore_repository: true,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

export const healthService = HealthService.getInstance();
