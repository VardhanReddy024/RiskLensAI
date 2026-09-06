/**
 * RiskLens AI - Webhook Routes
 * 
 * Exposes external webhook endpoints without user session authentication.
 * Relies strictly on cryptographic provider signature verification.
 */

import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { webhookRateLimiter } from '../middleware';

const router = Router();

// POST /api/webhooks/razorpay
// Protected by dedicated high-throughput abuse limiter and cryptographic HMAC-SHA256 verification
router.post('/razorpay', webhookRateLimiter, WebhookController.handleRazorpayWebhook);

export default router;
