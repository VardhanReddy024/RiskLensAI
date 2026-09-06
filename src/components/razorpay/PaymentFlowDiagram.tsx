import React from 'react';
import { CreditCard, Webhook, Cpu, Sparkles, ShieldCheck, UserCheck, ArrowRight } from 'lucide-react';

export function PaymentFlowDiagram() {
  const steps = [
    {
      title: '1. Razorpay Payment',
      desc: 'Customer checkout (Test Mode)',
      icon: CreditCard,
      color: 'bg-blue-50 text-blue-600 border-blue-200',
    },
    {
      title: '2. HMAC Webhook',
      desc: 'Signed event delivered',
      icon: Webhook,
      color: 'bg-purple-50 text-purple-600 border-purple-200',
    },
    {
      title: '3. Ingestion & Scaling',
      desc: 'INR normalization & idempotency',
      icon: Cpu,
      color: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    },
    {
      title: '4. ML Risk Scoring',
      desc: 'SHAP & Behavioral Model',
      icon: Sparkles,
      color: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      title: '5. AI Swarm Decision',
      desc: 'ALLOW / REVIEW / REJECT',
      icon: ShieldCheck,
      color: 'bg-rose-50 text-rose-600 border-rose-200',
    },
    {
      title: '6. Analyst Review',
      desc: 'Command Center & SAR Filing',
      icon: UserCheck,
      color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
  ];

  return (
    <div className="enterprise-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          End-to-End Razorpay Risk Pipeline
        </h4>
        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
          Zero-Delay Interception
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-1">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className={`p-3 rounded-xl border flex flex-col justify-between space-y-2 ${step.color} transition-transform hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between">
                <Icon className="w-4 h-4" />
                <span className="text-[10px] font-mono font-bold opacity-60">0{idx + 1}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-snug">{step.title}</p>
                <p className="text-[10px] text-slate-600 mt-0.5 font-medium leading-tight">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
