# RiskLens AI — Razorpay Foundation Plan

This document details the exact files, code paths, and architectural designs required to resolve the 7 critical findings from the Phase 1 audit before commencing the Razorpay Buildathon upgrade.

---

## 1. Verified Critical Findings & Proposed Changes

### RISK-01: No Server-Side Authentication
**Exact File:** `server/middleware.ts`, `server.ts`
**Location:** Missing in `createExpressApp()` before `app.use('/api', apiRouter)`
**Current Behavior:** The server relies entirely on client-side Firebase authentication. The Express backend exposes all API endpoints without verifying any `Authorization` headers.
**Impact:** Any user or script can directly call the `/api/transactions` or `/api/investigate/:id` endpoints. Once Razorpay is integrated, unauthorized actors could view all webhook payloads and payment data.
**Proposed Modification:** Create `server/middleware/auth.middleware.ts` to verify Firebase ID tokens using `firebase-admin`. Apply it to `apiRouter` in `server.ts`, exempting the public webhook route and `/health`.
**Existing Functionality at Risk:** The AI Studio bypass logic (which auto-authenticates without a real Firebase token) will fail if server-side auth is strictly enforced.
**Tests to Add:** `src/test/auth.test.ts` to verify 401 Unauthorized for missing tokens, and 200 OK for valid tokens.

### RISK-02: Silent In-Memory Fallback
**Exact File:** `server/db/adapters/PgAdapter.ts`, `server/db/index.ts`
**Location:** `PgAdapter.initialize()` lines 56-61, `DatabaseService.initialize()` lines 61-70.
**Current Behavior:** If the PostgreSQL connection fails or `DATABASE_URL` is missing, `PgAdapter` silently catches the error and switches to `InMemoryAdapter`. 
**Impact:** Razorpay webhook events saved to the database would actually be saved to memory and lost permanently upon container restart or deployment.
**Proposed Modification:** Introduce a strict mode in `PgAdapter` when `NODE_ENV=production` that throws a fatal error if the connection fails instead of falling back.
**Existing Functionality at Risk:** Local development environments without a running PostgreSQL instance will crash unless explicitly configured to use the memory adapter.
**Tests to Add:** Database connection tests to verify fallback is disabled when a strict flag is provided.

### RISK-03: Global `express.json()` Breaks Razorpay Webhook Signatures
**Exact File:** `server.ts`
**Location:** Lines 37-38 (`app.use(express.json(...))`)
**Current Behavior:** `express.json()` parses all incoming request bodies globally before they reach the router.
**Impact:** Razorpay's HMAC-SHA256 signature verification requires the exact, unaltered raw Buffer of the request body. `express.json()` destroys this Buffer, making signature verification impossible.
**Proposed Modification:** Remove `express.json()` from global scope in `server.ts`. Mount `express.raw({ type: 'application/json' })` exclusively on the `/api/webhooks/razorpay` route, and mount `express.json()` on the remaining API routes.
**Existing Functionality at Risk:** All existing POST routes (`/api/transactions/batch`, `/api/actions/resolve`) could break if `express.json()` is not correctly re-applied to them.
**Tests to Add:** `src/test/webhook.test.ts` to assert the webhook controller receives a raw Buffer, while other controllers receive parsed JSON.

### RISK-04: No Webhook Idempotency
**Exact File:** `server/db/adapters/PgAdapter.ts`
**Location:** Missing `webhook_events` table in `createTablesIfNotExist()` (lines 64-102)
**Current Behavior:** There is no mechanism to track processed webhook event IDs.
**Impact:** Razorpay frequently retries failed webhooks (up to 5 times). The same transaction would be ingested, scored by the AI, and written to the database multiple times, duplicating data and wasting API quota.
**Proposed Modification:** Create a `webhook_events` table with `event_id` as the primary key. Check this table before processing any Razorpay payload.
**Existing Functionality at Risk:** None (additive change).
**Tests to Add:** Idempotency tests to simulate receiving the exact same webhook payload twice and verifying it is only processed once.

### RISK-05: No Tenant Isolation
**Exact File:** `src/types/transaction.ts`, `server/db/adapters/PgAdapter.ts`
**Location:** Transaction interface and SQL schema.
**Current Behavior:** All transactions are stored in a single table with no association to a specific tenant or merchant account.
**Impact:** A multi-merchant Razorpay integration would leak transaction data across merchants because the `getAllTransactions` API does not filter by tenant.
**Proposed Modification:** Add a `tenantId` field to the `Transaction` model and `transactions` table. Add a `tenant.middleware.ts` to extract the tenant ID from the authenticated user and append it to all database queries.
**Existing Functionality at Risk:** The existing frontend dashboard will need to send or associate a tenant context; otherwise, queries will return empty.
**Tests to Add:** `src/test/tenant.test.ts` to ensure users of Tenant A cannot read transactions of Tenant B.

