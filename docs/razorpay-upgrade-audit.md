# RiskLens AI — Razorpay Buildathon Upgrade Audit
## Phase 1: Full Repository Audit

**Audit Date:** 2026-08-24
**Repository:** `risklensai1`
**Purpose:** Establish full understanding of the existing codebase before any Razorpay integration begins.

---

## 1. Existing Architecture

### 1.1 Runtime Stack

| Layer | Technology | Entry Point |
|---|---|---|
| Frontend | React 19 + Vite 6 + TypeScript | `src/main.tsx` → `src/App.tsx` |
| Backend | Express 4 + Node 22 + TypeScript | `server.ts` |
| Build | esbuild (server), Vite (frontend) | `package.json` scripts |
| Dev Server | Vite middleware mode (Express-embedded) | `server.ts:66` |
| Test Runner | Vitest 4 + Supertest + @testing-library | `vitest.config.ts` |
| Deployment (frontend) | Vercel (static SPA) | `vercel.json` |
| Deployment (backend) | Modal Serverless Web Endpoint | `modal_app.py` |
| Type Check / Lint | `tsc --noEmit` | `package.json:lint` |

### 1.2 Backend Architecture

```
server.ts
  createExpressApp()
    ├── Helmet security headers
    ├── CORS whitelist (risklens-platform.vercel.app + localhost)
    ├── Compression (gzip/deflate)
    ├── Request ID / Correlation ID tracing
    ├── Structured JSON request logger
    ├── Rate limiter (500 req/15min per IP)
    ├── express.json() body parser (GLOBAL — problem for webhooks)
    ├── /api → apiRouter
    └── Error handler middleware

server/routes/index.ts
  ├── /health/*             ← health.routes.ts
  ├── /transactions         ← transaction.routes.ts
  ├── /investigate          ← investigation.routes.ts
  ├── /copilot              ← copilot.routes.ts
  ├── /actions              ← action.routes.ts
  └── /analytics            ← analytics.routes.ts
```

### 1.3 Frontend Architecture

```
src/App.tsx
  ├── AuthProvider (Firebase Auth + AI Studio bypass)
  ├── TransactionProvider (state + API fetching)
  ├── InvestigationProvider (dossier management)
  └── Pages:
       ├── LandingPage       — public marketing page
       ├── LoginPage         — Firebase Google Auth
       ├── DashboardPage     — main transaction view + charts
       ├── MonitoringPage    — live event stream
       ├── UploadPage        — CSV batch ingest
       ├── InvestigationPage — 8-agent dossier + AI chat
       ├── FraudGraphModule  — D3 graph visualization
       ├── ReportsPage       — PDF/SAR export
       └── SettingsPage      — risk thresholds (local state only)
```

### 1.4 Database Layer

Three adapters behind a unified `IDataStoreAdapter` interface:

| Adapter | When Used | Status |
|---|---|---|
| `PgAdapter` | `DATABASE_URL` set OR `DATA_STORE_PROVIDER=postgres` | Production-grade with pg Pool |
| `FirestoreAdapter` | Default when no DATABASE_URL | Falls back to memory silently |
| `InMemoryAdapter` | Tests, local dev, all fallback paths | Fast, ephemeral |

**CRITICAL:** Both `PgAdapter` and `FirestoreAdapter` silently fall back to `InMemoryAdapter` on any connection error. The `DatabaseService.initialize()` also catches all adapter errors and switches to memory. Persistent storage is never guaranteed in the current setup.

**DB config selector** (`server/db/index.ts:22`):
- `postgres` → if `DATA_STORE_PROVIDER=postgres` OR `DATABASE_URL` is set
- `in-memory` → if `NODE_ENV=test` OR `VITEST=true`
- `firestore` → default (no DATABASE_URL, not test)

### 1.5 Repository Pattern

```
DatabaseService (Singleton)
  ├── transactions → TransactionRepository → IDataStoreAdapter
  ├── auditLogs   → AuditLogRepository    → IDataStoreAdapter
  └── dossiers    → DossierRepository     → IDataStoreAdapter
```

