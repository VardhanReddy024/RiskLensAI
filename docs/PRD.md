# Product Requirements Document (PRD): RiskLens AI

**Version:** 2.0  
**Status:** Production Ready  
**Release:** Hackathon Final  
**Date:** October 26, 2023  

---

## 1. Executive Summary
RiskLens AI is an enterprise-grade, autonomous multi-agent platform designed for high-precision financial fraud detection and forensic investigation. By orchestrating eight specialized AI agents powered by Gemini 2.5 Flash and a native XGBoost/SHAP machine learning engine, the system transforms raw transaction data into comprehensive, audit-ready forensic dossiers. It features a high-performance D3.js relationship graph and a pixel-perfect PDF reporting engine, providing investigators with unprecedented clarity into complex fraud syndicates.

## 2. Problem Statement
Traditional fraud detection systems often operate as "black boxes," providing risk scores without context. Investigators are overwhelmed by high false-positive rates and the manual labor required to synthesize data from disparate sources (behavioral patterns, compliance rules, historical cases). There is a critical need for a system that not only detects fraud but explains *why* it was flagged and automates the generation of regulatory-compliant narratives.

## 3. Goals & Objectives
*   **Autonomous Investigation:** Reduce manual investigation time by 80% through multi-agent orchestration.
*   **Explainable AI (XAI):** Provide mathematical feature attribution (SHAP) for every risk score.
*   **Syndicate Discovery:** Visualize hidden relationships using a 60fps force-directed graph.
*   **Regulatory Readiness:** Automate the generation of FinCEN-compliant SAR narratives.

## 4. Target Users / Stakeholders
*   **Primary User:** Senior Fraud Analyst (Single Production Role).
*   **Stakeholders:** Chief Risk Officers (CRO), Compliance Managers, Financial Intelligence Units (FIU).

## 5. User Journey & Routing
The application follows a strict, secure navigation flow:
1.  **Landing Page:** Executive overview and "Launch Enterprise Console" entry point.
2.  **Authentication Gate:** 
    *   *Scenario A (Google AI Studio):* Automatic session detection and non-blocking authentication.
    *   *Scenario B (Standard):* Firebase Google OAuth 2.0 Login.
3.  **Dashboard:** Centralized view of high-risk transactions and system metrics.
4.  **Investigation:** Deep-dive 8-agent analysis of specific transactions.
5.  **Relationship Graph:** Visual exploration of fraud rings and entity links.
6.  **Logout:** Secure session termination and redirect to Landing Page.

## 6. Functional Requirements

### 6.1. Authentication & Access Control
*   **FR-1.1:** Support Firebase Authentication via Google OAuth 2.0.
*   **FR-1.2:** Implement automatic session restoration for Google AI Studio environments.
*   **FR-1.3:** Enforce a single production role: **Senior Fraud Analyst**.
*   **FR-1.4:** Protect all internal routes (`/dashboard`, `/investigation`, etc.) via React 19 Route Guards.

### 6.2. Multi-Agent Orchestration (The 8-Agent Swarm)
The system must execute the following agents sequentially and concurrently:
*   **Agent 1: Fraud Detector:** Executes XGBoost inference and computes SHAP values.
*   **Agent 2: Behavioral Analyzer:** Evaluates spending baselines and transit velocity.
*   **Agent 3: Case Retriever:** Performs cosine similarity search in Qdrant vector memory.
*   **Agent 4: Explainability Agent:** Converts SHAP factors into natural language.
*   **Agent 5: Compliance Checker:** Validates against OFAC, BSA ($10k threshold), and Reg E.
*   **Agent 6: Recommendation Agent:** Suggests terminal actions (Approve/Reject/Escalate).
*   **Agent 7: Report Generator:** Synthesizes executive summaries using Gemini 2.5 Flash.
*   **Agent 8: Supervisor Orchestrator:** Manages pipeline integrity and seals the final dossier.

### 6.3. Relationship Intelligence Graph
*   **FR-3.1:** Render a 60fps D3.js force-directed graph supporting 500+ nodes.
*   **FR-3.2:** Visualize 12 distinct entity types (Transactions, Devices, IPs, Fraud Rings, etc.).
*   **FR-3.3:** Implement Dijkstra-based pathfinding to identify links between disparate entities.

