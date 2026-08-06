# RiskLens AI — Enterprise Financial Fraud Investigation & Intelligence Platform

> **Predict Fraud. Prevent Loss. Protect Trust.**

RiskLens AI is an autonomous, multi-agent financial crime investigation and real-time fraud mitigation platform. Powered by Google Gemini 2.5 Flash, an XGBoost ML risk engine, Qdrant vector memory retrieval, and 8 specialized autonomous agents working in consensus, RiskLens AI enables enterprise fraud teams and compliance officers to detect anomalous transactions, explain suspicious patterns in plain English, generate FinCEN-compliant Suspicious Activity Reports (SAR), and take high-speed defensive action.

---

## 🏛️ Architecture Overview

RiskLens AI employs a layered consensus architecture that unifies heuristic rules, machine learning risk inference, vector similarity search over historical fraud typologies, and generative AI explainability:

```
[ Financial Ingestion Stream / CSV Upload ]
                    │
                    ▼
       ┌─────────────────────────┐
       │   XGBoost ML Risk Core  │ ──► Heuristic & Feature Drift Scoring
       └─────────────────────────┘
                    │
                    ▼
 ┌─────────────────────────────────────────────────────────────┐
 │         Multi-Agent Autonomous Consensus Pipeline           │
 │                                                             │
 │  1. Fraud Detector Agent        5. Compliance & AML Agent   │
 │  2. Behavior Pattern Analyzer   6. Action Recommender Agent │
 │  3. Vector Case Retriever       7. Report Generator Agent   │
 │  4. SHAP Explainability Agent   8. Supervisor Orchestrator  │
 └─────────────────────────────────────────────────────────────┘
                    │
                    ▼
  ┌─────────────────────────────────┐
  │ Google Gemini 2.5 Intelligence  │ ──► Plain-English Case Rationales & SAR Drafting
  └─────────────────────────────────┘
                    │
                    ▼
[ Interactive Investigation Console / Real-Time Surveillance / SAR Dossier ]
```

---

## 🚀 Key Features

- **RiskLens Command Center**: Live KPI telemetry monitoring total throughput, flagged volume, prevented losses, and agent consensus latency.
- **Live Surveillance Monitoring**: Real-time streaming transaction feed with instant threat classification, severity filtering, and risk velocity meters.
- **Automated Dataset Ingestion**: Drag-and-drop CSV parser supporting high-volume financial logs with automatic schema normalization and batch ML evaluation.
- **Deep 8-Agent Investigation Hub**:
  - Interactive multi-agent consensus telemetry with step-by-step reasoning.
  - Interactive SHAP waterfall factor attribution breakdown.
  - Vector similarity search retrieving matched historical fraud typologies from Qdrant.
  - Plain-English Gemini explainability summarizing *why* a transaction was flagged.
  - AI Investigator Copilot for interactive natural language queries.
- **Regulatory Compliance & SAR Generator**: Instant generation of structured FinCEN Suspicious Activity Reports with exportable investigation dossiers.
- **Immutable Audit Logging**: Strict compliance logging tracking analyst approvals, blocks, and SAR triggers.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | React 19, TypeScript, Vite |
| **Styling & UI** | Tailwind CSS v4, Lucide React, Motion (Framer Motion) |
| **Data Visualization** | Recharts, SVG Gauge Visualizers, SHAP Waterfall charts |
| **Backend & APIs** | Express, Node.js (TypeScript type-stripping / esbuild) |
| **AI & LLM** | Google GenAI SDK (`@google/genai`), Gemini 2.5 Flash |
| **ML & Vector Memory** | Client/Server XGBoost feature engine, Qdrant vector store simulator |
| **Auth & Security** | Google AI Studio SSO integration, Firebase Authentication & Firestore |

---

## 🤖 Specialized AI Agents Pipeline

1. **Supervisor Orchestrator (`orchestrator.ts`)**: Manages the end-to-end consensus workflow, distributing workloads across child agents and assembling the unified risk dossier.
2. **Fraud Detector Agent (`fraud_detector.ts`)**: Evaluates instantaneous velocity, geographical hops, anomalous IP addresses, and gateway anomalies.
3. **Behavior Analyzer Agent (`behavior_analyzer.ts`)**: Compares transaction characteristics against the cardholder's 90-day baseline spend patterns.
4. **Vector Case Retriever (`case_retriever.ts`)**: Queries vector memory for semantically matched historical fraud patterns (e.g., SIM swap, card testing).
5. **Explainability Agent (`explainability.ts`)**: Generates feature importance weights (SHAP values) and synthesizes plain-English risk rationales.
6. **Compliance Checker Agent (`compliance_checker.ts`)**: Audits transactions against AML thresholds, BSA structuring rules, and FinCEN SAR triggers.
7. **Recommender Agent (`recommender.ts`)**: Formulates prescriptive remediation actions (e.g., instant freeze, step-up MFA, manual review).
8. **Report Generator Agent (`report_generator.ts`)**: Compiles official, audit-ready regulatory SAR filings and executive investigation briefs.