All repositories implement a clean interface and delegate to the adapter. Adapter can be swapped at runtime via `switchAdapter()`.

### 1.6 AI / ML Architecture

```
8-Agent Swarm (server/agents/)
  ├── orchestrator.ts      — Agent 1: coordinates all others (parallel phases)
  ├── fraud_detector.ts    — Agent 2: ML risk score
  ├── behavior_analyzer.ts — Agent 3: behavioral deviation (hardcoded baselines)
  ├── case_retriever.ts    — Agent 4: simulated vector similarity search
  ├── explainability.ts    — Agent 5: Gemini explainability
  ├── compliance_checker.ts— Agent 6: AML/OFAC/Reg-E rules
  ├── recommender.ts       — Agent 7: APPROVE/HOLD/ESCALATE/REJECT
  └── report_generator.ts  — Agent 8: forensic dossier + SAR draft

ML Engine (src/lib/ml_engine.ts) — server/ml_engine.ts re-exports this
  ├── evaluateTransactionWithML(transaction)
  ├── Features: amount, geo, device, IP, merchant category, 3DS auth
  ├── SHAP factor attribution (6 features, labeled)
  └── Risk score: 1–99 (deterministic formula, not random)

Vector Search (server/qdrant.ts)
  ├── searchSimilarFraudCases(transaction)
  ├── Similarity against static HISTORICAL_FRAUD_CASES dataset
  └── NOT connected to real Qdrant — fully simulated locally

Gemini Integration (server/gemini.ts)
  ├── generateInvestigationAIInsights() — unified Gemini call
  ├── chatWithInvestigatorCopilot()     — conversational AI
  ├── Model: "gemini-3.6-flash" (needs verification)
  ├── In-memory cache per {transactionId}-{riskScore}
  └── Deterministic text fallback when API unavailable

Graph Engine (src/lib/graph_engine.ts)
  ├── 1,492-line D3-based graph in browser
  ├── 12+ node types: transaction, customer, merchant, device, ip_address, etc.
  ├── Fraud cluster detection, path finding, heat maps, timeline
  └── FRONTEND ONLY — not connected to DB or server-side graph storage
```

### 1.7 Authentication

- **Client:** Firebase Authentication (Google OAuth via `signInWithPopup`)
- **AI Studio bypass:** Detects AI Studio hostnames → auto-authenticates with hardcoded email
- **Server:** NO server-side authentication middleware exists. All API endpoints are publicly accessible without any JWT/token verification.
- **Session:** `localStorage` for Firebase user profile

### 1.8 Existing API Routes

| Method | Route | Auth | Status |
|---|---|---|---|
| GET | `/api/health` | None | Working |
| GET | `/api/health/live` | None | Working |
| GET | `/api/health/ready` | None | Working |
| GET | `/api/metrics` | None | Working |
| GET | `/api/transactions` | NONE | Working |
| GET | `/api/transactions/:id` | NONE | Working |
| POST | `/api/transactions/batch` | NONE | Working |
| POST | `/api/investigate/:id` | NONE | Working |
| POST | `/api/copilot/chat` | NONE | Working |
| POST | `/api/actions/resolve` | NONE | Working |
| GET | `/api/analytics/metrics` | NONE | Working |

### 1.9 Deployment

| Component | Platform | Config |
|---|---|---|
| Frontend | Vercel (SPA) | `vercel.json` |
| Backend | Modal Serverless | `modal_app.py` |
| Database | PostgreSQL (via DATABASE_URL) | `PgAdapter.ts` |
| Secrets | Modal Secrets (`risklens-secrets`) | `modal_app.py:55` |

---

## 2. Existing Working Features

