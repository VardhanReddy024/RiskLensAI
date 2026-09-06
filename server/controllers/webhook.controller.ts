/**
 * RiskLens AI - Webhook Controller
 * 
 * Manages external webhook ingestion (Razorpay, payment gateways)
 */

import { Request, Response, NextFunction } from 'express';
import { razorpayService } from '../services/razorpay.service';

export class WebhookController {
  /**
   * POST /api/webhooks/razorpay
   * Handles incoming Razorpay webhook notifications with raw body verification
   */
  public static async handleRazorpayWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = (req.headers['x-razorpay-signature'] as string) || '';
      const eventIdHeader = (req.headers['x-razorpay-event-id'] as string) || undefined;

      // Extract raw body preserved during Express JSON body parsing
      const rawBody = req.rawBody || (req.body ? Buffer.from(JSON.stringify(req.body), 'utf8') : undefined);

      const result = await razorpayService.processWebhookEvent(
        rawBody,
        signature,
        eventIdHeader
      );

      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  }
}
