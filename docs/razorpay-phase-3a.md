# RiskLens AI — Phase 3A: Razorpay Test-Mode Ingestion & Webhook Architecture

**Version:** Phase 3A (Test-Mode Gateway & Webhook Ingestion)  
**Status:** Validated & Production-Ready (Test-Mode)

---

## 1. Overview & Architecture

Phase 3A integrates Razorpay payment gateway webhooks into RiskLens AI. This enables asynchronous, secure ingestion of incoming payment events, normalizes monetary amounts and currencies, enforces strict idempotency, and immediately evaluates incoming transactions using the existing RiskLens AI Machine Learning scoring engine.

### End-to-End Conceptual Flow:

```
[Razorpay Payment Gateway]
         │
         ▼  HTTP POST /api/webhooks/razorpay (Headers: x-razorpay-signature, x-razorpay-event-id)
┌────────────────────────────────────────────────────────────────────────┐
│ Express Server Middleware Stack                                        │
│  ├─ 1. Security Headers (Helmet)                                       │
│  ├─ 2. CORS Whitelist                                                  │
│  ├─ 3. Request Tracing (X-Request-ID / Correlation-ID)                 │
│  ├─ 4. Raw Body Preservation (express.json verify hook -> req.rawBody) │
│  └─ 5. Rate Limiting (500 req/15min)                                   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Razorpay Webhook Controller & Service Layer                            │
│  ├─ 1. Cryptographic HMAC-SHA256 Signature Verification               │
│  │     └─ timingSafeEqual buffer comparison                            │
│  ├─ 2. Event Extraction & Idempotency Check (provider + event_id)      │
│  │     └─ If already PROCESSED -> Return 200 OK (idempotent: true)     │
│  ├─ 3. Event Type Filter (payment.captured, payment.failed, etc.)      │
│  │     └─ If unsupported -> Mark IGNORED & Return 200 OK               │
│  ├─ 4. Normalization (paisa -> INR, customer, device, IP, payment)     │
│  ├─ 5. Controlled Tenant Identity Resolution (Default/Merchant scoped) │
│  ├─ 6. ML Risk Inference & SHAP Factor Attribution                    │
│  ├─ 7. Persistent Storage (db.transactions & db.auditLogs)             │
│  ├─ 8. Update Webhook Event Record to PROCESSED                        │
│  └─ 9. Async Swarm Investigation Trigger (if RiskScore >= 60)         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
           HTTP 200 OK {"success": true, "status": "PROCESSED", ...}
```

---

## 2. Webhook Endpoint & Middleware Ordering

### Route Definition
* **Endpoint:** `POST /api/webhooks/razorpay`
* **Authentication:** **None (Public Provider Endpoint).** Protected strictly via cryptographic HMAC-SHA256 signature verification.
* **Signature Header:** `x-razorpay-signature`
* **Event ID Header (Optional):** `x-razorpay-event-id`

### Middleware Ordering
1. **`securityHeaders`**: Standard security headers (HSTS, NoSniff, XSS protection).
2. **`corsMiddleware`**: Permits Razorpay server-to-server webhook deliveries.
3. **`requestIdMiddleware`**: Injects request tracing metadata.
4. **`requestLoggerMiddleware`**: Logs structured metrics (method, duration, status).
5. **`express.json` with `verify` hook**: Preserves the unmodified incoming Buffer in `req.rawBody` while retaining full JSON parsing for all downstream controllers.
6. **`apiRouter.use('/webhooks', webhookRoutes)`**: Mounted before authenticated routes (`/api/transactions`, `/api/investigate`, etc.) to prevent user session requirement on webhooks.
7. **`errorHandlerMiddleware`**: Maps unhandled exceptions and validation failures into standardized JSON responses.

---

## 3. Cryptographic Signature Verification

Razorpay calculates an HMAC-SHA256 hash using the raw request body and the merchant's configured webhook secret:

