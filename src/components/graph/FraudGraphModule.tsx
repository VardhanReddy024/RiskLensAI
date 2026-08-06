import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Network, 
  Clock, 
  Globe, 
  Search, 
  Filter, 
  Route, 
  Download, 
  RotateCcw, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Sparkles, 
  Skull, 
  Eye, 
  EyeOff, 
  ChevronDown,
  Check
} from 'lucide-react';
import { 
  GraphNode, 
  GraphEdge, 
  FraudCluster, 
  TimelineEvent, 
  HeatmapRegion, 
  GraphFilterOptions, 
  ShortestPathResult 
} from '../../types/graph';
import { Transaction } from '../../types';
import { useInvestigation } from '../../context/InvestigationContext';
import { useTransactions } from '../../context/TransactionContext';
import { 
  buildGraphForTransaction, 
  generateSimulatedFraudRing, 
  findShortestPath, 
  NODE_TYPE_CONFIG 
} from '../../lib/graph_engine';
import { GraphCanvas } from './GraphCanvas';
import { InvestigationInspector } from './InvestigationInspector';
import { PathFinderPanel } from './PathFinderPanel';
import { GraphFiltersDrawer } from './GraphFiltersDrawer';
import { AIGraphInsightsCard } from './AIGraphInsightsCard';
import { TimelineView } from './TimelineView';
import { RiskHeatmapView } from './RiskHeatmapView';
import { GraphLegend } from './GraphLegend';
import { GraphExportModal } from './GraphExportModal';

interface FraudGraphModuleProps {
  initialTransaction?: Transaction;
}