| Feature | Status | Notes |
|---|---|---|
| Express server with production middleware | Working | Helmet, CORS, rate limit, compression, request tracing |
| Firebase Auth (Google OAuth) | Working | Client-side only |
| Transaction CRUD API | Working | GET list, GET by ID, batch POST, filter by status/search |
| ML risk scoring | Working | Deterministic SHAP-based, 6 features, score 1-99 |
| 8-agent AI swarm | Working | All 8 agents execute in parallel phases, produce structured output |
| Gemini AI integration | Working | With graceful deterministic fallback when key missing |
| Vector case retrieval | Working (simulated) | Uses static historical dataset, not real Qdrant |
| Analyst action service | Working | APPROVE/HOLD/ESCALATE/REJECT with audit log |
| Audit logging | Working | Immutable, stored in all adapters |
| Dossier caching | Working | Prevents re-investigation of same transaction |
| Graph visualization | Working (frontend) | D3, 12 node types, fraud cluster detection |
| PDF export | Working | jsPDF + html2canvas |
| CSV upload/parsing | Working | Frontend parser with validation and ML scoring |
| Error handling hierarchy | Working | AppError, ValidationError, NotFoundError, etc. |
| Structured logging | Working | `server/logger.ts` |
| Prometheus-style metrics | Working | `server/metrics.ts` |
| CI pipeline | Working | GitHub Actions, Node 20/22 matrix |
| Vitest test suite | Working | 11 test files |
| PostgreSQL adapter | Working | Full CRUD, auto-table creation, graceful fallback |
| Settings page | Local only | Thresholds not persisted to server |

---

## 3. Existing Database Model

### Current `Transaction` Type (`src/types/transaction.ts`)

```typescript
{
  id: string;                       // e.g., "TXN-98421-FRAUD"
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  customerTenureMonths?: number;
  amount: number;
  currency: string;                 // e.g., "USD"
  merchant: string;
  merchantCategory: enum;           // Electronics, Luxury, Crypto, etc.
  timestamp: string;                // ISO 8601
  location: { city, country, lat, lon, distanceFromHomeKm }
  device: { id, type, os, browser, fingerprintScore, isKnownCustomerDevice }
  ipAddress: { ip, country, city, isVpn, isTor, isProxy, proxyRiskScore }
  paymentMethod: { type, last4, issuer, cardCountry, is3DSecure }
  riskScore: number;                // 0-100
  fraudProbability: number;         // 0.00-1.00
  confidenceScore: number;
  riskTier: 'CRITICAL'|'HIGH'|'MEDIUM'|'LOW';
  status: 'pending'|'flagged'|'approved'|'held'|'escalated'|'rejected';
  estimatedLossPrevented?: number;
  tags: string[];
  flagReasons: string[];
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: string;
}
```

**Missing Razorpay fields:** `razorpayPaymentId`, `razorpayOrderId`, `provider`, `tenantId`, `merchantId`, `riskDecision`, `providerEventId`

### Current PostgreSQL Schema

```sql
-- All transaction data stored as JSONB payload
-- No Razorpay-specific indexed columns
-- No webhook_events table
-- No merchant_profiles table
-- No risk_policies table
-- No performance indexes on status, risk_score, created_at

CREATE TABLE transactions (id, status, amount, risk_score, payload JSONB, created_at);
CREATE TABLE audit_logs (id, target_id, action, actor, payload JSONB, timestamp);
CREATE TABLE dossiers (transaction_id, payload JSONB, created_at);
CREATE TABLE users (id, email, role, payload JSONB, created_at);
```

---

## 4. Existing Risk Engine Analysis

### ML Engine (`src/lib/ml_engine.ts`)

Algorithm emulates XGBoost + LightGBM Ensemble.

| Feature | Baseline Used | Problem |
|---|---|---|
| Amount | $180 USD hardcoded | Wrong for INR payments |
| Geo velocity | distanceFromHomeKm threshold | Based on US home location |
| Device trust | fingerprintScore field | Field may not exist for Razorpay payments |
| IP risk | proxyRiskScore field | Field may not exist for Razorpay payments |
| Merchant category | Limited US-centric set | Razorpay has different categories |
| 3DS auth | is3DSecure field | Maps to Razorpay's authentication data |

**Score formula:** `clamp(50 + totalImpact × 0.75, 1, 99)`

### Behavioral Engine (`server/agents/behavior_analyzer.ts`)

