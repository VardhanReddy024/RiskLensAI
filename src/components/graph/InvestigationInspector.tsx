import React from 'react';
import { 
  X, 
  ShieldAlert, 
  Sparkles, 
  Smartphone, 
  Globe, 
  User, 
  Landmark, 
  Store, 
  ArrowRightLeft, 
  Phone, 
  Mail, 
  MapPin, 
  Skull, 
  Share2, 
  FileText, 
  ExternalLink,
  ShieldCheck,
  Search
} from 'lucide-react';
import { GraphNode, GraphEdge } from '../../types/graph';
import { NODE_TYPE_CONFIG, AGENT_DISPLAY_NAME_MAP, AGENT_COLOR_MAP } from '../../lib/graph_engine';

interface InvestigationInspectorProps {
  node: GraphNode | null;
  edges: GraphEdge[];
  allNodes: GraphNode[];
  onClose: () => void;
  onSelectNode: (node: GraphNode) => void;
  onSetPathOrigin: (nodeId: string) => void;
  onSetPathTarget: (nodeId: string) => void;
}

export function InvestigationInspector({
  node,
  edges,
  allNodes,
  onClose,
  onSelectNode,
  onSetPathOrigin,
  onSetPathTarget,
}: InvestigationInspectorProps) {
  if (!node) return null;

  const config = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.transaction;

  // Find all connected edges
  const connectedEdges = edges.filter(e => {
    const sId = typeof e.source === 'object' ? e.source.id : e.source;
    const tId = typeof e.target === 'object' ? e.target.id : e.target;
    return sId === node.id || tId === node.id;
  });

  // Find all connected neighbor nodes
  const neighborNodes = connectedEdges.map(e => {
    const sId = typeof e.source === 'object' ? e.source.id : e.source;
    const tId = typeof e.target === 'object' ? e.target.id : e.target;
    const neighborId = sId === node.id ? tId : sId;
    return {
      node: allNodes.find(n => n.id === neighborId),
      edge: e,
    };
  }).filter((item): item is { node: GraphNode; edge: GraphEdge } => !!item.node);

  return (
    <div className="w-96 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 flex flex-col h-full shadow-2xl z-20 overflow-hidden animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
        <div className="flex items-center gap-2.5">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-md"
            style={{ backgroundColor: config.bgColor }}
          >
            {node.type === 'transaction' && <Share2 className="w-4 h-4" />}
            {node.type === 'customer' && <User className="w-4 h-4" />}
            {node.type === 'account' && <Landmark className="w-4 h-4" />}
            {node.type === 'merchant' && <Store className="w-4 h-4" />}
            {node.type === 'device' && <Smartphone className="w-4 h-4" />}
            {node.type === 'ip_address' && <Globe className="w-4 h-4" />}
            {node.type === 'location' && <MapPin className="w-4 h-4" />}
            {node.type === 'phone' && <Phone className="w-4 h-4" />}
            {node.type === 'email' && <Mail className="w-4 h-4" />}
            {node.type === 'beneficiary' && <ArrowRightLeft className="w-4 h-4" />}
            {node.type === 'historical_case' && <ShieldAlert className="w-4 h-4" />}
            {node.type === 'fraud_ring' && <Skull className="w-4 h-4" />}
            {node.type === 'ai_recommendation' && <Sparkles className="w-4 h-4" />}
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {config.label} Dossier
            </span>
            <h3 className="text-sm font-bold text-white truncate max-w-[200px]" title={node.label}>
              {node.label}
            </h3>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin scrollbar-thumb-slate-800">
        {/* Risk Score Banner */}
        <div className={`p-3 rounded-xl border flex items-center justify-between ${
          node.riskTier === 'CRITICAL'
            ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
            : (node.riskTier === 'HIGH' ? 'bg-amber-950/40 border-amber-800/80 text-amber-200' : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200')
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">Composite Risk Score</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black">{node.riskScore}</span>
              <span className="text-xs font-semibold opacity-75">/ 100 ({node.riskTier})</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-80">AI Confidence</span>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              {node.confidenceScore ? `${(node.confidenceScore * 100).toFixed(1)}%` : '96.5%'}
            </div>
          </div>
        </div>

        {/* AI Forensic Summary */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Forensic Summary</span>
          </div>
          <p className="text-slate-300 leading-relaxed text-[11.5px]">
            {node.aiSummary || 'Entity is actively monitored under the multi-agent fraud surveillance matrix.'}
          </p>
        </div>

        {/* Specialized Entity Telemetry Accordion */}
        {node.deviceInfo && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Device Fingerprint Telemetry</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">OS / Platform</span>
                <span className="font-semibold text-slate-200">{node.deviceInfo.os}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Browser</span>
                <span className="font-semibold text-slate-200">{node.deviceInfo.browser}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Fingerprint Trust</span>
                <span className={`font-bold ${node.deviceInfo.fingerprintScore < 40 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {node.deviceInfo.fingerprintScore} / 100
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Emulator / Bot</span>
                <span className={`font-bold ${node.deviceInfo.isEmulator ? 'text-rose-400' : 'text-slate-200'}`}>
                  {node.deviceInfo.isEmulator ? 'DETECTED' : 'CLEAN'}
                </span>
              </div>
            </div>
          </div>
        )}

        {node.ipInfo && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
              <Globe className="w-3.5 h-3.5" />
              <span>Network Ingress & Proxy Intelligence</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">IP Address</span>
                <span className="font-mono font-bold text-slate-200">{node.ipInfo.ip}</span>
              </div>
              <div>
                <span className="text-slate-500 block">ISP / Routing</span>
                <span className="font-semibold text-slate-200 truncate block">{node.ipInfo.isp || 'Tier-1 ISP'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tor Exit Node</span>
                <span className={`font-bold ${node.ipInfo.isTor ? 'text-rose-400' : 'text-slate-400'}`}>
                  {node.ipInfo.isTor ? 'CONFIRMED' : 'NO'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Proxy / VPN Risk</span>
                <span className={`font-bold ${node.ipInfo.proxyRiskScore >= 80 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {node.ipInfo.proxyRiskScore}/100
                </span>
              </div>
            </div>
          </div>
        )}

        {node.customerInfo && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[11px]">
              <User className="w-3.5 h-3.5" />
              <span>Customer Identity & KYC Status</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-500 block">Full Legal Name</span>
                <span className="font-semibold text-slate-200">{node.customerInfo.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">KYC Verification</span>
                <span className={`font-bold ${node.customerInfo.kycStatus === 'FLAGGED' || node.customerInfo.kycStatus === 'SYNTHETIC_SUSPECT' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {node.customerInfo.kycStatus}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Account Tenure</span>
                <span className="font-semibold text-slate-200">{node.customerInfo.tenureMonths} Months</span>
              </div>
              <div>
                <span className="text-slate-500 block">Primary Email</span>
                <span className="font-semibold text-slate-200 truncate block">{node.customerInfo.email}</span>
              </div>
            </div>
          </div>
        )}

        {node.fraudRingInfo && (
          <div className="bg-rose-950/30 border border-rose-800/60 rounded-xl p-3 space-y-2">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold text-[11px]">
              <Skull className="w-3.5 h-3.5" />
              <span>Syndicate Ring Intelligence</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-400">Ring Typology:</span>
                <span className="font-bold text-slate-200">{node.fraudRingInfo.typology}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Linked Active Nodes:</span>
                <span className="font-bold text-rose-400">{node.fraudRingInfo.activeNodesCount} entities</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Loss Exposure:</span>
                <span className="font-bold text-rose-400">${node.fraudRingInfo.estimatedSyndicateLoss.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Jurisdictions:</span>
                <span className="font-semibold text-slate-300">{node.fraudRingInfo.jurisdictions.join(', ')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Connected Entities List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
            <span>Direct Connected Entities ({neighborNodes.length})</span>
            <span className="text-[10px] text-blue-400 font-normal">Click to jump</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {neighborNodes.map(({ node: neighbor, edge }) => {
              const nConfig = NODE_TYPE_CONFIG[neighbor.type] || NODE_TYPE_CONFIG.transaction;
              const agentName = AGENT_DISPLAY_NAME_MAP[edge.discoveredByAgent] || edge.discoveredByAgent;
              const agentColor = AGENT_COLOR_MAP[edge.discoveredByAgent] || '#64748b';

              return (
                <div
                  key={`${neighbor.id}-${edge.id}`}
                  onClick={() => onSelectNode(neighbor)}
                  className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-600 hover:bg-slate-800/50 cursor-pointer transition-all flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: nConfig.bgColor }}
                    />
                    <div className="truncate">
                      <div className="text-[11px] font-bold text-slate-200 truncate">{neighbor.label}</div>
                      <div className="text-[9.5px] text-slate-400 flex items-center gap-1">
                        <span>{edge.label}</span>
                        <span>•</span>
                        <span style={{ color: agentColor }} className="font-semibold truncate">{agentName}</span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                    neighbor.riskTier === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {neighbor.riskScore}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Forensic Quick Actions */}
        <div className="pt-2 border-t border-slate-800 space-y-2">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Forensic Path Analysis
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onSetPathOrigin(node.id)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
            >
              <Search className="w-3 h-3 text-blue-400" />
              <span>Set as Origin</span>
            </button>
            <button
              onClick={() => onSetPathTarget(node.id)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
            >
              <Search className="w-3 h-3 text-emerald-400" />
              <span>Set as Target</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
