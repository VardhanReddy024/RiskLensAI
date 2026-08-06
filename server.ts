import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { INITIAL_TRANSACTIONS } from "./src/data/sample_datasets";
import { Transaction, AuditLog } from "./src/types";
import { orchestrateInvestigation } from "./server/agents/orchestrator";
import { chatWithInvestigatorCopilot } from "./server/gemini";
import { evaluateTransactionWithML } from "./server/ml_engine";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // In-memory persistent state (seeded with realistic transactions)
  let transactionsDb: Transaction[] = [...INITIAL_TRANSACTIONS];
  const dossiersCache = new Map<string, any>();
  const auditLogsDb: AuditLog[] = [
    {
      id: 'LOG-1001',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      actorEmail: 'lead.investigator@risklens.ai',
      actorRole: 'senior_investigator',
      action: 'REJECT_TRANSACTION',
      targetId: 'TXN-98425-FRAUD',
      details: 'Instant settlement blocked due to Tor exit node and FinCEN SAR threshold violation.',
      status: 'SUCCESS'
    },
    {
      id: 'LOG-1002',
      timestamp: new Date(Date.now() - 1000 * 60 * 65).toISOString(),
      actorEmail: 'compliance.officer@risklens.ai',
      actorRole: 'compliance_officer',
      action: 'GENERATE_SAR',
      targetId: 'TXN-98425-FRAUD',
      details: 'SAR draft Form-SAR-01 queued for regulatory submission.',
      status: 'SUCCESS'
    }
  ];

  // 1. Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      platform: "RiskLens AI",
      version: "2.4.0-prod",
      services: {
        gemini: !!process.env.GEMINI_API_KEY,
        qdrant: true,
        ml_engine: true,
        orchestrator: true,
      },
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Transactions List with filtering & search
  app.get("/api/transactions", (req, res) => {
    const { status, tier, search } = req.query;
    let results = [...transactionsDb];

    if (status && status !== 'all') {
      results = results.filter(t => t.status.toLowerCase() === String(status).toLowerCase());
    }
    if (tier && tier !== 'all') {
      results = results.filter(t => t.riskTier.toLowerCase() === String(tier).toLowerCase());
    }
    if (search) {
      const q = String(search).toLowerCase();
      results = results.filter(t => 
        t.id.toLowerCase().includes(q) ||
        t.customerId.toLowerCase().includes(q) ||
        (t.customerName && t.customerName.toLowerCase().includes(q)) ||
        t.merchant.toLowerCase().includes(q) ||
        t.location.city.toLowerCase().includes(q)
      );
    }

    res.json({
      transactions: results,
      total: results.length,
    });
  });

  // 3. Single Transaction
  app.get("/api/transactions/:id", (req, res) => {
    const { id } = req.params;
    const found = transactionsDb.find(t => t.id === id);
    if (!found) {
      return res.status(404).json({ error: `Transaction ${id} not found` });
    }
    res.json(found);
  });

  // 4. Ingest CSV Batch / Single Transaction
  app.post("/api/transactions/batch", (req, res) => {
    try {
      const { transactions } = req.body;
      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({ error: "Invalid transaction payload: expected array" });
      }

      // Process and score any transactions that might not be fully initialized
      const processed: Transaction[] = transactions.map(txn => {
        const mlResult = evaluateTransactionWithML(txn);
        return {
          ...txn,
          riskScore: txn.riskScore || mlResult.riskScore,
          fraudProbability: txn.fraudProbability || mlResult.fraudProbability,
          riskTier: txn.riskTier || mlResult.riskTier,
          confidenceScore: txn.confidenceScore || mlResult.confidenceScore,
          status: txn.status || (mlResult.riskScore >= 60 ? 'flagged' : (mlResult.riskScore >= 30 ? 'pending' : 'approved')),
          estimatedLossPrevented: (txn.riskScore || mlResult.riskScore) >= 60 ? txn.amount : 0,
        };
      });

      // Prepend to top of DB
      transactionsDb = [...processed, ...transactionsDb];

      auditLogsDb.unshift({
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorEmail: 'operator@risklens.ai',
        actorRole: 'fraud_analyst',
        action: 'BULK_INGEST',
        targetId: `${processed.length} Transactions`,
        details: `Successfully ingested and ML-scored batch of ${processed.length} transactions.`,
        status: 'SUCCESS'
      });

      res.json({
        success: true,
        ingestedCount: processed.length,
        totalDbCount: transactionsDb.length,
        transactions: processed.slice(0, 50),
      });
    } catch (err: any) {
      console.error("Batch ingest error:", err);
      res.status(500).json({ error: err?.message || "Failed to process batch" });
    }
  });

  // 5. Full 8-Agent Investigation Runner
  app.post("/api/investigate/:id", async (req, res) => {
    try {
      const { id } = req.params;
      let targetTxn = transactionsDb.find(t => t.id === id);

      if (!targetTxn && req.body.transaction) {
        targetTxn = req.body.transaction;
      }

      if (!targetTxn) {
        return res.status(404).json({ error: `Transaction ${id} not found in database.` });
      }

      // Check dossier cache first to prevent repeated API calls
      if (dossiersCache.has(id)) {
        return res.json({
          success: true,
          dossier: dossiersCache.get(id),
          cached: true,
        });
      }

      // Run Orchestrator
      const dossier = await orchestrateInvestigation(targetTxn);
      dossiersCache.set(id, dossier);

      // Update in-memory transaction with enriched data
      const index = transactionsDb.findIndex(t => t.id === targetTxn!.id);
      if (index !== -1) {
        transactionsDb[index] = {
          ...transactionsDb[index],
          riskScore: dossier.transaction.riskScore,
          fraudProbability: dossier.transaction.fraudProbability,
          riskTier: dossier.transaction.riskTier,
          confidenceScore: dossier.transaction.confidenceScore,
          estimatedLossPrevented: dossier.recommendation.estimatedLossPrevented,
        };
      }

      res.json({
        success: true,
        dossier,
      });
    } catch (err: any) {
      console.error("Investigation error:", err);
      res.status(500).json({ error: err?.message || "Investigation failed" });
    }
  });

  // 6. Interactive AI Copilot Chat
  app.post("/api/copilot/chat", async (req, res) => {
    try {
      const { transaction, chatHistory, message } = req.body;
      if (!transaction || !message) {
        return res.status(400).json({ error: "Missing transaction or message parameter" });
      }

      const reply = await chatWithInvestigatorCopilot(transaction, chatHistory || [], message);

      res.json({
        success: true,
        reply,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("Copilot chat error:", err);
      res.status(500).json({ error: err?.message || "Copilot response generation failed" });
    }
  });

  // 7. Resolve / Apply Action with Audit Logging
  app.post("/api/actions/resolve", (req, res) => {
    try {
      const { transactionId, action, notes, actorEmail, actorRole } = req.body;
      const txn = transactionsDb.find(t => t.id === transactionId);

      if (!txn) {
        return res.status(404).json({ error: `Transaction ${transactionId} not found` });
      }

      let newStatus: Transaction['status'] = 'approved';
      if (action === 'APPROVE') newStatus = 'approved';
      else if (action === 'HOLD') newStatus = 'held';
      else if (action === 'ESCALATE') newStatus = 'escalated';
      else if (action === 'REJECT') newStatus = 'rejected';

      txn.status = newStatus;
      txn.resolutionNote = notes;
      txn.resolvedBy = actorEmail || 'analyst@risklens.ai';
      txn.resolvedAt = new Date().toISOString();

      const logActionMap: Record<string, AuditLog['action']> = {
        APPROVE: 'APPROVE_TRANSACTION',
        HOLD: 'HOLD_TRANSACTION',
        ESCALATE: 'ESCALATE_TRANSACTION',
        REJECT: 'REJECT_TRANSACTION',
      };

      const newLog: AuditLog = {
        id: `LOG-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorEmail: actorEmail || 'analyst@risklens.ai',
        actorRole: actorRole || 'fraud_analyst',
        action: logActionMap[action] || 'APPROVE_TRANSACTION',
        targetId: transactionId,
        details: notes || `Action ${action} executed by ${actorRole || 'analyst'}.`,
        status: 'SUCCESS',
      };

      auditLogsDb.unshift(newLog);

      res.json({
        success: true,
        transaction: txn,
        auditLog: newLog,
      });
    } catch (err: any) {
      console.error("Resolve action error:", err);
      res.status(500).json({ error: err?.message || "Failed to resolve transaction" });
    }
  });

  // 8. Analytics & Metrics Aggregation
  app.get("/api/analytics/metrics", (req, res) => {
    const totalTransactions = transactionsDb.length;
    const flaggedCount = transactionsDb.filter(t => t.status === 'flagged' || t.status === 'held' || t.status === 'rejected').length;
    const rejectedCount = transactionsDb.filter(t => t.status === 'rejected').length;
    const approvedCount = transactionsDb.filter(t => t.status === 'approved').length;
    
    const totalLossPrevented = transactionsDb
      .filter(t => t.status === 'rejected' || t.status === 'flagged' || t.status === 'held')
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const totalVolume = transactionsDb.reduce((sum, t) => sum + (t.amount || 0), 0);
    const avgRiskScore = totalTransactions > 0 
      ? Math.round(transactionsDb.reduce((sum, t) => sum + t.riskScore, 0) / totalTransactions)
      : 0;

    const criticalCount = transactionsDb.filter(t => t.riskTier === 'CRITICAL').length;
    const highCount = transactionsDb.filter(t => t.riskTier === 'HIGH').length;
    const mediumCount = transactionsDb.filter(t => t.riskTier === 'MEDIUM').length;
    const lowCount = transactionsDb.filter(t => t.riskTier === 'LOW').length;

    res.json({
      totalTransactions,
      flaggedCount,
      rejectedCount,
      approvedCount,
      totalLossPrevented,
      totalVolume,
      avgRiskScore,
      fraudRate: totalTransactions > 0 ? parseFloat(((flaggedCount / totalTransactions) * 100).toFixed(1)) : 0,
      tierDistribution: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
      },
      recentLogs: auditLogsDb.slice(0, 10),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`RiskLens AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