---

## 📂 Project Directory Structure

```
├── .env.example                  # Environment configuration template
├── firestore.rules               # Production Firestore security rules
├── vercel.json                   # Vercel deployment & routing configuration
├── package.json                  # Node.js project manifest and scripts
├── server.ts                     # Express backend & API routes entry point
├── server/
│   ├── agents/                   # Autonomous AI agent implementations
│   │   ├── orchestrator.ts       # Supervisor consensus orchestrator
│   │   ├── fraud_detector.ts     # ML fraud detection agent
│   │   ├── behavior_analyzer.ts  # Behavioral spending analysis
│   │   ├── case_retriever.ts     # Qdrant vector memory search
│   │   ├── explainability.ts     # SHAP explainability synthesis
│   │   ├── compliance_checker.ts # AML/BSA compliance validator
│   │   ├── recommender.ts        # Prescriptive action engine
│   │   └── report_generator.ts   # SAR filing & brief generator
│   ├── gemini.ts                 # Google GenAI SDK integration & copilot
│   ├── ml_engine.ts              # XGBoost feature calculation engine
│   └── qdrant.ts                 # Vector memory storage & similarity search
├── src/
│   ├── components/
│   │   ├── common/               # Badges, gauges, SHAP waterfall charts
│   │   ├── layout/               # Header, Sidebar, Navigation
│   │   ├── modals/               # SAR export & quick action modals
│   │   └── pages/                # Command Center, Monitoring, Investigation, etc.
│   ├── context/                  # Auth, Transaction, and Investigation React contexts
│   ├── data/                     # Sample datasets and historical case typologies
│   ├── types/                    # Shared TypeScript interfaces & types
│   ├── App.tsx                   # Main React root application
│   └── main.tsx                  # Client entry point
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root based on `.env.example`:

```env
# Server & AI Credentials
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000

# Optional: Firebase Client Configuration (For standalone external deployment)
# VITE_FIREBASE_API_KEY=your_firebase_api_key_here
# VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
# VITE_FIREBASE_PROJECT_ID=your_project_id
# VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
# VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
# VITE_FIREBASE_APP_ID=your_app_id
```

---

## 💻 Local Development & Installation

### Prerequisites
- Node.js 18+ or 20+
- npm, yarn, or pnpm

### Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-org/risklens-ai.git
   cd risklens-ai
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   ```bash
   cp .env.example .env
   # Add your GEMINI_API_KEY in .env
   ```

4. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open your browser at `http://localhost:3000`.

5. **Build for Production**:
   ```bash
   npm run build
   ```

6. **Run Production Server**:
   ```bash
   npm start
   ```

---

## 🌐 Deployment Guides

### 1. Google Cloud Run (Containerized Full-Stack)

RiskLens AI includes a full-stack Express server with automated static asset bundling:

1. Build container image:
   ```bash
   gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/risklens-ai
   ```
2. Deploy to Cloud Run:
   ```bash
   gcloud run deploy risklens-ai \
     --image gcr.io/YOUR_PROJECT_ID/risklens-ai \
     --platform managed \
     --region us-central1 \
     --set-env-vars GEMINI_API_KEY=your_api_key,NODE_ENV=production \
     --allow-unauthenticated
   ```

### 2. Vercel (SPA Deployment)

The repository includes `vercel.json` configured for single-page application routing:

1. Push your repository to GitHub.
2. Import the project in Vercel.
3. Set `Build Command` to `vite build` and `Output Directory` to `dist`.
4. Add environment variables (`GEMINI_API_KEY`, etc.) in the Vercel project settings.
5. Deploy.

### 3. Firebase Hosting & Firestore

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init
   ```
2. Deploy Firestore security rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Deploy frontend assets to Firebase Hosting:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## 🔒 Security & Compliance

- **No Secrets in Client Code**: All Gemini API interactions and agent inferences execute strictly server-side via Express API endpoints (`/api/*`).
- **Strict Role-Based Access Control (RBAC)**: Supports Senior Fraud Analyst, Compliance Officer, and Admin privilege levels.
- **Immutable Audit Trail**: Actions taken on flagged cases (Rejection, Approval, SAR Generation) are logged with cryptographically verifiable timestamps and analyst IDs.
- **Least-Privilege Firestore Rules**: Out-of-the-box `firestore.rules` preventing unauthorized read/write access and protecting user data.

---

## 📄 License

This project is licensed under the Apache 2.0 License.
