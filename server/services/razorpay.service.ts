/**
 * RiskLens AI - Razorpay Service
 * 
 * Handles:
 * - HMAC-SHA256 Webhook signature verification with constant-time comparison
 * - Idempotency tracking (provider + event_id)
 * - Razorpay payment payload normalization into RiskLens Transaction domain
 * - INR / Multi-currency amount scaling (paisa -> rupees)
 * - Controlled tenant / merchant mapping
 * - Existing ML risk engine integration and async investigation triggering
 * - Safe structured logging (zero secret leaks)
 */

import crypto from 'crypto';
import { Transaction } from '../../src/types/transaction';
import { RazorpayWebhookPayload, RazorpayPaymentEntity } from '../types/razorpay';
import { WebhookEventRecord } from '../db/interfaces/IDataStoreAdapter';
import { db } from '../db';
import { serverConfig } from '../config';
import { evaluateTransactionWithML } from '../ml_engine';
import { investigationService } from './investigation.service';
import { metrics } from '../metrics';
import { logger } from '../logger';
import { ValidationError } from '../errors';

export interface WebhookProcessResult {
  success: boolean;
  eventId: string;
  eventType: string;
  status: 'PROCESSED' | 'IGNORED' | 'DUPLICATE' | 'FAILED';
  transactionId?: string;
  idempotent?: boolean;
  message?: string;
}

export class RazorpayService {
  private static instance: RazorpayService | null = null;

  public static getInstance(): RazorpayService {
    if (!RazorpayService.instance) {
      RazorpayService.instance = new RazorpayService();
    }
    return RazorpayService.instance;
  }