### 6.4. Forensic Reporting & PDF Engine
*   **FR-4.1:** Generate multi-page vector PDFs using `jsPDF`.
*   **FR-4.2:** Capture high-DPI snapshots of the UI using `html2canvas`.
*   **FR-4.3:** **Color Space Correction:** Implement a recursive DOM scanner to convert Tailwind CSS v4 OKLCH/P3 colors to sRGB to prevent PDF rendering crashes.

## 7. Non-Functional Requirements
*   **Performance:** Graph interactions must maintain 60fps; API responses for batch scoring < 200ms.
*   **Scalability:** Backend must handle 50MB CSV uploads for batch processing.
*   **Reliability:** Deterministic fallback generators for ML scoring if AI quotas are exceeded.
*   **Security:** Server-side isolation of Gemini API keys; HTTPS-only communication.

## 8. System Architecture Overview
The system utilizes a **Hybrid Micro-Monolith** architecture:
*   **Frontend:** React 19 SPA hosted on Vercel.
*   **Backend:** Node.js 22 / Express API hosted on Vercel and Render
*   **AI Layer:** Google Gemini 2.5 Flash via `@google/genai`.
*   **Data Layer:** Firestore (Persistence) + Qdrant (Vector Memory).

## 9. Tech Stack
| Component | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript 5.8, Tailwind CSS v4, Motion 12 |
| **Visuals** | D3.js 7.9, Recharts 3.10, Lucide React |
| **Backend** | Node.js 22, Express 4.21, tsx, esbuild |
| **AI/ML** | Gemini 2.5 Flash, XGBoost (Native), SHAP Math Engine |
| **Database** | Firebase Firestore, Qdrant Vector DB |
| **Deployment** | Vercel (Frontend), Google Cloud Run (Backend) |

## 10. API Specifications
*   `GET /api/health`: System and AI status check.
*   `POST /api/transactions/batch`: Bulk CSV ingestion and ML scoring.
*   `POST /api/investigate/:id`: Trigger 8-agent autonomous pipeline.
*   `POST /api/copilot/chat`: Contextual AI assistant interaction.
*   `POST /api/actions/resolve`: Human-in-the-loop decision logging.

## 11. Security Requirements
*   **Identity:** Firebase Auth with Google OAuth 2.0.
*   **Isolation:** Gemini API keys are never exposed to the client; all AI calls are proxied through the Node.js backend.
*   **Data Protection:** Firestore Security Rules enforce read/write permissions based on authenticated UID.
*   **Audit:** Immutable in-memory audit log for all resolution actions.

## 12. Success Metrics
*   **Accuracy:** >95% precision in identifying known fraud patterns via XGBoost.
*   **Efficiency:** <30 seconds for a full 8-agent forensic dossier generation.
*   **Compliance:** 100% automated coverage of BSA and OFAC rule validation.

## 13. Timeline & Milestones
*   **Phase 1:** Core ML Engine & React 19 Shell (Completed).
*   **Phase 2:** 8-Agent Swarm & Gemini Integration (Completed).
*   **Phase 3:** D3.js Graph & PDF Export Optimization (Completed).
*   **Phase 4:** Hackathon Final Release & Production Deployment (Current).

## 14. Future Enhancements
*   **Isolation Forest:** Implementation of unsupervised anomaly detection for "zero-day" fraud.
*   **External SQL Integration:** Support for legacy banking core databases.
*   **Multi-Role RBAC:** Expansion to include 'Compliance Officer' and 'Auditor' roles.
*   **Live Webhook Ingestion:** Real-time transaction streaming via WebSockets.

## 15. Risks & Open Questions
*   **API Latency:** Heavy reliance on Gemini 2.5 Flash; mitigated by server-side response caching.
*   **Browser Memory:** Large D3.js graphs may impact low-end devices; mitigated by Canvas-based rendering.
*   **Regulatory Change:** Compliance rules (OFAC/BSA) require periodic manual updates to the `compliance_checker.ts` agent.