$$\text{Expected Signature} = \text{HMAC-SHA256}(\text{rawBody}, \text{RAZORPAY\_WEBHOOK\_SECRET})$$

### Implementation Details:
* **Timing-Safe Comparison:** Compares byte lengths first; uses `crypto.timingSafeEqual` on UTF-8 buffers to eliminate timing attacks.
* **Tamper Rejection:** Any mutation of the body payload invalidates the signature and results in HTTP `400 BAD_REQUEST` (`WEBHOOK_SIGNATURE_INVALID`).
* **Zero Secret Leaks:** Webhook secrets and signature hashes are never printed in structured logs.

---

## 4. Idempotency & Duplicate Prevention

Razorpay automatically retries webhook deliveries up to 5 times if transient network errors occur. RiskLens AI enforces strict idempotency:

* **Uniqueness Boundary:** `(provider, event_id)` where `provider = "razorpay"`.
* **State Transition:**
  1. On first receipt $\rightarrow$ persisted as `PENDING`.
  2. On successful normalization, scoring, and saving $\rightarrow$ updated to `PROCESSED`.
  3. If duplicate arrives $\rightarrow$ queries `db.adapter.getWebhookEvent('razorpay', eventId)`.
  4. Returns `HTTP 200 OK` with `{"success": true, "idempotent": true, "status": "PROCESSED"}` immediately without duplicate transaction inserts or re-running the ML engine.

---

## 5. Transaction Normalization & Currency Handling

| Razorpay Field | RiskLens AI Transaction Field | Normalization Transformation |
| :--- | :--- | :--- |
| `payment.id` | `providerPaymentId`, `id` | `id: "TXN-RZP-" + payment.id` |
| `payment.amount` | `amount` | Scaled from smallest sub-unit: `amount / 100` (e.g. ₹50000 paisa $\rightarrow$ ₹500.00) |
| `payment.currency` | `currency` | Normalized to uppercase (e.g. `INR`, `USD`) |
| `payment.status` | `status` | `captured` $\rightarrow$ `approved` (or `flagged` if ML score $\ge 60$); `failed` $\rightarrow$ `rejected` |
| `payment.email` / `contact` | `customerId` | Derived deterministic ID: `CUST-RZP-<sanitized>` |
| `payment.method` | `paymentMethod.type` | Mapped to `'Credit Card'`, `'Debit Card'`, `'Digital Wallet'`, or `'Wire Transfer'` |
| `payment.card.last4` | `paymentMethod.last4` | Card last 4 digits (or `'UPI'` for VPA) |
| `event_id` | `providerEventId` | Stored for provider audit reconciliation |

---

## 6. Tenant & Merchant Mapping Strategy

* Webhook payloads do not contain client user session cookies or Firebase tokens.
* **Controlled Strategy:**
  1. By default, maps to `serverConfig.razorpayDefaultTenantId` (`tenant_razorpay_merchant`).
  2. For multi-merchant accounts, maps `account_id` $\rightarrow$ `tenant_<account_id>`.
  3. Never derives tenant ownership from untrusted client parameters.

---

## 7. Environment Variables Configuration

Add the following to `.env`:

```env
# Razorpay Test-Mode Gateway Credentials
RAZORPAY_KEY_ID=rzp_test_YourTestKeyIdHere
RAZORPAY_KEY_SECRET=YourTestKeySecretHere
RAZORPAY_WEBHOOK_SECRET=YourConfiguredWebhookSecretHere
RAZORPAY_DEFAULT_TENANT_ID=tenant_razorpay_merchant
```

---

## 8. Local Testing Procedure

To test webhooks locally without live credentials:
```bash
# 1. Run full unit and integration test suite
npm test

# 2. Start development server
npm run dev

# 3. Deliver sample test webhook using signed HMAC fixture
curl -X POST http://localhost:3000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: <computed_signature>" \
  -d '{"event":"payment.captured","payload":{"payment":{"entity":{"id":"pay_test_01","amount":50000,"currency":"INR","status":"captured"}}}}'
```