  /**
   * Cryptographically verifies Razorpay webhook signature using HMAC-SHA256
   * and timing-safe buffer comparison to prevent timing attacks.
   */
  public verifyWebhookSignature(
    rawBody: Buffer | string | undefined,
    signature: string | undefined,
    secretOverride?: string
  ): boolean {
    const secret = secretOverride || serverConfig.razorpayWebhookSecret;

    if (!secret || secret.trim().length === 0) {
      logger.warn('[RazorpayService] Webhook secret not configured, rejecting signature validation');
      return false;
    }

    if (!rawBody || !signature || signature.trim().length === 0) {
      return false;
    }

    try {
      const payloadBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payloadBuffer)
        .digest('hex');

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const signatureBuf = Buffer.from(signature.trim(), 'utf8');

      if (expectedBuf.length !== signatureBuf.length) {
        return false;
      }

      return crypto.timingSafeEqual(expectedBuf, signatureBuf);
    } catch (err: any) {
      logger.error('[RazorpayService] Exception during signature verification:', { error: err?.message });
      return false;
    }
  }

  /**
   * Derives unique event identifier from webhook headers or payload
   */
  public extractEventId(payload: RazorpayWebhookPayload, headerEventId?: string): string {
    if (headerEventId && headerEventId.trim().length > 0) {
      return headerEventId.trim();
    }
    if (payload.event_id && payload.event_id.trim().length > 0) {
      return payload.event_id.trim();
    }
    const paymentId = payload.payload?.payment?.entity?.id || 'unknown';
    const eventType = payload.event || 'event';
    const createdAt = payload.created_at || Date.now();
    return `evt_${paymentId}_${eventType}_${createdAt}`;
  }

  /**
   * Maps Razorpay webhook event to merchant tenant identity safely
   */
  public resolveTenantId(payload: RazorpayWebhookPayload, payment?: RazorpayPaymentEntity): string {
    // 1. Configured default merchant tenant
    if (serverConfig.razorpayDefaultTenantId && serverConfig.razorpayDefaultTenantId.trim().length > 0) {
      return serverConfig.razorpayDefaultTenantId.trim();
    }

    // 2. Account ID mapping
    if (payload.account_id && payload.account_id.trim().length > 0) {
      const cleanAcc = payload.account_id.toLowerCase().replace(/[^a-z0-9]/g, '_');
      return `tenant_${cleanAcc}`;
    }

    // 3. Fallback to default
    return 'tenant_razorpay_merchant';
  }

  /**
   * Normalizes Razorpay payment entity into RiskLens Transaction model
   */
  public normalizePaymentToTransaction(
    payment: RazorpayPaymentEntity,
    eventId: string,
    tenantId: string
  ): Transaction {
    // 1. Amount scaling: Razorpay amounts are in smallest currency sub-units (e.g., paisa for INR)
    // 50000 INR = ₹500.00
    const rawAmount = typeof payment.amount === 'number' && !isNaN(payment.amount) ? payment.amount : 0;
    const normalizedAmount = rawAmount / 100;
    const currency = (payment.currency || 'INR').toUpperCase();

    // 2. Customer identifier derivation
    const customerIdentifier = payment.email || payment.contact || 'anonymous';
    const customerId = `CUST-RZP-${customerIdentifier.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const customerName = payment.notes?.customer_name || (payment.email ? payment.email.split('@')[0] : 'Razorpay Customer');

    // 3. Payment method and category categorization
    const isInternational = !!payment.international || !!payment.card?.international;
    let methodType: Transaction['paymentMethod']['type'] = 'Credit Card';
    if (payment.method === 'upi') {
      methodType = 'Digital Wallet';
    } else if (payment.method === 'netbanking' || payment.method === 'bank_transfer') {
      methodType = 'Wire Transfer';
    } else if (payment.method === 'wallet') {
      methodType = 'Digital Wallet';
    } else if (payment.card?.type === 'debit') {
      methodType = 'Debit Card';
    }

    const last4 = payment.card?.last4 || (payment.vpa ? 'UPI' : '0000');
    const issuer = payment.card?.network || payment.card?.issuer || payment.bank || 'Razorpay';
    const merchantCategory: Transaction['merchantCategory'] = (payment.notes?.category as any) || (payment.notes?.merchantCategory as any) || 'Retail';

    // 4. Extract risk flags from notes or payload telemetry if present
    const isTor = payment.notes?.is_tor === 'true' || payment.notes?.isTor === 'true' || !!payment.notes?.is_tor;
    const isProxy = payment.notes?.is_proxy === 'true' || payment.notes?.isProxy === 'true' || !!payment.notes?.is_proxy;
    const isVpn = payment.notes?.is_vpn === 'true' || payment.notes?.isVpn === 'true' || !!payment.notes?.is_vpn;
    const proxyRiskScore = isTor || isProxy ? 95 : (isVpn ? 60 : 10);
    const distKm = payment.notes?.distance_km ? parseInt(payment.notes.distance_km, 10) : (isInternational ? 4500 : 12);
    const isKnownDevice = payment.notes?.known_device !== 'false' && payment.notes?.is_known_device !== 'false';
    const deviceType: Transaction['device']['type'] = (payment.notes?.device_type as any) || (payment.notes?.deviceType as any) || (isTor ? 'Bot/Emulator' : 'Mobile');
    const fingerprintScore = payment.notes?.fingerprint_score ? parseInt(payment.notes.fingerprint_score, 10) : (deviceType === 'Bot/Emulator' ? 20 : 85);

    // 5. Initial status mapping
    let status: Transaction['status'] = 'pending';
    if (payment.status === 'captured') {
      status = 'approved';
    } else if (payment.status === 'failed') {
      status = 'rejected';
    }

    const timestamp = payment.created_at
      ? new Date(payment.created_at * 1000).toISOString()
      : new Date().toISOString();

    const transaction: Transaction = {
      id: `TXN-RZP-${payment.id}`,
      customerId,
      customerName,
      customerEmail: payment.email,
      customerTenureMonths: 12, // Standard baseline for payment gateway checkouts
      amount: normalizedAmount,
      currency,
      merchant: payment.notes?.merchant || payment.description || 'Razorpay Merchant Store',
      merchantCategory,
      timestamp,
      location: {
        city: currency === 'INR' ? 'Mumbai' : 'New York',
        country: currency === 'INR' ? 'IN' : 'US',
        lat: currency === 'INR' ? 19.0760 : 40.7128,
        lon: currency === 'INR' ? 72.8777 : -74.0060,
        distanceFromHomeKm: distKm,
      },
      device: {
        id: `DEV-RZP-${payment.id.slice(-6)}`,
        type: deviceType,
        os: isTor ? 'Linux' : 'Android / iOS',
        browser: isTor ? 'HeadlessChrome' : 'Mobile Checkout',
        fingerprintScore,
        isKnownCustomerDevice: isKnownDevice,
      },
      ipAddress: {
        ip: payment.notes?.ip || '103.21.124.1',
        country: currency === 'INR' ? 'IN' : 'US',
        city: currency === 'INR' ? 'Mumbai' : 'New York',
        isVpn,
        isTor,
        isProxy,
        proxyRiskScore,
      },
      paymentMethod: {
        type: methodType,
        last4,
        issuer,
        cardCountry: isInternational ? 'INTERNATIONAL' : (currency === 'INR' ? 'IN' : 'US'),
        is3DSecure: !isInternational && methodType !== 'Wire Transfer',
      },

      // Provider & Tenant Information
      provider: 'razorpay',
      providerPaymentId: payment.id,
      providerOrderId: payment.order_id || undefined,
      providerEventId: eventId,
      tenantId,

      // Initial ML risk defaults (will be scored immediately below)
      riskScore: 0,
      fraudProbability: 0,
      confidenceScore: 0.95,
      riskTier: 'LOW',
      riskLevel: 'LOW',
      status,

      tags: ['razorpay', payment.method || 'payment', payment.status],
      flagReasons: payment.error_description ? [payment.error_description] : [],
    };

    return transaction;
  }

  /**
   * Ingests, verifies, and executes the complete Razorpay webhook processing pipeline
   */
  public async processWebhookEvent(
    rawBody: Buffer | string | undefined,
    signature: string | undefined,
    headerEventId?: string,
    secretOverride?: string
  ): Promise<WebhookProcessResult> {
    const startTime = Date.now();

    // 1. Parse JSON payload safely
    let payload: RazorpayWebhookPayload;
    try {
      const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : (rawBody || '{}');
      payload = JSON.parse(bodyStr);
    } catch {
      throw new ValidationError('Malformed JSON payload in Razorpay webhook body', {
        field: 'rawBody',
      });
    }

    if (!payload || typeof payload !== 'object' || !payload.event) {
      throw new ValidationError('Invalid Razorpay webhook payload: missing "event" attribute', {
        payload,
      });
    }

    const eventId = this.extractEventId(payload, headerEventId);
    const eventType = payload.event;

    // 2. Cryptographic signature verification
    const isSignatureValid = this.verifyWebhookSignature(rawBody, signature, secretOverride);
    if (!isSignatureValid) {
      logger.warn(`[RazorpayService] Webhook rejected: Invalid signature for event ${eventId}`, {
        eventId,
        eventType,
      });
      throw new ValidationError('Invalid Razorpay webhook signature', {
        code: 'WEBHOOK_SIGNATURE_INVALID',
      });
    }

    logger.info(`[RazorpayService] Webhook signature verified for event ${eventId} (${eventType})`, {
      eventId,
      eventType,
    });

    // 3. Atomically claim the event before any processing. The provider/event
    // uniqueness constraint makes concurrent deliveries single-writer.
    const pendingRecord: WebhookEventRecord = {
      id: `evt_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      provider: 'razorpay',
      eventId,
      eventType,
      payload,
      signatureVerified: true,
      processingStatus: 'PENDING',
      receivedAt: new Date().toISOString(),
    };
    const claimed = await db.adapter.claimWebhookEvent(pendingRecord);
    if (!claimed) {
      const existingEvent = await db.adapter.getWebhookEvent('razorpay', eventId);
      const durationMs = Date.now() - startTime;
      logger.info(`[RazorpayService] Duplicate event ${eventId} received. Acknowledging idempotently.`, {
        eventId,
        eventType,
        processingStatus: existingEvent?.processingStatus || 'PENDING',
        durationMs,
      });

      return {
        success: true,
        eventId,
        eventType,
        status: (existingEvent?.processingStatus || 'PENDING') as any,
        idempotent: true,
        message: 'Event already processed and acknowledged',
      };
    }

    // 4. Handle Unsupported Events gracefully
    const supportedEvents = ['payment.captured', 'payment.failed', 'payment.authorized'];
    if (!supportedEvents.includes(eventType)) {
      logger.info(`[RazorpayService] Unsupported event type "${eventType}". Storing audit record and ignoring.`, {
        eventId,
        eventType,
      });

      const ignoredRecord: WebhookEventRecord = {
        id: `evt_rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        provider: 'razorpay',
        eventId,
        eventType,
        payload,
        signatureVerified: true,
        processingStatus: 'IGNORED',
        receivedAt: new Date().toISOString(),
        processedAt: new Date().toISOString(),
      };

      await db.adapter.saveWebhookEvent(ignoredRecord);

      return {
        success: true,
        eventId,
        eventType,
        status: 'IGNORED',
        message: `Event ${eventType} acknowledged and ignored according to policy`,
      };
    }

    // 5. Extract payment entity
    const paymentEntity = payload.payload?.payment?.entity;
    if (!paymentEntity || !paymentEntity.id) {
      throw new ValidationError('Invalid Razorpay payment event: missing payment entity', {
        payload,
      });
    }

    try {
      // 6. Resolve Tenant
      const tenantId = this.resolveTenantId(payload, paymentEntity);

      // 8. Normalize Payment to RiskLens Transaction
      const transaction = this.normalizePaymentToTransaction(paymentEntity, eventId, tenantId);

      // 9. Execute Existing Risk Scoring Engine
      const mlPrediction = evaluateTransactionWithML(transaction);
      transaction.riskScore = mlPrediction.riskScore;
      transaction.fraudProbability = mlPrediction.fraudProbability;
      transaction.riskTier = mlPrediction.riskTier;
      transaction.riskLevel = mlPrediction.riskTier;
      transaction.confidenceScore = mlPrediction.confidenceScore;
      transaction.riskFactors = mlPrediction.shapFactors
        .filter(f => f.isSuspicious)
        .map(f => `${f.displayName}: ${f.value}`);

      transaction.riskDecision = mlPrediction.fraudDecision === 'BLOCK'
        ? 'REJECT'
        : mlPrediction.fraudDecision;

      // If ML score indicates high risk or critical, flag the transaction
      if (mlPrediction.riskScore >= 60) {
        transaction.status = 'flagged';
        transaction.estimatedLossPrevented = transaction.amount;
        transaction.flagReasons.push(`ML High Risk Anomaly (Score: ${mlPrediction.riskScore})`);
        metrics.recordFraudDetected();
      } else if (paymentEntity.status === 'captured') {
        transaction.status = 'approved';
        transaction.estimatedLossPrevented = 0;
      } else if (paymentEntity.status === 'failed') {
        transaction.status = 'rejected';
        transaction.estimatedLossPrevented = 0;
      }

      // 10. Persist Transaction
      await db.transactions.save(transaction);
      metrics.recordTransactionIngest(1);

      // 11. Write Immutable Audit Log
      await db.auditLogs.log({
        actorEmail: 'webhook@razorpay.com',
        actorRole: 'payment_gateway',
        action: 'WEBHOOK_PAYMENT_INGEST',
        targetId: transaction.id,
        details: `Ingested Razorpay payment ${paymentEntity.id} (${transaction.currency} ${transaction.amount}). Risk Score: ${transaction.riskScore} [${transaction.riskTier}]. Status: ${transaction.status}.`,
        status: 'SUCCESS',
      });

      // 12. Mark Webhook Event as PROCESSED in idempotency store
      await db.adapter.saveWebhookEvent({
        ...pendingRecord,
        processingStatus: 'PROCESSED',
        processedAt: new Date().toISOString(),
      });

      // 13. Trigger Asynchronous Multi-Agent Investigation for flagged / high-risk transactions
      if (mlPrediction.riskScore >= 60) {
        investigationService.investigate(transaction.id, transaction, tenantId).catch(err => {
          logger.warn(`[RazorpayService] Async investigation deferred for ${transaction.id}:`, { error: err?.message });
        });
      }

      const durationMs = Date.now() - startTime;
      logger.info(`[RazorpayService] Successfully processed ${eventType} for ${paymentEntity.id} -> ${transaction.id} in ${durationMs}ms`, {
        eventId,
        eventType,
        paymentId: paymentEntity.id,
        transactionId: transaction.id,
        amount: transaction.amount,
        currency: transaction.currency,
        riskScore: transaction.riskScore,
        status: transaction.status,
        durationMs,
      });

      return {
        success: true,
        eventId,
        eventType,
        status: 'PROCESSED',
        transactionId: transaction.id,
        message: 'Payment ingested and ML-scored successfully',
      };
    } catch (err: any) {
      // Mark as FAILED in idempotency store on unexpected error
      await db.adapter.saveWebhookEvent({
        ...pendingRecord,
        processingStatus: 'FAILED',
        processedAt: new Date().toISOString(),
        error: err?.message || 'Processing failed',
      });

      logger.error(`[RazorpayService] Failed to process webhook event ${eventId}:`, { error: err?.message });
      throw err;
    }
  }
}

export const razorpayService = RazorpayService.getInstance();