### RISK-06: USD Hardcoded Risk Baselines
**Exact File:** `src/lib/ml_engine.ts`, `server/agents/behavior_analyzer.ts`
**Location:** `ml_engine.ts` line 45 (`const baselineAmount = 180.00;`), `behavior_analyzer.ts` line 11 (`const baselineAvg = 150.00;`)
**Current Behavior:** The risk engine compares all transactions against a hardcoded USD average of $150-$180.
**Impact:** Razorpay transactions in INR (e.g., ₹2,500) will be incorrectly flagged as massive anomalies (e.g., 13x the baseline) because the engine does not account for currency scaling.
**Proposed Modification:** Implement currency-aware baselines. If currency is INR, multiply the baseline by a conversion factor (e.g., 85), or preferably, calculate the real baseline from the customer's historical transactions in the database.
**Existing Functionality at Risk:** Existing simulated USD transactions might get different SHAP factor scores if the baseline calculation logic changes fundamentally.
**Tests to Add:** `src/test/risk.test.ts` to verify an INR 15,000 transaction is scored correctly compared to a USD 180 transaction.

### RISK-08: Gemini Model Name May Be Invalid
**Exact File:** `server/gemini.ts`
**Location:** Lines 168 and 315 (`model: "gemini-3.6-flash"`)
**Current Behavior:** The code attempts to call `gemini-3.6-flash`.
**Impact:** If this model does not exist or has been deprecated, all AI generation will fail and trigger the deterministic fallback.
**Proposed Modification:** Update the model string to a known, stable model version, such as `gemini-2.0-flash-exp` or `gemini-2.5-flash`.
**Existing Functionality at Risk:** The quality or formatting of the AI responses might change slightly depending on the exact model used.
**Tests to Add:** A basic integration test to verify the Gemini API call succeeds with the configured model.

---

## 2. Verified Architectural Decisions

A. **Razorpay Raw Body:** Verified. `express.json()` must be removed from the global middleware stack to allow `express.raw()` for webhooks.
B. **Idempotency:** Verified. Required to prevent duplicate processing of Razorpay retries.
C. **Persistence Before Processing:** Verified. The webhook payload must be saved to a `webhook_events` table immediately before triggering the 8-agent swarm.
D. **PostgreSQL Authoritative:** Verified. `PgAdapter` must be configured to fail hard on connection errors in production.
E. **Fallback Prevention:** Verified. The silent fallback to `InMemoryAdapter` must be disabled for the Razorpay environment.
F. **Extend Architecture:** Verified. Existing interfaces (`IDataStoreAdapter`, `Transaction`) will be extended, not duplicated.
G. **Reuse AI/Graph:** Verified. The 8-agent swarm and D3 graph will be fed Razorpay data.
H. **INR Risk Strategy:** Verified. Hardcoded USD baselines in `ml_engine.ts` and `behavior_analyzer.ts` will be updated to be currency-aware.
I. **Auth Compatibility:** Verified. Server-side auth must handle both Firebase tokens and the existing AI Studio bypass mechanism gracefully.
J. **Payload Fields:** Verified. Only officially documented Razorpay webhook fields (e.g., `razorpay_payment_id`, `razorpay_order_id`, `razorpay_signature`) will be used.
K. **Secret Handling:** Verified. Razorpay API keys and webhook secrets will be stored exclusively in server-side `.env` variables and never logged or exposed to the frontend.

---

## 3. Implementation Order

1. **Phase 2.1: Foundation Fixes**
   - Update Gemini model name.
   - Implement strict DB connection mode (disable silent fallback).
   - Adjust global Express middleware to support raw bodies for webhooks.

2. **Phase 2.2: Data Model & Database Upgrades**
   - Extend `Transaction` type with Razorpay fields and `tenantId`.
   - Update `PgAdapter` to create `webhook_events` and add new columns to `transactions`.
   - Update ML/Behavioral engines for INR-aware baselines.

3. **Phase 2.3: Authentication & Security**
   - Implement `auth.middleware.ts` and `tenant.middleware.ts`.
   - Apply middlewares to protected API routes.

4. **Phase 2.4: Razorpay Integration**
   - Create Razorpay types and signature verification utility.
   - Implement `/api/webhooks/razorpay` endpoint with idempotency.
   - Map Razorpay payload to `Transaction` and trigger the agent swarm.

*(End of Plan)*