- Hardcoded `baselineAvg = $150` for all customers (wrong for INR)
- Hardcoded `baselineDailyFreq = 2.4` for all customers
- Does NOT query DB for real customer history
- Velocity counts are inferred from amount ratio, not actual DB counts

---

## 5. Existing AI Architecture

### 8-Agent Swarm — Phase Execution

```
Phase 1 (parallel): fraud_detection + behavioral_analysis + case_retrieval
Phase 2 (parallel): compliance + explainability
Phase 3: recommendation
Phase 4: report_generation
```

### Agents — Responsibility / Tool / Status

| # | Agent | Real Tool | Limitation |
|---|---|---|---|
| 1 | Orchestrator | Coordinates | No Razorpay payment context |
| 2 | Fraud Detection | `evaluateTransactionWithML()` | USD/US-centric features |
| 3 | Behavioral Analysis | Hardcoded baselines | Not DB-backed |
| 4 | Case Retrieval | Simulated Qdrant | Static dataset |
| 5 | Explainability | Gemini API | Prompts lack Razorpay context |
| 6 | Compliance | Rule engine | US-centric rules (FinCEN, Reg-E) |
| 7 | Recommendation | Rule-based | Maps to ALLOW/REVIEW/MITIGATE needed |
| 8 | Report Generator | Gemini API | Lacks Razorpay payment IDs |

---

## 6. Existing API Routes (Full Detail)

All routes under `/api`. No authentication enforced on any endpoint.

| Method | Route | Service | Description |
|---|---|---|---|
| GET | `/api/health` | HealthService | Service status overview |
| GET | `/api/health/live` | HealthService | Liveness probe |
| GET | `/api/health/ready` | HealthService | Readiness probe |
| GET | `/api/metrics` | MetricsController | Prometheus-style JSON metrics |
| GET | `/api/transactions` | TransactionService | List with filter/search |
| GET | `/api/transactions/:id` | TransactionService | Single transaction |
| POST | `/api/transactions/batch` | TransactionService | Ingest + ML score batch |
| POST | `/api/investigate/:id` | InvestigationService | Run 8-agent swarm |
| POST | `/api/copilot/chat` | CopilotService | Gemini AI chat |
| POST | `/api/actions/resolve` | ActionService | Approve/Hold/Reject |
| GET | `/api/analytics/metrics` | AnalyticsController | Aggregate dashboard metrics |

---

## 7. Existing Authentication

- **Client side:** Firebase Google OAuth, user profile in localStorage
- **AI Studio bypass:** Hardcoded email auto-login in specific hostnames
- **Server side:** NONE. No `Authorization` header validation on any endpoint.
- **Tenant isolation:** NONE. No `tenant_id` on any model.

---

## 8. Existing Deployment

- **Frontend:** Vercel → `vercel.json` builds with `vite build`, SPA routing
- **Backend:** Modal → `modal_app.py` containerized Node 22, runs `dist/server.cjs`
- **Secrets:** Modal Secrets (`risklens-secrets`) with `GEMINI_API_KEY`, `DATABASE_URL`
- **CI/CD:** GitHub Actions, lint + test + coverage + build + npm audit

---

## 9. Missing Razorpay Capabilities

