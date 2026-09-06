import React, { useState } from 'react';
import { Terminal, Shield, Check, Copy, ExternalLink, HelpCircle, AlertTriangle } from 'lucide-react';
import { getWebhookUrl } from '../../lib/api';

export function RazorpayTestGuide() {
  const [copied, setCopied] = useState(false);
  const webhookUrl = getWebhookUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="enterprise-card p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Razorpay Test-Mode Verification Protocol
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">Real Razorpay events verified via HMAC-SHA256 signatures</p>
          </div>
        </div>
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 uppercase">
          Sandbox / Test Mode Only
        </span>
      </div>

      <div className="space-y-3 text-xs text-slate-600 leading-relaxed font-medium">
        <p>
          RiskLens AI integrates directly with Razorpay&apos;s live webhook stream. Follow the standard fintech integration flow to test risk scoring and autonomous swarm investigations:
        </p>

        <ol className="list-decimal pl-5 space-y-2 text-slate-700">
          <li>
            <strong>Configure Webhook in Razorpay Dashboard:</strong> Go to <em>Razorpay Dashboard → Settings → Webhooks</em> (Test Mode). Add the webhook URL below and subscribe to <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-blue-600">payment.captured</code> and <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-blue-600">payment.failed</code> events.
          </li>
          <li>
            <strong>Trigger Test Payment:</strong> Complete a checkout in Razorpay Sandbox (using standard test cards or UPI).
          </li>
          <li>
            <strong>Instant Ingestion & Analysis:</strong> The moment Razorpay delivers the webhook with a valid HMAC-SHA256 signature, RiskLens normalizes INR currency units, scores the transaction with the ML engine, and displays the risk verdict in real-time.
          </li>
        </ol>

        {/* Webhook URL Copy Box */}
        <div className="p-3.5 rounded-xl bg-slate-900 text-slate-200 flex items-center justify-between gap-3 font-mono text-[11px]">
          <div className="truncate">
            <span className="text-slate-400 select-none mr-2">Webhook URL:</span>
            <span className="text-emerald-400 font-bold">{webhookUrl}</span>
          </div>
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1 shrink-0 transition-colors"
            title="Copy webhook URL"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="text-[10px] font-sans font-semibold">{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900 text-[11px]">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            <strong>Production Safety:</strong> Secret keys (<code className="font-mono">RAZORPAY_KEY_SECRET</code> &amp; <code className="font-mono">RAZORPAY_WEBHOOK_SECRET</code>) reside solely on the server. Never commit live production credentials.
          </span>
        </div>
      </div>
    </div>
  );
}