export function FraudGraphModule({ initialTransaction }: FraudGraphModuleProps) {
  const { activeDossier } = useInvestigation();
  const { transactions } = useTransactions();

  // Active investigation focal transaction
  const focusTxn = initialTransaction || activeDossier?.transaction || transactions[0];

  // Active view: 'graph' | 'timeline' | 'heatmap'
  const [activeView, setActiveView] = useState<'graph' | 'timeline' | 'heatmap'>('graph');

  // Master Graph Data State
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [clusters, setClusters] = useState<FraudCluster[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapRegion[]>([]);
  const [aiInsights, setAiInsights] = useState<string>('');
  const [confidenceScore, setConfidenceScore] = useState<number>(0.984);

  // Active Selected / Inspected Node
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Search auto-complete
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);

  // Path Finder State
  const [isPathFinderOpen, setIsPathFinderOpen] = useState(false);
  const [pathOriginId, setPathOriginId] = useState<string | null>(null);
  const [pathTargetId, setPathTargetId] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<ShortestPathResult | null>(null);

  // Filters State
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<GraphFilterOptions>({
    riskLevels: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
    nodeTypes: [
      'transaction', 'customer', 'account', 'merchant', 'device', 
      'ip_address', 'location', 'phone', 'email', 'beneficiary', 
      'historical_case', 'fraud_ring', 'ai_recommendation'
    ],
    countries: [],
    merchants: [],
    agents: [],
    fraudRings: [],
    minAmount: 0,
    maxAmount: 1000000,
    minConfidence: 0,
    dateRange: 'all',
    searchQuery: '',
  });

  // UI Control Toggles
  const [showLabels, setShowLabels] = useState(true);
  const [showEdgeLabels, setShowEdgeLabels] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [scenarioDropdownOpen, setScenarioDropdownOpen] = useState(false);

  // Autonomous Consensus Animation Stage (1 to 5)
  const [animatedStage, setAnimatedStage] = useState<number>(0);
  const [isRunningConsensus, setIsRunningConsensus] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize or Build Graph on transaction change
  useEffect(() => {
    if (focusTxn) {
      const graphData = buildGraphForTransaction(focusTxn, transactions);
      setNodes(graphData.nodes);
      setEdges(graphData.edges);
      setClusters(graphData.clusters);
      setTimeline(graphData.timeline);
      setHeatmap(graphData.heatmap);
      setAiInsights(
        `This transaction belongs to a cluster of six related accounts sharing the same IP address (${focusTxn.ipAddress.ip}) and mobile device (${focusTxn.device.os}). Similar patterns were previously observed in Historical Fraud Case FRD-2048. Confidence: ${(focusTxn.confidenceScore * 100).toFixed(1)}%.`
      );
      setConfidenceScore(focusTxn.confidenceScore || 0.984);
      setSelectedNode(graphData.nodes.find(n => n.id === focusTxn.id) || graphData.nodes[0] || null);
    }
  }, [focusTxn?.id]);

  // Load Simulated Fraud Ring Scenario
  const loadScenario = (scenarioKey: string) => {
    setScenarioDropdownOpen(false);
    const sim = generateSimulatedFraudRing(scenarioKey);
    setNodes(sim.nodes);
    setEdges(sim.edges);
    setClusters(sim.clusters);
    setTimeline(sim.timeline);
    setHeatmap(sim.heatmap);
    setAiInsights(sim.insights);
    setConfidenceScore(0.988);
    setSelectedNode(sim.nodes[0] || null);
    setHighlightedPath(null);
  };

  // Reset to Active Investigation Case
  const resetToCase = () => {
    setScenarioDropdownOpen(false);
    if (focusTxn) {
      const graphData = buildGraphForTransaction(focusTxn, transactions);
      setNodes(graphData.nodes);
      setEdges(graphData.edges);
      setClusters(graphData.clusters);
      setTimeline(graphData.timeline);
      setHeatmap(graphData.heatmap);
      setAiInsights(
        `This transaction belongs to a cluster of six related accounts sharing the same IP address (${focusTxn.ipAddress.ip}) and mobile device (${focusTxn.device.os}). Similar patterns were previously observed in Historical Fraud Case FRD-2048. Confidence: ${(focusTxn.confidenceScore * 100).toFixed(1)}%.`
      );
      setSelectedNode(graphData.nodes[0] || null);
      setHighlightedPath(null);
    }
  };

  // Run 5-Step Autonomous Multi-Agent Consensus Simulation
  const handleRunConsensus = () => {
    if (isRunningConsensus) return;
    setIsRunningConsensus(true);
    setAnimatedStage(1);

    setTimeout(() => setAnimatedStage(2), 1200);
    setTimeout(() => setAnimatedStage(3), 2400);
    setTimeout(() => setAnimatedStage(4), 3600);
    setTimeout(() => {
      setAnimatedStage(5);
      setTimeout(() => {
        setAnimatedStage(0);
        setIsRunningConsensus(false);
      }, 2000);
    }, 4800);
  };

  // Filtered Nodes & Edges
  const filteredNodes = useMemo(() => {
    return nodes.filter(n => {
      // Risk level filter
      if (!filters.riskLevels.includes(n.riskTier)) return false;
      // Node type filter
      if (!filters.nodeTypes.includes(n.type)) return false;
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = n.label.toLowerCase().includes(q);
        const matchesSublabel = (n.sublabel || '').toLowerCase().includes(q);
        const matchesId = n.id.toLowerCase().includes(q);
        if (!matchesLabel && !matchesSublabel && !matchesId) return false;
      }
      return true;
    });
  }, [nodes, filters, searchQuery]);

  const filteredEdges = useMemo(() => {
    const validNodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(e => {
      const sId = typeof e.source === 'object' ? e.source.id : e.source;
      const tId = typeof e.target === 'object' ? e.target.id : e.target;
      if (!validNodeIds.has(sId) || !validNodeIds.has(tId)) return false;
      // Agent attribution filter
      if (filters.agents.length > 0 && !filters.agents.includes(e.discoveredByAgent)) return false;
      return true;
    });
  }, [edges, filteredNodes, filters.agents]);

  // Search Results Dropdown List
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return nodes.filter(n => 
      n.label.toLowerCase().includes(q) ||
      (n.sublabel || '').toLowerCase().includes(q) ||
      n.id.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [nodes, searchQuery]);

  // Calculate Shortest Path
  const handleCalculatePath = () => {
    if (!pathOriginId || !pathTargetId) return;
    const result = findShortestPath(nodes, edges, pathOriginId, pathTargetId);
    setHighlightedPath(result);
  };

  const handleClearPath = () => {
    setHighlightedPath(null);
    setPathOriginId(null);
    setPathTargetId(null);
  };

  // Fullscreen Toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col w-full h-full bg-slate-950 text-slate-100 font-sans ${
        isFullscreen ? 'fixed inset-0 z-50 p-4' : 'min-h-[calc(100vh-4rem)] p-6'
      }`}
    >
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        {/* Module Title & View Switcher */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-900/40">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-tight">
                  Fraud Relationship Intelligence Graph
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  FLAGSHIP
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Multi-entity forensic correlation, mule syndicate detection, and vector memory matching.
              </p>
            </div>
          </div>

          {/* View Mode Buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setActiveView('graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeView === 'graph'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Graph View</span>
            </button>
            <button
              onClick={() => setActiveView('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeView === 'timeline'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timeline Mode</span>
            </button>
            <button
              onClick={() => setActiveView('heatmap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeView === 'heatmap'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Risk Heatmap</span>
            </button>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <div className="flex items-center bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-1.5 w-64 focus-within:border-blue-500 transition-colors shadow-inner">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchDropdownOpen(true);
                }}
                onFocus={() => setIsSearchDropdownOpen(true)}
                placeholder="Search entities, IPs, devices..."
                className="bg-transparent text-xs text-slate-200 placeholder-slate-500 focus:outline-none w-full"
              />
            </div>

            {/* Instant Search Results Dropdown */}
            {isSearchDropdownOpen && searchResults.length > 0 && (
              <div className="absolute top-full mt-1.5 left-0 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 p-2 space-y-1 max-h-64 overflow-y-auto">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                  Matching Entities ({searchResults.length})
                </div>
                {searchResults.map(result => {
                  const cfg = NODE_TYPE_CONFIG[result.type] || NODE_TYPE_CONFIG.transaction;
                  return (
                    <div
                      key={result.id}
                      onClick={() => {
                        setSelectedNode(result);
                        setIsSearchDropdownOpen(false);
                        setSearchQuery('');
                      }}
                      className="p-2 rounded-lg hover:bg-slate-800 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cfg.bgColor }}
                        />
                        <div className="truncate">
                          <span className="font-bold text-slate-200 block truncate">{result.label}</span>
                          <span className="text-[10px] text-slate-400 block truncate">{cfg.label} • {result.sublabel || result.id}</span>
                        </div>
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        result.riskTier === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {result.riskScore}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Simulate Fraud Ring Dropdown */}
          <div className="relative">
            <button
              onClick={() => setScenarioDropdownOpen(!scenarioDropdownOpen)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-lg shadow-rose-950/50"
            >
              <Skull className="w-3.5 h-3.5" />
              <span>Simulate Fraud Ring</span>
              <ChevronDown className="w-3 h-3" />
            </button>

            {scenarioDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-40 p-2 space-y-1 text-xs">
                <div className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                  Select Fraud Scenario
                </div>
                <button
                  onClick={() => loadScenario('hydra_mule')}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors"
                >
                  <span className="font-bold block text-rose-400">Operation Hydra (Syndicate)</span>
                  <span className="text-[10px] text-slate-400 block">1 Device → 12 Accounts → 38 Txns</span>
                </button>
                <button
                  onClick={() => loadScenario('shadow_phantom')}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-200 transition-colors"
                >
                  <span className="font-bold block text-amber-400">ShadowPhantom Syndicate</span>
                  <span className="text-[10px] text-slate-400 block">Coordinated ATO across 5 Jurisdictions</span>
                </button>
                <div className="border-t border-slate-800 my-1" />
                <button
                  onClick={resetToCase}
                  className="w-full text-left p-2 rounded-lg hover:bg-slate-800 text-slate-300 font-semibold text-xs flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3 h-3 text-blue-400" />
                  <span>Reset to Active Investigation Case</span>
                </button>
              </div>
            )}
          </div>

          {/* Path Finder Toggle */}
          <button
            onClick={() => setIsPathFinderOpen(!isPathFinderOpen)}
            className={`p-2 rounded-xl border transition-all ${
              isPathFinderOpen
                ? 'bg-emerald-600 border-emerald-500 text-white'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Entity Path Finder"
          >
            <Route className="w-4 h-4" />
          </button>

          {/* Filters Toggle */}
          <button
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className={`p-2 rounded-xl border relative transition-all ${
              isFiltersOpen
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-900 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Graph Filters"
          >
            <Filter className="w-4 h-4" />
            {filters.riskLevels.length < 4 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-slate-950" />
            )}
          </button>

          {/* Labels Visibility Toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title={showLabels ? 'Hide Node Labels' : 'Show Node Labels'}
          >
            {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Export Modal Button */}
          <button
            onClick={() => setIsExportModalOpen(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Export Intelligence Dossier"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Investigation Workspace */}
      <div className="flex-1 flex gap-4 pt-4 overflow-hidden relative">
        {/* Main Center Area (Graph, Timeline, or Heatmap) */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden relative">
          {/* Top Floating AI Synthesis Banner */}
          <AIGraphInsightsCard
            insights={aiInsights}
            confidenceScore={confidenceScore}
            clusters={clusters}
            isRunningConsensus={isRunningConsensus}
            onRunConsensus={handleRunConsensus}
          />

          {/* Main Visualizer Stage */}
          <div className="flex-1 relative overflow-hidden rounded-2xl">
            {activeView === 'graph' && (
              <>
                <GraphCanvas
                  nodes={filteredNodes}
                  edges={filteredEdges}
                  clusters={clusters}
                  selectedNode={selectedNode}
                  highlightedPath={highlightedPath}
                  onSelectNode={(node) => setSelectedNode(node)}
                  showLabels={showLabels}
                  showEdgeLabels={showEdgeLabels}
                  isDarkMode={true}
                  animatedStage={animatedStage}
                />

                {/* Floating Path Finder Panel */}
                {isPathFinderOpen && (
                  <PathFinderPanel
                    nodes={nodes}
                    originNodeId={pathOriginId}
                    targetNodeId={pathTargetId}
                    pathResult={highlightedPath}
                    onSetOrigin={(id) => setPathOriginId(id)}
                    onSetTarget={(id) => setPathTargetId(id)}
                    onCalculatePath={handleCalculatePath}
                    onClearPath={handleClearPath}
                    onClose={() => setIsPathFinderOpen(false)}
                    onSelectNode={(n) => setSelectedNode(n)}
                  />
                )}

                {/* Floating Filters Drawer */}
                {isFiltersOpen && (
                  <GraphFiltersDrawer
                    filters={filters}
                    onChangeFilters={setFilters}
                    onResetFilters={() => setFilters({
                      riskLevels: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
                      nodeTypes: [
                        'transaction', 'customer', 'account', 'merchant', 'device', 
                        'ip_address', 'location', 'phone', 'email', 'beneficiary', 
                        'historical_case', 'fraud_ring', 'ai_recommendation'
                      ],
                      countries: [],
                      merchants: [],
                      agents: [],
                      fraudRings: [],
                      minAmount: 0,
                      maxAmount: 1000000,
                      minConfidence: 0,
                      dateRange: 'all',
                      searchQuery: '',
                    })}
                    onClose={() => setIsFiltersOpen(false)}
                    totalNodesCount={nodes.length}
                    filteredNodesCount={filteredNodes.length}
                  />
                )}

                {/* Floating Visual Legend */}
                <GraphLegend />
              </>
            )}

            {activeView === 'timeline' && (
              <TimelineView
                timeline={timeline}
                nodes={nodes}
                onSelectNode={(n) => {
                  setSelectedNode(n);
                  setActiveView('graph');
                }}
              />
            )}

            {activeView === 'heatmap' && (
              <RiskHeatmapView regions={heatmap} />
            )}
          </div>
        </div>

        {/* Right Side Investigation Inspector */}
        {selectedNode && (
          <InvestigationInspector
            node={selectedNode}
            edges={edges}
            allNodes={nodes}
            onClose={() => setSelectedNode(null)}
            onSelectNode={(n) => setSelectedNode(n)}
            onSetPathOrigin={(id) => {
              setPathOriginId(id);
              setIsPathFinderOpen(true);
            }}
            onSetPathTarget={(id) => {
              setPathTargetId(id);
              setIsPathFinderOpen(true);
            }}
          />
        )}
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <GraphExportModal
          nodes={filteredNodes}
          edges={filteredEdges}
          clusters={clusters}
          canvasRef={canvasRef}
          activeTransactionId={focusTxn?.id}
          aiInsights={aiInsights}
          onClose={() => setIsExportModalOpen(false)}
        />
      )}
    </div>
  );
}
