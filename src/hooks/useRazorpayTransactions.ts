/**
 * useRazorpayTransactions
 *
 * Polling hook that:
 * - Fetches all backend transactions and filters provider === 'razorpay'
 * - Polls every 8 seconds while mounted
 * - Detects newly-arrived Razorpay payments and signals a notification
 * - Cleans up on unmount (no polling leak)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Transaction } from '../types';
import { razorpayApi } from '../lib/api';

export interface UseRazorpayTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  isPolling: boolean;
  error: string | null;
  newPaymentAlert: Transaction | null;
  lastUpdated: Date | null;
  dismissAlert: () => void;
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 8000;

export function useRazorpayTransactions(): UseRazorpayTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [newPaymentAlert, setNewPaymentAlert] = useState<Transaction | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Track known IDs to detect genuinely new payments
  const knownIdsRef = useRef<Set<string>>(new Set());
  const isInitialLoadRef = useRef<boolean>(true);

  const fetchTransactions = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setIsLoading(true);
      else setIsPolling(true);

      const res = await razorpayApi.getTransactions();

      if (!res.ok) {
        throw new Error(`Backend returned ${res.status}`);
      }

      const data = await res.json();
      const all: Transaction[] = data.transactions || [];

      // Filter to Razorpay-only transactions
      const rzpTransactions = all.filter(
        (t) => t.provider === 'razorpay'
      );

      // Detect new payments (skip on very first load to avoid false alerts)
      if (!isInitialLoadRef.current && rzpTransactions.length > 0) {
        const newOnes = rzpTransactions.filter(
          (t) => !knownIdsRef.current.has(t.id)
        );
        if (newOnes.length > 0) {
          // Surface the most recent new payment as the alert
          setNewPaymentAlert(newOnes[0]);
        }
      }

      // Update known IDs set
      rzpTransactions.forEach((t) => knownIdsRef.current.add(t.id));

      setTransactions(rzpTransactions);
      setLastUpdated(new Date());
      setError(null);
      isInitialLoadRef.current = false;
    } catch (err: any) {
      if (isInitial) {
        setError(err?.message || 'Unable to fetch Razorpay transactions');
      }
      // On poll errors, keep the existing data and don't surface an error
    } finally {
      setIsLoading(false);
      setIsPolling(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTransactions(true);
  }, [fetchTransactions]);

  // Polling interval — only starts after initial load completes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions(false);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [fetchTransactions]);

  const refresh = useCallback(async () => {
    await fetchTransactions(false);
  }, [fetchTransactions]);

  const dismissAlert = useCallback(() => {
    setNewPaymentAlert(null);
  }, []);

  return {
    transactions,
    isLoading,
    isPolling,
    error,
    newPaymentAlert,
    lastUpdated,
    dismissAlert,
    refresh,
  };
}
