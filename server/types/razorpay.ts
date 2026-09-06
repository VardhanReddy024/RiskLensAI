/**
 * RiskLens AI - Razorpay Webhook & Payment Entity Definitions
 * 
 * Complies with official Razorpay Webhook Payload specification.
 */

export interface RazorpayCardEntity {
  id?: string;
  entity?: 'card';
  name?: string;
  last4?: string;
  network?: string;
  type?: string;
  sub_type?: string;
  issuer?: string;
  international?: boolean;
  emi?: boolean;
  sub_type_details?: Record<string, any>;
}

export interface RazorpayPaymentEntity {
  id: string;
  entity: 'payment';
  amount: number; // in smallest currency unit (e.g. paisa for INR)
  currency: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  order_id?: string | null;
  invoice_id?: string | null;
  international?: boolean;
  method?: 'card' | 'netbanking' | 'wallet' | 'emi' | 'upi' | 'bank_transfer' | string;
  amount_refunded?: number;
  refund_status?: string | null;
  captured?: boolean;
  description?: string | null;
  card_id?: string | null;
  card?: RazorpayCardEntity;
  bank?: string | null;
  wallet?: string | null;
  vpa?: string | null;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
  fee?: number;
  tax?: number;
  error_code?: string | null;
  error_description?: string | null;
  error_source?: string | null;
  error_step?: string | null;
  error_reason?: string | null;
  acquirer_data?: Record<string, any>;
  created_at?: number; // Unix timestamp in seconds
}

export interface RazorpayWebhookPayload {
  entity?: 'event';
  account_id?: string;
  event: string; // e.g. 'payment.captured', 'payment.failed', 'payment.authorized'
  event_id?: string;
  contains?: string[];
  payload?: {
    payment?: {
      entity?: RazorpayPaymentEntity;
    };
    order?: {
      entity?: Record<string, any>;
    };
    refund?: {
      entity?: Record<string, any>;
    };
  };
  created_at?: number;
}
