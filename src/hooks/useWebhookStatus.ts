/**
 * useWebhookStatus
 *
 * Fetches backend health from the public /api/health endpoint.
 * Refreshes every 30 seconds.
 * Exposes only safe, non-sensitive fields.
 */

import { useState, useEffect, useCallback } from 'react';
import { getBackendHealth, getWebhookUrl } from '../lib/api';

export interface WebhookStatusData {
  isConnected: boolean;
  backendStatus: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
  dbStatus: string;
  dbAdapter: string;
  isCloudActive: boolean;
  transactionCount: number;
  dossiersCount: number;
  services: {
    gemini: boolean;
    qdrant: boolean;
    ml_engine: boolean;
    orchestrator: boolean;
  };
  razorpayWebhookEndpoint: string;
  lastChecked: Date | null;
  version: string;
}

const REFRESH_INTERVAL_MS = 30_000;

const DEFAULT_STATUS: WebhookStatusData = {
  isConnected: false,
  backendStatus: 'UNKNOWN',
  dbStatus: 'unknown',
  dbAdapter: 'unknown',
  isCloudActive: false,
  transactionCount: 0,
  dossiersCount: 0,
  services: {
    gemini: false,
    qdrant: false,
    ml_engine: false,
    orchestrator: false,
  },
  razorpayWebhookEndpoint: getWebhookUrl(),
  lastChecked: null,
  version: '',
};

export function useWebhookStatus() {
  const [status, setStatus] = useState<WebhookStatusData>(DEFAULT_STATUS);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await getBackendHealth();
      if (!res.ok) {
        setStatus((prev) => ({
          ...prev,
          isConnected: false,
          backendStatus: 'DOWN',
          lastChecked: new Date(),
        }));
        return;
      }

      const data = await res.json();

      setStatus({
        isConnected: data.status === 'LIVE',
        backendStatus: data.status === 'LIVE' ? 'UP' : data.status === 'DEGRADED' ? 'DEGRADED' : 'DOWN',
        dbStatus: data.database?.status || 'unknown',
        dbAdapter: data.database?.adapter || 'unknown',
        isCloudActive: !!data.database?.isCloudActive,
        transactionCount: data.database?.counts?.transactions || 0,
        dossiersCount: data.database?.counts?.dossiers || 0,
        services: {
          gemini: !!data.services?.gemini,
          qdrant: !!data.services?.qdrant,
          ml_engine: !!data.services?.ml_engine,
          orchestrator: !!data.services?.orchestrator,
        },
        razorpayWebhookEndpoint: getWebhookUrl(),
        lastChecked: new Date(),
        version: data.version || '',
      });
    } catch {
      setStatus((prev) => ({
        ...prev,
        isConnected: false,
        backendStatus: 'DOWN',
        lastChecked: new Date(),
      }));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const interval = setInterval(fetchStatus, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  return { status, isLoading, refresh: fetchStatus };
}
