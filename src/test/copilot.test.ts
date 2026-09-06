/**
 * RiskLens AI - Copilot Real-Time AI Investigator Suite
 * 
 * Tests:
 * 1. Question-specific prompt grounding & multi-turn memory
 * 2. Real assertion that exact questions ("Why flagged?", "IP proxy risk?", "Device risk?", "Recommended action?") reach AI model
 * 3. Validation: empty questions, whitespace questions, missing transactions
 * 4. API degradation & error resilience (no fake static fallbacks)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { chatWithInvestigatorCopilot, setGeminiClientForTesting } from '../../server/gemini';
import { copilotService } from '../../server/services/copilot.service';
import { validateCopilotChat } from '../../server/validators/copilot.validator';
import { Transaction, ChatMessage } from '../types';
import { ValidationError } from '../../server/errors';

describe('RiskLens AI Copilot Investigation & Prompt Grounding Suite', () => {
  const sampleTransaction: Transaction = {
    id: 'TXN-COPILOT-9988',
    customerId: 'CUST-ALPHA-123',
    customerName: 'Elena Rostova',
    customerEmail: 'elena.rostova@techcorp.com',
    customerTenureMonths: 24,
    amount: 8750.50,
    currency: 'USD',
    timestamp: '2026-09-01T14:30:00.000Z',
    merchant: 'Global Crypto OTC Liquidity',
    merchantCategory: 'Crypto Exchange',
    location: {
      city: 'Zurich',
      country: 'Switzerland',
      distanceFromHomeKm: 6400,
      lat: 47.3769,
      lon: 8.5417,
    },
    device: {
      id: 'DEV-FINGERPRINT-X99',
      type: 'Mobile',
      os: 'Android 14 GrapheneOS',
      browser: 'Tor Browser 13.0',
      isKnownCustomerDevice: false,
      fingerprintScore: 12,
    },
    ipAddress: {
      ip: '185.220.101.5',
      city: 'Frankfurt',
      country: 'Germany',
      isTor: true,
      isProxy: true,
      isVpn: false,
      proxyRiskScore: 96,
    },
    paymentMethod: {
      type: 'Credit Card',
      last4: '7721',
      issuer: 'Revolut Enterprise',
      cardCountry: 'United Kingdom',
      is3DSecure: false,
    },
    riskScore: 92,
    fraudProbability: 0.92,
    riskTier: 'CRITICAL',
    status: 'flagged',
    confidenceScore: 0.97,
    tags: ['Impossible Travel', 'Tor Exit Node', 'Unverified Device'],
    flagReasons: ['Impossible Travel (6400km)', 'Active Tor Exit Node Ingress', 'Device Trust Degraded (12/100)'],
  };

  const sampleContext = {
    recommendation: {
      action: 'REJECT',
      recommendedPlaybook: 'PB-ATO-04 (Account Takeover Immediate Containment)',
      estimatedLossPrevented: 8750.50,
    },
    explainability: {
      plainEnglishSummary: 'Transaction flagged due to critical geographical displacement and darknet Tor ingress.',
      executiveRationale: 'High threat vector consistent with automated credential stuffing.',
      keyRiskDrivers: ['Tor Exit Node Routing', '6400km Displacement', 'Device Trust 12/100'],
      mitigatingFactors: ['Customer tenure of 24 months'],
    },
    compliance: {
      sarFilingRequired: true,
    }
  };

  let recordedPrompts: string[] = [];
  let mockGenerateContent: any;

  beforeEach(() => {
    recordedPrompts = [];
    mockGenerateContent = vi.fn().mockImplementation(async (request: any) => {
      recordedPrompts.push(request.contents);
      return {
        text: `AI Copilot response for inquiry regarding transaction ${sampleTransaction.id}.`,
      };
    });

    setGeminiClientForTesting({
      models: {
        generateContent: mockGenerateContent,
      }
    });
  });

  afterEach(() => {
    setGeminiClientForTesting(null);
  });

  it('1. Question: "Why was this transaction flagged?" delivers actual question & transaction flags to Gemini', async () => {
    const question = 'Why was this transaction flagged?';
    await chatWithInvestigatorCopilot(sampleTransaction, [], question, sampleContext);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const sentPrompt = recordedPrompts[0];

    // Assert exact user question is present
    expect(sentPrompt).toContain('CURRENT USER QUESTION:');
    expect(sentPrompt).toContain(question);

    // Assert transaction context is present
    expect(sentPrompt).toContain(sampleTransaction.id);
    expect(sentPrompt).toContain('Impossible Travel (6400km)');
    expect(sentPrompt).toContain('Active Tor Exit Node Ingress');
    expect(sentPrompt).toContain('92/100');
  });

  it('2. Question: "What is the IP proxy threat risk?" delivers actual question & IP telemetry to Gemini', async () => {
    const question = 'What is the IP proxy threat risk?';
    await chatWithInvestigatorCopilot(sampleTransaction, [], question, sampleContext);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const sentPrompt = recordedPrompts[0];

    expect(sentPrompt).toContain('CURRENT USER QUESTION:');
    expect(sentPrompt).toContain(question);
    expect(sentPrompt).toContain('185.220.101.5');
    expect(sentPrompt).toContain('Proxy Risk Score: 96/100');
    expect(sentPrompt).toContain('Tor: YES');
  });

  it('3. Question: "Explain the device risk." delivers actual question & device telemetry to Gemini', async () => {
    const question = 'Explain the device risk.';
    await chatWithInvestigatorCopilot(sampleTransaction, [], question, sampleContext);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const sentPrompt = recordedPrompts[0];

    expect(sentPrompt).toContain('CURRENT USER QUESTION:');
    expect(sentPrompt).toContain(question);
    expect(sentPrompt).toContain('Android 14 GrapheneOS');
    expect(sentPrompt).toContain('Fingerprint Trust Score: 12/100');
    expect(sentPrompt).toContain('Known Device: NO');
  });

  it('4. Question: "What is the recommended action?" delivers actual question & recommendation to Gemini', async () => {
    const question = 'What is the recommended action?';
    await chatWithInvestigatorCopilot(sampleTransaction, [], question, sampleContext);

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const sentPrompt = recordedPrompts[0];

    expect(sentPrompt).toContain('CURRENT USER QUESTION:');
    expect(sentPrompt).toContain(question);
    expect(sentPrompt).toContain('Action Recommendation: REJECT');
    expect(sentPrompt).toContain('PB-ATO-04');
  });

  it('5. Verifies different questions produce DISTINCT Gemini requests', async () => {
    const q1 = 'What is the IP proxy threat risk?';
    const q2 = 'Why was this transaction flagged?';

    await chatWithInvestigatorCopilot(sampleTransaction, [], q1, sampleContext);
    await chatWithInvestigatorCopilot(sampleTransaction, [], q2, sampleContext);

    expect(recordedPrompts.length).toBe(2);
    expect(recordedPrompts[0]).not.toEqual(recordedPrompts[1]);
    expect(recordedPrompts[0]).toContain(q1);
    expect(recordedPrompts[1]).toContain(q2);
  });

  it('6. Multi-turn conversation history is accurately included in the Gemini prompt', async () => {
    const history: ChatMessage[] = [
      { id: 'm1', sender: 'user', message: 'What is the transaction amount?', timestamp: '2026-09-01T14:31:00Z' },
      { id: 'm2', sender: 'agent', message: 'The amount is USD 8750.50.', timestamp: '2026-09-01T14:31:02Z' },
    ];
    const newQuestion = 'Is this higher than the customer average?';

    await chatWithInvestigatorCopilot(sampleTransaction, history, newQuestion, sampleContext);

    const sentPrompt = recordedPrompts[0];
    expect(sentPrompt).toContain('CONVERSATION HISTORY:');
    expect(sentPrompt).toContain('Analyst: What is the transaction amount?');
    expect(sentPrompt).toContain('RiskLens AI Copilot: The amount is USD 8750.50.');
    expect(sentPrompt).toContain('CURRENT USER QUESTION:\nIs this higher than the customer average?');
  });

  it('7. Validator rejects empty questions and whitespace-only queries with 400 ValidationError', () => {
    const mockRes = {} as any;
    const mockNext = vi.fn();

    // Empty message/question
    expect(() => {
      validateCopilotChat({ body: { transaction: sampleTransaction, question: '' } } as any, mockRes, mockNext);
    }).toThrow(ValidationError);

    // Whitespace only
    expect(() => {
      validateCopilotChat({ body: { transaction: sampleTransaction, message: '    \n  ' } } as any, mockRes, mockNext);
    }).toThrow(ValidationError);

    // Missing transaction & transactionId
    expect(() => {
      validateCopilotChat({ body: { question: 'Why flagged?' } } as any, mockRes, mockNext);
    }).toThrow(ValidationError);

    // Valid query with question & transactionId passes
    const validNext = vi.fn();
    validateCopilotChat({ body: { transactionId: 'TXN-123', question: 'What is the risk?' } } as any, mockRes, validNext);
    expect(validNext).toHaveBeenCalled();
  });

  it('8. Degraded response when Gemini client is null or offline (no fake static answers)', async () => {
    setGeminiClientForTesting(null);

    const reply = await chatWithInvestigatorCopilot(sampleTransaction, [], 'Why flagged?');
    expect(reply).toBe('AI Copilot is temporarily unavailable. The investigation data is still available.');
  });

  it('9. Handles Gemini API errors / throw gracefully with clear degraded notice', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Network transport reset'));

    const reply = await chatWithInvestigatorCopilot(sampleTransaction, [], 'What is the proxy threat?');
    expect(reply).toBe('AI Copilot is temporarily unavailable. The investigation data is still available.');
  });

  it('10. Handles rate limiting (429) gracefully with rate-limit specific notice', async () => {
    const rateLimitError = new Error('Resource has been exhausted (e.g. check quota).');
    (rateLimitError as any).status = 'RESOURCE_EXHAUSTED';
    mockGenerateContent.mockRejectedValueOnce(rateLimitError);

    const reply = await chatWithInvestigatorCopilot(sampleTransaction, [], 'What is the IP proxy risk?');
    expect(reply).toContain('AI Copilot is temporarily rate-limited. Please retry in a moment.');
  });

  it('11. CopilotService delegates to chatWithInvestigatorCopilot and records query metrics', async () => {
    const result = await copilotService.chat(sampleTransaction, [], 'Summarize this investigation.', undefined, sampleContext);
    expect(result.success).toBe(true);
    expect(result.reply).toContain('AI Copilot response for inquiry');
    expect(typeof result.timestamp).toBe('string');
  });

  describe('12. Multi-Tenant Authorization & Security Enforcement', () => {
    it('CASE 1: Authenticated user + transaction belonging to their tenant -> ALLOW (200 OK)', async () => {
      const tenantId = 'tenant_fintechcorp_in';
      const tenantTxn: Transaction = {
        ...sampleTransaction,
        id: `TXN-TENANT-AUTH-${Date.now()}`,
        tenantId,
      };

      const result = await copilotService.chat(tenantTxn, [], 'Why was this transaction flagged?', tenantId, sampleContext);
      expect(result.success).toBe(true);
      expect(result.reply).toBeDefined();
    });

    it('CASE 2: Authenticated user + transaction belonging to another tenant -> FORBIDDEN (403)', async () => {
      const userTenantId = 'tenant_attacker_bank';
      const resourceTenantId = 'tenant_fintechcorp_in';
      const foreignTxn: Transaction = {
        ...sampleTransaction,
        id: `TXN-FOREIGN-${Date.now()}`,
        tenantId: resourceTenantId,
      };

      await expect(
        copilotService.chat(foreignTxn, [], 'Why was this transaction flagged?', userTenantId, sampleContext)
      ).rejects.toThrow('Forbidden: Access denied to transaction outside tenant scope.');
    });

    it('CASE 3: Unauthenticated Copilot request via API -> 401 UNAUTHORIZED', async () => {
      const { createExpressApp } = await import('../../server');
      const request = (await import('supertest')).default;
      const app = createExpressApp();

      const res = await request(app)
        .post('/api/copilot/chat')
        .send({
          transactionId: sampleTransaction.id,
          question: 'Why was this transaction flagged?',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('CASE 4: Invalid/malformed token via API -> 401 UNAUTHORIZED', async () => {
      const { createExpressApp } = await import('../../server');
      const request = (await import('supertest')).default;
      const app = createExpressApp();

      const res = await request(app)
        .post('/api/copilot/chat')
        .set('Authorization', 'Bearer malformed-invalid-jwt-token')
        .send({
          transactionId: sampleTransaction.id,
          question: 'Why was this transaction flagged?',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('CASE 5: Dynamic live streamed transaction (TXN-LIVE-...) persisted and queried via Copilot under authorized tenant', async () => {
      const { createExpressApp } = await import('../../server');
      const { db } = await import('../../server/db');
      const request = (await import('supertest')).default;
      const app = createExpressApp();
      const authHeader = { Authorization: 'Bearer TEST_TOKEN_analyst@tenant-live.com' };

      const liveTxnId = `TXN-LIVE-${Date.now().toString().slice(-6)}`;
      const liveTxn: Transaction = {
        ...sampleTransaction,
        id: liveTxnId,
        tenantId: undefined, // Simulating dynamically streamed transaction
      };

      // 1. Deep Investigate step
      const investigateRes = await request(app)
        .post(`/api/investigate/${liveTxnId}`)
        .set(authHeader)
        .send({ transaction: liveTxn });

      expect(investigateRes.status).toBe(200);
      expect(investigateRes.body.success).toBe(true);

      // Verify transaction was persisted with authenticated tenant
      const persisted = await db.transactions.getById(liveTxnId);
      expect(persisted).toBeDefined();
      expect(persisted?.tenantId).toBe('tenant_tenant_live_com');

      // 2. Copilot chat inquiry on the investigated live transaction
      const copilotRes = await request(app)
        .post('/api/copilot/chat')
        .set(authHeader)
        .send({
          transactionId: liveTxnId,
          question: 'Why was this transaction flagged?',
          context: investigateRes.body.dossier,
        });

      expect(copilotRes.status).toBe(200);
      expect(copilotRes.body.success).toBe(true);
      expect(copilotRes.body.reply).toBeDefined();

      // 3. Attacker tenant attempting to query the live transaction is REJECTED
      const attackerAuth = { Authorization: 'Bearer TEST_TOKEN_spy@evilcorp.com' };
      const attackerRes = await request(app)
        .post('/api/copilot/chat')
        .set(attackerAuth)
        .send({
          transactionId: liveTxnId,
          question: 'What are the risk factors?',
        });

      expect(attackerRes.status).toBe(403);
      expect(attackerRes.body.error.message || attackerRes.body.error).toContain('Forbidden');
    });
  });
});
