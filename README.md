# 🛡️ RiskLens AI

<div align="center">

### Real-Time AI-Powered Financial Risk Intelligence & Fraud Prevention

**From payment event → fraud intelligence → explainable risk decision**

[![CI](https://github.com/VardhanReddy024/RiskLensAI/actions/workflows/ci.yml/badge.svg)](https://github.com/VardhanReddy024/RiskLensAI/actions/workflows/ci.yml)
[![CD](https://github.com/VardhanReddy024/RiskLensAI/actions/workflows/cd.yml/badge.svg)](https://github.com/VardhanReddy024/RiskLensAI/actions/workflows/cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![TypeScript](https://img.shields.io/badge/TypeScript-Node.js-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Persistence-blue)
![Razorpay](https://img.shields.io/badge/Razorpay-Test%20Mode-0C2451)
![AI](https://img.shields.io/badge/AI-Gemini-orange)

[Live Application](https://risklens-platform.vercel.app/) •
[Razorpay Integration](https://risklens-platform.vercel.app/razorpay) •
[GitHub Repository](https://github.com/VardhanReddy024/RiskLensAI)

</div>

---

## 🚀 What is RiskLens AI?

**RiskLens AI** is an AI-powered real-time financial risk intelligence platform designed to help merchants identify potentially fraudulent transactions, understand **why a payment is risky**, and make informed **ALLOW, REVIEW, or BLOCK** decisions before financial loss occurs.

Instead of stopping at a simple *fraud / not-fraud* prediction, RiskLens AI transforms payment events into actionable risk intelligence through:

- 💳 Real payment-event ingestion
- 🔐 Secure webhook verification
- 🧠 Fraud probability estimation
- 📊 Real-time risk scoring
- 🚦 ALLOW / REVIEW / BLOCK decisioning
- 🤖 AI-assisted investigation
- 🔎 Explainable risk factors
- 🗄️ Persistent transaction intelligence
- 🧾 Auditable decision history
- 🏢 Tenant-aware data isolation

The goal is simple:

> **Turn every payment event into an explainable, actionable risk decision.**

---

# 🎯 The Problem

Financial fraud is not just a classification problem.

When a suspicious payment occurs, a merchant needs answers:

- What happened?
- How risky is this payment?
- Why is it considered risky?
- Which signals contributed to the decision?
- Should the payment be allowed, reviewed, or blocked?
- What evidence supports the recommendation?
- Can the decision be investigated later?
- Is there an auditable history of what happened?

Traditional systems often stop at:

```text
Transaction
     ↓
Fraud / Legitimate
```

RiskLens AI is designed to go further:

```text
Transaction
     ↓
Risk Signals
     ↓
Fraud Probability
     ↓
Risk Score
     ↓
Risk Explanation
     ↓
ALLOW / REVIEW / BLOCK
     ↓
AI Investigation
     ↓
Audit Trail
```

---

# 💳 Razorpay × RiskLens AI

One of the primary integrations in RiskLens AI is **Razorpay Test Mode**.

Razorpay acts as a real payment-event source while RiskLens AI acts as the **risk intelligence layer** around the payment flow.

## End-to-End Payment Risk Flow

```text
┌───────────────────────────┐
│    Razorpay Test Mode     │
│                           │
│       Test Payment        │
└─────────────┬─────────────┘
              │
              │ payment.captured
              │
              ▼
┌───────────────────────────┐
│    RiskLens AI Webhook    │
│                           │
│   HMAC-SHA256 Verification│
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│   Transaction Processing  │
│                           │
│  • Validate payload       │
│  • Normalize payment      │
│  • Prevent duplicates     │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│        PostgreSQL         │
│                           │
│ Authoritative Persistence │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│      Fraud Risk Engine    │
│                           │
│  • Fraud Probability      │
│  • Risk Score             │
│  • Risk Factors           │
└─────────────┬─────────────┘
              │
              ▼
       ┌──────┼──────┐
       │      │      │
       ▼      ▼      ▼
     ALLOW  REVIEW  BLOCK
              │
              ▼
┌───────────────────────────┐
│      AI Investigation     │
│                           │
│ Explanation + Evidence    │
│ + Recommended Action      │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│    RiskLens Dashboard     │
│                           │
│ Payment + Risk + AI +     │
│ Investigation + Audit     │
└───────────────────────────┘
```

---

## 🔐 Secure Razorpay Webhook Processing

RiskLens AI's Razorpay webhook boundary is designed around secure server-side processing.

It includes:

- HMAC-SHA256 webhook signature verification
- Raw request-body verification
- Timing-safe signature comparison
- Invalid-signature rejection
- Payload validation
- Unsupported-event handling
- INR/paise normalization
- Sequential duplicate protection
- Concurrent duplicate protection
- Atomic webhook-event claiming
- PostgreSQL persistence
- Audit logging
- Explicit Razorpay Test/Live mode configuration

### Why Idempotency Matters

Payment providers can deliver the same webhook more than once.

RiskLens AI prevents duplicate events from creating duplicate financial transactions.

```text
Razorpay Event
      │
      ├───────────────┐
      ▼               ▼
Delivery #1       Delivery #2
      │               │
   Processed       Duplicate
      │               │
      └───────┬───────┘
              ▼
      ONE Transaction
```

---

# 🔎 Real-Time Transaction Intelligence

After a supported payment event is received, RiskLens AI converts it into structured risk intelligence.

A transaction can contain information such as:

```text
Payment ID
Amount
Currency
Payment Method
Payment Status
Timestamp
Merchant Context

        ↓

Fraud Probability
Risk Score
Risk Tier
Risk Factors
Recommended Decision

        ↓

AI Investigation
Audit History
```

Example risk output:

```text
Payment
₹7,499 INR

Fraud Probability
0.87

Risk Score
87 / 100

Risk Tier
HIGH

Decision
BLOCK
```

---

# 🧠 Fraud Detection Engine

RiskLens AI includes a reproducible tabular fraud-classification layer.

The current development implementation uses a deterministic **binary logistic-regression classifier** trained and evaluated through a reproducible repository workflow.

## Current Model Signals

The model currently evaluates transaction-related signals including:

| Signal | Purpose |
|---|---|
| Amount Ratio | Detect unusual transaction amounts |
| Distance Anomaly | Identify abnormal geographic behavior |
| Device Risk | Measure device-level risk |
| New Device | Detect first-time/unrecognized devices |
| Network Reputation | Evaluate network risk |
| Merchant Category Risk | Incorporate merchant-context risk |
| Authentication Risk | Evaluate authentication confidence |
| Irreversible Payment Rail | Account for payment reversibility risk |

---

## 🚦 Risk Decision Engine

RiskLens AI converts fraud probability into an actionable recommendation.

```text
                 Fraud Probability
                        │
          ┌─────────────┼─────────────┐
          │             │             │
       < 0.30      0.30 – < 0.75    ≥ 0.75
          │             │             │
          ▼             ▼             ▼
       🟢 ALLOW      🟠 REVIEW      🔴 BLOCK
```

| Fraud Probability | Decision | Meaning |
|---|---|---|
| `< 0.30` | 🟢 ALLOW | Low-risk transaction |
| `0.30 – < 0.75` | 🟠 REVIEW | Requires additional review |
| `≥ 0.75` | 🔴 BLOCK | High-risk transaction |

For compatibility with the existing payment-risk API contract, a model-level `BLOCK` decision maps to the application's existing `REJECT` contract where required.

---

# 📊 Reproducible Fraud Model Evaluation

RiskLens AI includes a reproducible evaluation pipeline.

Run:

```bash
npm run model:evaluate
```

The current development dataset contains:

```text
Total synthetic transactions : 500
Training set                 : 429
Strict held-out test set     : 71
```

The held-out labels are not used during model training or prediction.

## Current Held-Out Evaluation

| Metric | Result |
|---|---:|
| ROC-AUC | `1.0000` |
| Precision | `1.0000` |
| Recall | `0.9333` |
| F1 Score | `0.9655` |
| False Positive Rate | `0.0000` |
| True Positives | `28` |
| True Negatives | `41` |
| False Positives | `0` |
| False Negatives | `2` |

### Confusion Matrix

```text
                     Predicted

                  Fraud   Legitimate
Actual Fraud        28        2
Actual Legitimate    0       41
```

### False-Positive Cost

The development evaluation currently uses an explicit assumption of:

```text
$25 cost per legitimate transaction
incorrectly classified as fraud.
```

With the current synthetic held-out evaluation:

```text
False Positives = 0
Estimated False-Positive Cost = $0
```

> **Important:** These results are measured on reproducibly generated **synthetic development data**. They are not claims of production merchant performance or guaranteed real-world fraud-detection accuracy.

---

# 🤖 AI-Assisted Investigation

RiskLens AI is designed to provide more than a numerical risk score.

The investigation layer helps answer:

> **Why was this transaction considered risky?**

The investigation workflow can combine transaction signals, risk factors, behavioral context, and AI-assisted reasoning to produce a structured investigation.

```text
Transaction
     │
     ▼
Risk Signals
     │
     ▼
Fraud Detection
     │
     ▼
Risk Factors
     │
     ▼
AI Investigation
     │
     ├── Evidence
     ├── Explanation
     ├── Risk Context
     └── Recommended Action
     │
     ▼
Investigation Dossier
```

RiskLens AI distinguishes real AI execution from fallback behavior where applicable so that synthetic or fallback output is not silently presented as authoritative AI analysis.

---

# 🧾 Explainable Risk Intelligence

A fraud score alone is not enough for a high-stakes financial decision.

RiskLens AI is designed to surface the factors contributing to a risk decision.

Example:

```text
Risk Score: 87 / 100
Risk Tier : HIGH
Decision  : BLOCK

Contributing Signals

⚠ Elevated device risk
⚠ Abnormal transaction amount
⚠ Network reputation anomaly
⚠ Authentication risk
⚠ New-device behavior
```

This makes risk decisions easier to:

- understand
- investigate
- review
- audit
- communicate

---

# 🗄️ PostgreSQL — Authoritative Persistence

PostgreSQL is the authoritative configured production datastore for RiskLens AI.

It supports persistent storage for core application data such as:

- Transactions
- Razorpay webhook events
- Audit records
- Investigation data
- Tenant-scoped records

The PostgreSQL layer includes support for:

- Relational persistence
- Unique constraints
- Transaction consistency
- Rollback behavior
- Webhook-event uniqueness
- Tenant-scoped access
- Idempotent event processing
- Persistent audit history

Production configuration is designed to use:

```env
DATA_STORE_PROVIDER=postgres
STRICT_DATABASE=true
```

In strict production mode, database failures should be surfaced rather than silently represented as successful persistence.

---

# 🏢 Multi-Tenant Security

RiskLens AI is designed as a tenant-aware financial-risk platform.

Security boundaries include:

```text
Authenticated User
        │
        ▼
Server-Side Identity Verification
        │
        ▼
Tenant Membership Resolution
        │
        ▼
Authorization
        │
        ▼
Tenant-Scoped Data Access
```

Tenant isolation applies to protected financial information and is intended to prevent one merchant/user context from accessing another merchant's transaction intelligence.

---

# 🔐 Security Architecture

Financial systems require defense in depth.

RiskLens AI incorporates security controls across authentication, APIs, payments, and persistence.

## Authentication

- Firebase Authentication
- Google Sign-In
- Server-side token validation
- Issuer validation
- Audience validation
- Expiration validation
- Server-side membership resolution

## API Security

- Helmet security headers
- CORS controls
- Rate limiting
- Request validation
- Structured error handling
- Request IDs
- Structured logging
- Parameterized SQL

## Payment Security

- HMAC-SHA256 signature verification
- Timing-safe signature comparison
- Raw webhook-body verification
- Invalid-signature rejection
- Idempotent webhook processing
- Concurrent duplicate protection
- Explicit Razorpay mode configuration

## Data Security

- PostgreSQL persistence
- Tenant-scoped queries
- Server-authoritative authorization
- Audit logging
- Strict database mode

---

# 🏗️ System Architecture

```text
                              ┌──────────────────────┐
                              │   Razorpay Test Mode │
                              │                      │
                              │    Payment Events    │
                              └──────────┬───────────┘
                                         │
                                  HTTPS Webhook
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │   RiskLens Backend   │
                              │                      │
                              │   Node.js + Express  │
                              └──────────┬───────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
           ┌────────────────┐   ┌────────────────┐   ┌────────────────┐
           │ Fraud Detector │   │   Gemini AI    │   │   PostgreSQL   │
           │                │   │                │   │                │
           │ Probability    │   │ Investigation  │   │ Transactions   │
           │ Risk Score     │   │ Explanation    │   │ Webhooks       │
           │ Decision       │   │ Evidence       │   │ Audit Records  │
           └────────┬───────┘   └────────┬───────┘   └────────┬───────┘
                    │                    │                    │
                    └────────────────────┼────────────────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │  Risk Intelligence   │
                              │                      │
                              │ ALLOW/REVIEW/BLOCK   │
                              └──────────┬───────────┘
                                         │
                                         ▼
                              ┌──────────────────────┐
                              │ RiskLens Dashboard   │
                              │                      │
                              │ React + Vite         │
                              └──────────────────────┘
```

---

# ☁️ Deployment Architecture

The target production architecture is:

```text
                    ┌──────────────────┐
                    │      GitHub      │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  GitHub Actions  │
                    │                  │
                    │ Tests            │
                    │ Lint             │
                    │ Build            │
                    │ Model Evaluation │
                    └────────┬─────────┘
                             │
                 ┌───────────┴───────────┐
                 │                       │
                 ▼                       ▼
        ┌─────────────────┐     ┌─────────────────┐
        │     Vercel      │     │      Modal      │
        │                 │     │                 │
        │    Frontend     │     │     Backend     │
        └────────┬────────┘     └────────┬────────┘
                 │                       │
                 └───────────┬───────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │    PostgreSQL    │
                    │                  │
                    │ Persistent Data  │
                    └──────────────────┘
```

### Frontend

**Vercel**

React + Vite application.

### Backend

**Modal**

Node.js / Express API exposed through the Modal deployment wrapper.

### Database

**PostgreSQL**

Authoritative relational persistence layer.

---

# 🌐 Project Links

### 🚀 Live Application

**https://risklens-platform.vercel.app/**

### 💳 Razorpay Integration Dashboard

**https://risklens-platform.vercel.app/razorpay**

### 💻 GitHub Repository

**https://github.com/VardhanReddy024/RiskLensAI**

### ⚡ Backend Target

**https://rvardhan791--risklens-ai-backend-run-server.modal.run**

> The frontend URL returned HTTP 200 during the latest local verification. The documented Modal backend health endpoints returned HTTP 404, so backend deployment is not verified.

---

# 📁 Project Structure

```text
RiskLensAI/
│
├── server/
│   ├── agents/
│   │   └── AI investigation & risk agents
│   │
│   ├── config/
│   │   └── Runtime configuration
│   │
│   ├── controllers/
│   │   └── HTTP request/response boundaries
│   │
│   ├── db/
│   │   ├── adapters/
│   │   │   ├── PgAdapter
│   │   │   ├── FirestoreAdapter
│   │   │   └── InMemoryAdapter
│   │   │
│   │   └── repositories/
│   │       ├── TransactionRepository
│   │       ├── AuditLogRepository
│   │       └── DossierRepository
│   │
│   ├── middleware/
│   │   └── Auth, security, validation & tracing
│   │
│   ├── routes/
│   │   └── Express API routes
│   │
│   └── services/
│       ├── Razorpay processing
│       ├── Risk intelligence
│       ├── Investigation
│       └── Gemini integration
│
├── src/
│   ├── components/
│   │   ├── Dashboard
│   │   ├── Transactions
│   │   ├── Investigations
│   │   └── Risk visualizations
│   │
│   ├── context/
│   │   ├── Authentication
│   │   ├── Transactions
│   │   └── Investigations
│   │
│   ├── lib/
│   │   ├── Fraud model
│   │   ├── Firebase
│   │   └── API client
│   │
│   ├── test/
│   │   └── Unit & integration tests
│   │
│   └── types/
│       └── TypeScript domain models
│
├── modal_app.py
├── docker-compose.test.yml
├── vercel.json
├── package.json
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── cd.yml
│
└── README.md
```

---

# ⚙️ Environment Configuration

Create a `.env` file for local development.

> **Never commit private API keys, database credentials, webhook secrets, or server credentials to GitHub.**

Example:

```env
# ─────────────────────────────
# Runtime
# ─────────────────────────────

NODE_ENV=development
PORT=3000
LOG_LEVEL=INFO


# ─────────────────────────────
# PostgreSQL
# ─────────────────────────────

DATA_STORE_PROVIDER=postgres
STRICT_DATABASE=true

DATABASE_URL=postgresql://user:password@localhost:5432/risklens


# ─────────────────────────────
# Razorpay
# ─────────────────────────────

RAZORPAY_MODE=test

RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret


# ─────────────────────────────
# Gemini
# ─────────────────────────────

GEMINI_API_KEY=your_gemini_api_key


# ─────────────────────────────
# Frontend API
# ─────────────────────────────

VITE_API_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3000


# ─────────────────────────────
# Firebase Public Client Config
# ─────────────────────────────

VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Production secrets should be configured through the deployment platform's secret-management system.

---

# 💻 Local Development

Clone the repository:

```bash
git clone https://github.com/VardhanReddy024/RiskLensAI.git
```

Enter the project:

```bash
cd RiskLensAI
```

Install dependencies:

```bash
npm install
```

Configure the required environment variables.

Start development:

```bash
npm run dev
```

---

# 🧪 Testing & Verification

Run the complete automated test suite:

```bash
npm test
```

Run lint:

```bash
npm run lint
```

Create the production build:

```bash
npm run build
```

Evaluate the fraud model:

```bash
npm run model:evaluate
```

Run the raw dependency security analysis (currently reports the documented xlsx exception):

```bash
npm audit --audit-level=high
```

The CI release gate is `npm run security:audit`; it fails on any vulnerability other than the documented, mitigated `xlsx` exception.

---

# 📈 Current Engineering Verification

The current development branch has reached:

| Verification | Current State |
|---|---|
| PostgreSQL | ✅ Verified |
| Razorpay webhook E2E | ✅ Verified |
| HMAC verification | ✅ Verified |
| Sequential idempotency | ✅ Verified |
| Concurrent idempotency | ✅ Verified |
| INR normalization | ✅ Verified |
| Fraud classifier | ✅ Implemented |
| Held-out model evaluation | ✅ Implemented |
| Risk decisioning | ✅ Implemented |
| Tenant isolation | ✅ Verified for covered tests |
| Lint | ✅ Pass |
| Production build | ✅ Pass |
| Full automated suite | ✅ Pass  |
| Firebase production verification | ⚠️ Not remotely verified |
| Modal production verification | ❌ Health endpoints returned 404 |
| Production security hardening | ⚠️ Conditional: xlsx exception remains |

The remaining engineering work is being tracked as part of the final production-hardening phase.

---

# 🔄 CI/CD

RiskLens AI uses GitHub Actions for automated engineering verification.

The target release pipeline is:

```text
Git Push
   │
   ▼
GitHub Actions
   │
   ├── Install Dependencies
   │
   ├── PostgreSQL Test Environment
   │
   ├── Automated Tests
   │
   ├── Lint
   │
   ├── Production Build
   │
   ├── Fraud Model Evaluation
   │
   └── Security Checks
   │
   ▼
Deployment
   │
   ├── Vercel → Frontend
   │
   └── Modal  → Backend
                    │
                    ▼
              PostgreSQL
```

The goal is to make deployment reproducible without requiring the application to be manually started on the developer's machine.

---

# ⚡ Modal Backend Deployment

Install Modal:

```bash
pip install modal
```

Authenticate:

```bash
modal setup
```

Configure server-side secrets using Modal's secret-management system.

Then deploy:

```bash
modal deploy modal_app.py
```

Sensitive production configuration must never be committed to source control.

---

# 🧪 Razorpay Test Mode Demonstration

The intended demonstration flow is:

### 1. Create a Razorpay Test Mode payment

```text
Razorpay Test Mode
        ↓
Payment Captured
```

### 2. Razorpay sends the webhook

```text
payment.captured
        ↓
RiskLens AI
```

### 3. RiskLens AI verifies the webhook

```text
Raw Body
   +
Webhook Secret
   ↓
HMAC-SHA256
   ↓
Signature Verification
```

### 4. Payment is persisted

```text
Verified Payment
       ↓
PostgreSQL
```

### 5. RiskLens AI analyzes the payment

```text
Transaction Signals
        ↓
Fraud Model
        ↓
Fraud Probability
        ↓
Risk Score
```

### 6. Decision is generated

```text
LOW
 ↓
ALLOW

MEDIUM
 ↓
REVIEW

HIGH
 ↓
BLOCK
```

### 7. Merchant sees the result

```text
RiskLens Dashboard

Payment Details
      +
Risk Score
      +
Risk Factors
      +
Decision
      +
AI Investigation
      +
Audit Trail
```

---

# 🏆 AI Risk Manager Use Case

RiskLens AI is designed around a defensive financial-risk use case:

> **Help merchants identify potentially fraudulent payment activity before it becomes financial loss.**

The platform combines:

```text
Secure Payment Events
          +
Fraud Classification
          +
Risk Scoring
          +
Explainability
          +
AI Investigation
          +
Actionable Decisioning
          +
Auditability
```

RiskLens AI is strictly designed for **defensive fraud detection and financial-risk analysis**.

---

# 🔬 Responsible AI & Transparency

RiskLens AI treats transparency as a core product requirement.

The system is designed to distinguish between:

- Real payment events
- Synthetic development transactions
- Measured model results
- Development assumptions
- Real AI execution
- Fallback behavior
- Verified integrations
- Unverified production dependencies

### Model Transparency

Current fraud-model metrics are measured using synthetic development data.

They should **not** be interpreted as:

- guaranteed fraud-prevention performance
- real merchant accuracy
- real financial savings
- production-scale benchmarking

The evaluation exists to make model behavior measurable and reproducible.

---

# 🗺️ Road to Production

Current finalization work focuses on:

- Resolving remaining automated-test failures
- Dependency security remediation
- Firebase production verification
- Modal production verification
- Managed PostgreSQL production connectivity
- External Razorpay Test Mode verification
- Deployment smoke testing
- Final CI/CD release validation

No component is considered production-verified solely because it works in a local test environment.

---

# ⚠️ Disclaimer

RiskLens AI is an independent engineering and research project.

Razorpay is used through its payment APIs and Test Mode integration for development and demonstration purposes.

**RiskLens AI is not an official Razorpay product and does not imply partnership, sponsorship, or endorsement by Razorpay.**

Fraud-model metrics shown in this repository are based on synthetic development data and are not representations of real-world merchant performance.

---

# 📄 License

This project is licensed under the **MIT License**.

---

<div align="center">

## 🛡️ RiskLens AI

### Detect Risk. Explain Decisions. Protect Payments.

**Real-Time Financial Risk Intelligence**

[Live Application](https://risklens-platform.vercel.app/) •
[Razorpay Integration](https://risklens-platform.vercel.app/razorpay) •
[Repository](https://github.com/VardhanReddy024/RiskLensAI)

</div>
