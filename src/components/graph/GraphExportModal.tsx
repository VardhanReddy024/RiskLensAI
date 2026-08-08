import React, { useState } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  Image as ImageIcon, 
  Code, 
  Table, 
  Check, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { GraphNode, GraphEdge, GraphExportData, FraudCluster } from '../../types/graph';
import { 
  exportGraphToPNG, 
  exportGraphToSVG, 
  exportGraphToJSON, 
  exportGraphToCSV, 
  exportGraphToPDF 
} from '../../lib/graph_export';

interface GraphExportModalProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: FraudCluster[];
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  activeTransactionId?: string;
  aiInsights?: string;
  onClose: () => void;
}

export function GraphExportModal({
  nodes,
  edges,
  clusters,
  canvasRef,
  activeTransactionId,
  aiInsights,
  onClose,
}: GraphExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'png' | 'svg' | 'json' | 'csv'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = () => {
    setIsExporting(true);

    const exportData: GraphExportData = {
      title: 'RiskLens AI - Fraud Relationship Intelligence Graph Dossier',
      generatedAt: new Date().toISOString(),
      investigator: 'Lead Fraud Analyst / AML Officer',
      activeTransactionId,
      totalNodes: nodes.length,
      totalEdges: edges.length,
      clustersFound: clusters.length,
      nodes,
      edges,
      clusters,
      aiInsightsSummary: aiInsights,
    };

    try {
      if (selectedFormat === 'pdf' && canvasRef.current) {
        exportGraphToPDF(exportData, canvasRef.current);
      } else if (selectedFormat === 'png' && canvasRef.current) {
        exportGraphToPNG(canvasRef.current);
      } else if (selectedFormat === 'svg') {
        exportGraphToSVG(nodes, edges);
      } else if (selectedFormat === 'json') {
        exportGraphToJSON(exportData);
      } else if (selectedFormat === 'csv') {
        exportGraphToCSV(nodes, edges);
      }

      setExportSuccess(true);
      setTimeout(() => {
        setIsExporting(false);
        setExportSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-5 text-xs text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-white font-bold text-sm">
            <Download className="w-4 h-4 text-blue-400" />
            <span>Export Intelligence Graph Dossier</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Grid */}
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Select Output Format
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setSelectedFormat('pdf')}
              className={`p-3 rounded-xl border flex items-start gap-3 transition-all text-left ${
                selectedFormat === 'pdf'
                  ? 'bg-blue-950/50 border-blue-500 text-white ring-1 ring-blue-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <FileText className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-100 block">Executive PDF Report</span>
                <span className="text-[10px] text-slate-400">Formal law enforcement & FIU compliance dossier with visual snapshot.</span>
              </div>
            </button>

            <button
              onClick={() => setSelectedFormat('png')}
              className={`p-3 rounded-xl border flex items-start gap-3 transition-all text-left ${
                selectedFormat === 'png'
                  ? 'bg-blue-950/50 border-blue-500 text-white ring-1 ring-blue-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <ImageIcon className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-100 block">High-Res PNG Canvas</span>
                <span className="text-[10px] text-slate-400">Lossless 2x raster image of current network topology.</span>
              </div>
            </button>

            <button
              onClick={() => setSelectedFormat('svg')}
              className={`p-3 rounded-xl border flex items-start gap-3 transition-all text-left ${
                selectedFormat === 'svg'
                  ? 'bg-blue-950/50 border-blue-500 text-white ring-1 ring-blue-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Code className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-100 block">Vector SVG Format</span>
                <span className="text-[10px] text-slate-400">Scalable vector graphic for presentations and i2 Analyst import.</span>
              </div>
            </button>

            <button
              onClick={() => setSelectedFormat('json')}
              className={`p-3 rounded-xl border flex items-start gap-3 transition-all text-left ${
                selectedFormat === 'json'
                  ? 'bg-blue-950/50 border-blue-500 text-white ring-1 ring-blue-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Code className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-100 block">Network JSON Schema</span>
                <span className="text-[10px] text-slate-400">Complete node & edge graph payload for Palantir/Neo4j pipelines.</span>
              </div>
            </button>

            <button
              onClick={() => setSelectedFormat('csv')}
              className={`p-3 rounded-xl border flex items-start gap-3 transition-all text-left col-span-2 ${
                selectedFormat === 'csv'
                  ? 'bg-blue-950/50 border-blue-500 text-white ring-1 ring-blue-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Table className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-100 block">Nodes & Edges CSV Bundle</span>
                <span className="text-[10px] text-slate-400">Two separate tabular CSV files containing full forensic adjacency matrices.</span>
              </div>
            </button>
          </div>
        </div>

        {/* Export Metadata Summary */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-[11px] text-slate-400">
          <div>
            <span>Nodes: <strong className="text-slate-200">{nodes.length}</strong></span>
            <span className="mx-2">•</span>
            <span>Relationships: <strong className="text-slate-200">{edges.length}</strong></span>
            <span className="mx-2">•</span>
            <span>Clusters: <strong className="text-rose-400">{clusters.length}</strong></span>
          </div>
          <span className="text-[10px] text-slate-500">Watermarked & Time-Stamped</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-950/50 disabled:opacity-50"
          >
            {exportSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Export Complete!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>{isExporting ? 'Generating Package...' : 'Download Export'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