| Capability | Status |
|---|---|
| Razorpay npm package | Missing |
| `POST /api/webhooks/razorpay` endpoint | Missing |
| HMAC-SHA256 signature verification | Missing |
| Raw body capture (required for signature) | Missing — `express.json()` applied globally |
| Idempotency / duplicate event protection | Missing |
| `webhook_events` table | Missing |
| Razorpay payment ID fields in Transaction | Missing |
| `tenant_id`, `merchant_id` in data model | Missing |
| INR-aware risk baselines | Missing |
| Real customer behavioral baselines from DB | Missing |
| Merchant-level risk aggregation | Missing |
| Configurable risk policy engine | Missing |
| ALLOW/REVIEW/MITIGATE decision output | Missing (APPROVE/HOLD/REJECT exists) |
| Real-time WebSocket/SSE push | Missing |
| Razorpay integration status UI | Missing |
| Server-side authentication middleware | Missing |
| Tenant isolation | Missing |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` env vars | Missing |
| Demo mode data flag | Missing (sample data exists but unmarked) |

---

## 10. Exact Files That Should Be Modified

| File | What to Change |
|---|---|
| `server.ts` | Raw body capture middleware for `/api/webhooks/*` BEFORE `express.json()` |
| `server/config/index.ts` | Add `razorpayKeyId`, `razorpayWebhookSecret`, `postgres` to valid providers |
| `server/middleware.ts` | Export server-side auth middleware |
| `server/routes/index.ts` | Register `/webhooks` route |
| `server/db/index.ts` | Add WebhookEventRepository |
| `server/db/adapters/PgAdapter.ts` | Add `webhook_events`, `risk_policies`, `merchant_profiles` tables; add DB indexes |
| `server/db/interfaces/IDataStoreAdapter.ts` | Add webhook event methods |
| `src/types/transaction.ts` | Add Razorpay fields: `razorpayPaymentId`, `razorpayOrderId`, `provider`, `tenantId`, `merchantId`, `riskDecision`, `providerEventId` |
| `server/agents/behavior_analyzer.ts` | Replace hardcoded baselines with DB-backed historical queries |
| `server/agents/fraud_detector.ts` | Accept and use Razorpay-specific payment signals |
| `server/agents/orchestrator.ts` | Pass Razorpay payment context to all agents |
| `server/gemini.ts` | Fix model name; add INR/Razorpay context to prompts |
| `server/qdrant.ts` | INR-aware amount thresholds |
| `.env.example` | Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` |
| `src/context/TransactionContext.tsx` | Remove hardcoded INITIAL_TRANSACTIONS initialization |
| `src/components/pages/DashboardPage.tsx` | Connect to real Razorpay event feed |
| `src/components/pages/SettingsPage.tsx` | Persist policies to server; add Razorpay status panel |
| `vercel.json` | Ensure `VITE_API_URL` env is documented |

---

## 11. Exact Files That Should Be Added

**Backend integrations:**
```
server/integrations/razorpay/client.ts      — Razorpay SDK initialization
server/integrations/razorpay/signature.ts   — HMAC-SHA256 verification
server/integrations/razorpay/events.ts      — Event type parsers
server/integrations/razorpay/types.ts       — TypeScript types for Razorpay payloads
server/integrations/razorpay/service.ts     — High-level Razorpay service
server/integrations/razorpay/index.ts       — Re-exports
```

**Backend routes/controllers:**
```
server/routes/webhook.routes.ts             — POST /api/webhooks/razorpay
server/controllers/webhook.controller.ts    — Webhook handler
```

**Backend services:**
```
server/services/webhook.service.ts          — Idempotency, persistence, async dispatch
server/services/risk.service.ts             — Payment-specific risk orchestrator
server/services/merchant.service.ts         — Merchant risk aggregation
server/services/policy.service.ts           — Risk policy CRUD + evaluation
server/services/behavioral.service.ts       — DB-backed behavioral baselines
```

**Backend middleware:**
```
server/middleware/auth.middleware.ts         — Firebase ID token verification
server/middleware/tenant.middleware.ts       — Tenant isolation
```

**Frontend pages:**
```
src/components/pages/RazorpaySettingsPage.tsx  — Integration status UI
src/components/pages/PolicyPage.tsx            — Risk policy management
src/components/pages/ReviewPage.tsx            — Human analyst review workflow
```

**Frontend types:**
```
src/types/razorpay.ts                          — Razorpay frontend types
```

**Tests:**
```
src/test/webhook.test.ts                       — Valid signature, invalid sig, duplicate
src/test/risk.test.ts                          — INR risk scoring, payment signals
src/test/tenant.test.ts                        — Tenant isolation enforcement
src/test/policy.test.ts                        — Policy engine CRUD + evaluation
```

---

## 12. Files That Should NOT Be Changed

| File | Reason |
|---|---|
| `server/errors/index.ts` | Clean error hierarchy, reuse as-is |
| `server/logger.ts` | Production-ready structured logger |
| `server/metrics.ts` | Extend only, don't replace |
| `server/db/repositories/TransactionRepository.ts` | Extend via adapter pattern |
| `server/db/repositories/AuditLogRepository.ts` | Working |
| `server/db/repositories/DossierRepository.ts` | Working |
| `server/agents/compliance_checker.ts` | Working, map to Razorpay context in caller |
| `server/agents/recommender.ts` | Working, extend output mapping |
| `server/agents/report_generator.ts` | Working, extend prompts |
| `src/lib/graph_engine.ts` | Mature D3 engine, connect to real data in caller |
| `src/lib/color_converter.ts` | Utility |
| `src/lib/pdf_exporter.ts` | PDF export |
| `src/lib/csv_parser.ts` | CSV parser |
| `src/lib/firebase.ts` | Firebase client config |
| `firestore.rules` | Firestore security rules |
| `tsconfig.json` | TypeScript config |
| `vite.config.ts` | Vite build config |
| `vitest.config.ts` | Test config |
| `.gitignore` | Git ignore |

---

## 13. Risks and Compatibility Concerns

### Critical Risks

**RISK-01: No server-side authentication.**
All API endpoints are publicly accessible. Razorpay webhook and payment data will be exposed without protection. Must add Firebase ID token middleware before exposing Razorpay-integrated endpoints.

**RISK-02: Silent fallback to in-memory storage.**
Both `PgAdapter` and `FirestoreAdapter` silently catch connection errors and fall back to `InMemoryAdapter`. Razorpay webhook events written to memory will be lost on server restart. The Razorpay path must explicitly fail if PostgreSQL is unavailable rather than silently losing data.

**RISK-03: `express.json()` applied globally.**
Razorpay signature verification requires the raw request body (Buffer). The current `server.ts` applies `express.json()` globally BEFORE any route handlers. The `/api/webhooks/razorpay` route must be mounted with `express.raw({ type: 'application/json' })` BEFORE the global JSON middleware sees it.

**RISK-04: No idempotency for webhook events.**
Razorpay retries failed webhooks up to 5 times with the same event ID. Without a `webhook_events` table tracking processed event IDs, the same payment will trigger multiple risk analyses and DB writes.

**RISK-05: No tenant isolation.**
All transactions share a single global namespace. A multi-merchant Razorpay integration would mix all merchant data without separation.

### High Risks

**RISK-06: Hardcoded USD baselines in ML engine.**
`baselineAmount = $180` in `ml_engine.ts`, `baselineAvg = $150` in `behavior_analyzer.ts`. Razorpay processes INR. Typical Razorpay amounts range ₹100–₹500,000. The engine will mis-score all Razorpay INR payments without currency-aware baselines.

**RISK-07: Transaction model is US/USD-centric.**
Type definitions assume USD, US card issuers, US merchant categories. Must extend (not replace) Transaction type with Razorpay-specific fields while keeping existing fields backward-compatible.

**RISK-08: Gemini model name `gemini-3.6-flash` is likely invalid.**
This model identifier may not exist in the current Gemini API. Should be updated to a verified model name (e.g., `gemini-2.0-flash-exp` or `gemini-2.5-flash-preview`).

**RISK-09: Qdrant is fully simulated.**
The vector search engine is entirely simulated. It is NOT connected to a real Qdrant instance. This is acceptable for demo, but should be clearly documented.

### Medium Risks

**RISK-10: Settings page does not persist to server.**
Risk thresholds set in `SettingsPage.tsx` are local React state. They do not affect the ML engine.

**RISK-11: Frontend initializes with hardcoded sample data.**
`TransactionContext.tsx:38` initializes state with static `INITIAL_TRANSACTIONS` before server fetch completes. This causes a flash of stale data and should be replaced with loading state.

**RISK-12: Firestore adapter uses client-side Firebase SDK on the server.**
`FirestoreAdapter` imports from `firebase/firestore` (browser/client SDK). Server-side Firestore should use `firebase-admin`. This is not critical if Firestore is not the primary adapter for the Razorpay demo path.

**RISK-13: Graph engine is frontend-only.**
The graph visualization builds data entirely from the frontend's transaction list. For a real fraud network demonstration, the graph should be connected to server-side relationship data.

---

## 14. Recommended Implementation Order

### Tier 1: Foundation (additive, no breaking changes)
1. Phase 2: Razorpay integration module (`server/integrations/razorpay/`)
2. Phase 4: Extend Transaction type + DB schema with Razorpay fields

### Tier 2: Core Pipeline (depends on Tier 1)
3. Phase 3: Webhook endpoint + signature verification + idempotency
4. Phase 19: Ensure PostgreSQL is primary store for Razorpay path (no silent memory fallback)

### Tier 3: Intelligence Upgrade (depends on Tier 2)
5. Phase 5: INR-aware risk engine (currency-normalized baselines)
6. Phase 6: DB-backed behavioral baselines (replace hardcoded $150)
7. Phase 7: Merchant risk aggregation
8. Phase 8: Connect graph engine to real DB transaction relationships

### Tier 4: AI Upgrade (depends on Tier 3)
9. Phase 9: Map agents to Razorpay payment responsibilities
10. Phase 10: AI investigator with Razorpay payment context
11. Phase 11: Risk policy engine (DB-persisted, per-tenant)
12. Phase 12: Decision engine (ALLOW/REVIEW/MITIGATE output)

### Tier 5: Security (parallel with Tier 3)
13. Phase 18: Server-side auth middleware + tenant isolation

### Tier 6: Frontend Upgrade (depends on Tier 4 & 5)
14. Phase 13: Risk Command Center dashboard with real data
15. Phase 14: Transaction investigation page with Razorpay fields
16. Phase 15: Razorpay integration status UI
17. Phase 16: Real-time SSE push for dashboard updates
18. Phase 17: Human analyst review workflow

### Tier 7: Validation
19. Phase 20: Webhook tests, tenant isolation tests, policy tests
20. Phase 21: Demo mode with deterministic scenarios
21. Phase 22: Deployment (Modal public HTTPS for webhook)
22. Phase 24: Final audit

---

## Appendix A: Environment Variables Required for Razorpay

```bash
# Server-side ONLY — NEVER expose to frontend (no VITE_ prefix)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=<your-secret>
RAZORPAY_WEBHOOK_SECRET=<your-webhook-secret>
```

These must be added to:
- `.env.example` (as empty placeholders)
- Modal Secrets (`modal secret create risklens-secrets`)
- Local `.env` for development (never committed to git)

---

## Appendix B: Razorpay Webhook Event Flow (Target)

```
Razorpay
   ↓ POST /api/webhooks/razorpay
   ↓ Headers: X-Razorpay-Signature: <hmac>

server.ts
   ↓ express.raw() captures raw Buffer BEFORE express.json()

webhook.routes.ts → webhook.controller.ts
   ↓ 1. Extract raw body and signature header
   ↓ 2. HMAC-SHA256 verify(rawBody, secret) == signature → if fail, return 400
   ↓ 3. Parse JSON from raw body
   ↓ 4. Validate event type (payment.captured, payment.failed, etc.)
   ↓ 5. Check webhook_events table for duplicate event.id → if exists, return 200 (idempotent)
   ↓ 6. INSERT into webhook_events (event_id, event_type, payload, processed_at)
   ↓ 7. Return HTTP 200 IMMEDIATELY

Async queue / background:
   ↓ 8. Extract payment data from event payload
   ↓ 9. Map to Transaction model (with razorpayPaymentId, razorpayOrderId, etc.)
   ↓ 10. Persist to transactions table (PostgreSQL)
   ↓ 11. Trigger risk analysis pipeline (existing 8-agent swarm)
   ↓ 12. Update transaction with risk_score, risk_tier, risk_decision
   ↓ 13. Evaluate risk policies (policy engine)
   ↓ 14. Generate alerts if HIGH/CRITICAL
   ↓ 15. Push to SSE stream for live dashboard update
```

---

*Phase 1 audit complete. No source code was modified. Ready to proceed to Phase 2.*
