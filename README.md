# RiskLens AI

[![Build Status](https://github.com/VardhanReddy024/RiskLensAI/actions/workflows/ci.yml/badge.svg)](https://github.com/VardhanReddy024/RiskLensAI/actions/workflows/ci.yml)

[![Tests](https://img.shields.io/badge/tests-92%20passed-success?style=flat&logo=vitest&logoColor=white)](https://github.com/VardhanReddy024/RiskLensAI/actions/workflows/ci.yml)
[![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen?style=flat&logo=vitest&logoColor=white)](https://github.com/VardhanReddy024/RiskLensAI/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Enterprise-Grade Financial Fraud Detection, PostgreSQL Multi-Tenancy & Multi-Agent Intelligence Platform

RiskLens AI is an enterprise financial fraud intelligence platform combining Firebase Google Sign-In, 8-agent AI risk orchestration, explainable graph analytics, real-time ML risk scoring, PostgreSQL relational persistence, and automated CI/CD pipeline verification.

## 🌐 Production URLs & Deployment Architecture

* 🚀 **Live Production Application:** https://risklens-platform.vercel.app/
* ⚡ **Backend API (Modal):** https://rvardhan791--risklens-ai-backend-run-server.modal.run
* 💚 **Backend Health Check:** https://rvardhan791--risklens-ai-backend-run-server.modal.run/api/health
* 💻 **GitHub Repository:** https://github.com/VardhanReddy024/RiskLensAI

### 🏗️ Production Architecture

```text
                    ┌─────────────────────┐
                    │   Vercel Frontend   │
                    │   React + Vite      │
                    └──────────┬──────────┘
                               │
                               │ HTTPS API
                               ▼
                    ┌─────────────────────┐
                    │   Modal Backend     │
                    │   Express + Node.js  │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
          Gemini API         Qdrant          ML Engine
              │                │                │
              └────────────────┼────────────────┘
                               ▼
                       8-Agent AI Swarm
                               │
                               ▼
                   Fraud Investigation
                               │
                               ▼
                  Investigation Dossier
```

> **Authentication:** Firebase Authentication with Google Sign-In.
>
> **Frontend:** Vercel.
>
> **Backend:** Modal Serverless Web Function.
>
> **AI:** Google Gemini + ML Risk Engine + Qdrant Retrieval.
>
> **Current data store:** In-memory fallback for the deployed demo environment.

---

## 🚀 Key Features & Capabilities

- **🔐 Enterprise Authentication**: Firebase Auth + Google Sign-In (`signInWithPopup`) with COOP `same-origin-allow-popups` support and error matching.
- **🤖 8-Agent Swarm Orchestrator**: Autonomous multi-agent pipeline executing specialized risk scoring, behavioral profiling, graph analytics, and compliance checks.
- **🗄️ PostgreSQL Persistence**: Relational storage adapter (`PgAdapter`) for transactions, audit logs, dossiers, and multi-tenant user profiles with automatic in-memory fallback.
- **⚡ Modal Serverless Backend**: Containerized deployment wrapper (`modal_app.py`) running Express on Modal Serverless Web Endpoints without rewriting business logic.
- **🎨 Modern Web UI**: Sleek dark/light visual design system built with React 19, Vite, Tailwind CSS v4, Lucide icons, D3.js, and Recharts.
- **🧪 Comprehensive Testing & CI/CD**: 92 automated tests (Vitest) and GitHub Actions pipeline (`ci.yml`) enforcing linting, builds, security audits, and test coverage on PRs.

---

## 🏗️ Architecture & Codebase Structure

```
├── server/
│   ├── config/                  # Server configuration & fail-fast runtime schema validation
│   ├── db/                      # Repository pattern data store (PgAdapter + Firestore + Memory)
│   │   ├── adapters/            # PgAdapter.ts, FirestoreAdapter.ts, InMemoryAdapter.ts
│   │   ├── repositories/        # TransactionRepository, AuditLogRepository, DossierRepository
│   │   └── seed.ts              # Automated database seeding
│   ├── controllers/             # HTTP boundary & request/response handlers
│   ├── services/                # Business logic & AI agent orchestration
│   ├── routes/                  # Express API routers mounted under /api
│   ├── middleware/              # Security headers (Helmet), CORS, rate limiting, request tracing
│   ├── agents/                  # 8 autonomous multi-agent swarm orchestrator
│   ├── gemini.ts                # Google GenAI SDK integration & Copilot conversational agent
│   └── logger.ts                # Structured JSON logger with correlation IDs & diagnostics
├── src/
│   ├── components/              # Modular UI components (Dashboard, Investigations, Graphs)
│   ├── context/                 # AuthContext, TransactionContext, InvestigationContext
│   ├── lib/                     # Firebase init (firebase.ts), API helper (api.ts), graph engine
│   ├── test/                    # 92 Vitest unit & integration tests
│   └── types/                   # TypeScript interfaces (Transaction, User, Dossier)
├── modal_app.py                 # Modal Serverless Backend deployment configuration
├── vercel.json                  # Vercel SPA routing rewrites configuration
└── .github/workflows/           # GitHub Actions CI/CD workflows (ci.yml, cd.yml)
```

---

## 🔑 Environment Variables Configuration Guide

Create a `.env` file in the root directory (never commit secrets to source control):

```ini
# Server Core
NODE_ENV=production
PORT=3000
LOG_LEVEL=INFO

# Database Provider ('postgres' | 'firestore' | 'memory')
DATA_STORE_PROVIDER=postgres
DATABASE_URL=postgresql://user:password@hostname:5432/risklens

# Server-Side Gemini API Key (Secrets remain on server)
GEMINI_API_KEY=your_gemini_api_key_here

# Client Public Configuration (Vite)
VITE_API_URL=http://localhost:3000
VITE_API_BASE_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=risklens-ai-ae0ac.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=risklens-ai-ae0ac
VITE_FIREBASE_STORAGE_BUCKET=risklens-ai-ae0ac.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1069484804213
VITE_FIREBASE_APP_ID=1:1069484804213:web:71c8b7fa345c0cb945903c
```

---

## 💻 Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/VardhanReddy024/RiskLensAI.git
cd RiskLensAI

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev

# App runs on http://localhost:3000
```

---

## 🧪 Testing & Verification

```bash
# Run static type checking & linting
npm run lint

# Run full Vitest suite (92 tests)
npm run test

# Run test coverage report
npm run test:coverage

# Build production bundle
npm run build
```

---

## ⚡ Deploying Backend to Modal Serverless

```bash
# 1. Install Modal CLI & authenticate
pip install modal
modal setup

# 2. Configure Modal secrets
modal secret create risklens-secrets \
  GEMINI_API_KEY="your-gemini-key" \
  DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
  DATA_STORE_PROVIDER="postgres"

# 3. Deploy Express API backend to Modal
modal deploy modal_app.py
```

---

## 📄 License

This project is licensed under the **MIT License**.
