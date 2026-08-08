import jsPDF from 'jspdf';
import { GraphNode, GraphEdge, GraphExportData, FraudCluster } from '../types/graph';
import { NODE_TYPE_CONFIG } from './graph_engine';

/**
 * Downloads a Blob/String file to the user's browser
 */
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * High-Resolution PNG Export of the Canvas Graph
 */
export function exportGraphToPNG(
  canvas: HTMLCanvasElement,
  filename: string = `RiskLens_Relationship_Graph_${Date.now()}.png`
) {
  canvas.toBlob((blob) => {
    if (blob) {
      triggerDownload(blob, filename);
    }
  }, 'image/png');
}

/**
 * Vector SVG Export of Nodes and Edges
 */
export function exportGraphToSVG(
  nodes: GraphNode[],
  edges: GraphEdge[],
  width: number = 1400,
  height: number = 900,
  filename: string = `RiskLens_Relationship_Graph_${Date.now()}.svg`
) {
  let svgContent = `<?xml version="1.0" standalone="no"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="background-color: #0f172a; font-family: sans-serif;">
  <defs>
    <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0.8"/>
    </linearGradient>
  </defs>
  
  <!-- Header Title & Watermark -->
  <text x="40" y="50" fill="#ffffff" font-size="20" font-weight="bold">RiskLens AI - Fraud Relationship Intelligence Graph</text>
  <text x="40" y="75" fill="#94a3b8" font-size="12">Generated: ${new Date().toUTCString()} | Total Entities: ${nodes.length} | Connections: ${edges.length}</text>

  <!-- Edges -->
  <g stroke-linecap="round">
`;

  // Draw edges
  edges.forEach((e) => {
    const s = typeof e.source === 'object' ? e.source : nodes.find(n => n.id === e.source);
    const t = typeof e.target === 'object' ? e.target : nodes.find(n => n.id === e.target);
    if (s && t && s.x !== undefined && s.y !== undefined && t.x !== undefined && t.y !== undefined) {
      const strokeColor = e.riskLevel === 'CRITICAL' ? '#ef4444' : '#64748b';
      const strokeWidth = e.riskLevel === 'CRITICAL' ? '2.5' : '1.5';
      svgContent += `    <line x1="${s.x}" y1="${s.y}" x2="${t.x}" y2="${t.y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-opacity="0.75" />\n`;
    }
  });

  svgContent += `  </g>\n\n  <!-- Nodes -->\n  <g>\n`;

  // Draw nodes
  nodes.forEach((n) => {
    if (n.x !== undefined && n.y !== undefined) {
      const config = NODE_TYPE_CONFIG[n.type] || NODE_TYPE_CONFIG.transaction;
      const radius = config.defaultRadius + (n.isCenter ? 8 : 0);
      const isCritical = n.riskTier === 'CRITICAL';

      // Glow halo
      if (isCritical) {
        svgContent += `    <circle cx="${n.x}" cy="${n.y}" r="${radius + 6}" fill="none" stroke="#ef4444" stroke-width="2" stroke-dasharray="4,4" opacity="0.8" />\n`;
      }

      // Core circle
      svgContent += `    <circle cx="${n.x}" cy="${n.y}" r="${radius}" fill="${config.bgColor}" stroke="${config.borderColor}" stroke-width="2.5" />\n`;

      // Label
      svgContent += `    <text x="${n.x}" y="${n.y + radius + 14}" fill="#f8fafc" font-size="11" font-weight="bold" text-anchor="middle">${n.label.replace(/&/g, '&amp;')}</text>\n`;
      if (n.sublabel) {
        svgContent += `    <text x="${n.x}" y="${n.y + radius + 26}" fill="#94a3b8" font-size="9" text-anchor="middle">${n.sublabel.replace(/&/g, '&amp;')}</text>\n`;
      }
    }
  });

  svgContent += `  </g>\n</svg>`;

  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  triggerDownload(blob, filename);
}

/**
 * Export Network Topology as JSON
 */
export function exportGraphToJSON(
  exportData: GraphExportData,
  filename: string = `RiskLens_Graph_Topology_${Date.now()}.json`
) {
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
  triggerDownload(blob, filename);
}

/**
 * Export Graph Nodes and Edges to CSV Adjacency Lists
 */
export function exportGraphToCSV(
  nodes: GraphNode[],
  edges: GraphEdge[],
  filenamePrefix: string = `RiskLens_Graph_${Date.now()}`
) {
  // 1. Nodes CSV
  let nodesCSV = 'ID,Label,Type,RiskScore,RiskTier,Confidence,Country,LastActivity,AISummary\n';
  nodes.forEach(n => {
    const cleanLabel = `"${(n.label || '').replace(/"/g, '""')}"`;
    const cleanSummary = `"${(n.aiSummary || '').replace(/"/g, '""')}"`;
    nodesCSV += `${n.id},${cleanLabel},${n.type},${n.riskScore},${n.riskTier},${n.confidenceScore || 0},${n.country || 'N/A'},${n.lastActivity || 'N/A'},${cleanSummary}\n`;
  });

  const nodesBlob = new Blob([nodesCSV], { type: 'text/csv;charset=utf-8' });
  triggerDownload(nodesBlob, `${filenamePrefix}_nodes.csv`);

  // 2. Edges CSV
  let edgesCSV = 'Source,Target,RelationshipType,Label,DiscoveredByAgent,Confidence,RiskLevel\n';
  edges.forEach(e => {
    const sId = typeof e.source === 'object' ? e.source.id : e.source;
    const tId = typeof e.target === 'object' ? e.target.id : e.target;
    edgesCSV += `${sId},${tId},${e.relationshipType},"${e.label}",${e.discoveredByAgent},${e.confidence},${e.riskLevel}\n`;
  });

  const edgesBlob = new Blob([edgesCSV], { type: 'text/csv;charset=utf-8' });
  triggerDownload(edgesBlob, `${filenamePrefix}_edges.csv`);
}

/**
 * Enterprise PDF Report Export containing the Graph Visual Snapshot & Forensic Dossier
 */
export function exportGraphToPDF(
  exportData: GraphExportData,
  canvas: HTMLCanvasElement,
  filename: string = `RiskLens_Intelligence_Graph_Report_${Date.now()}.pdf`
) {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pdfWidth = 297;
  const pdfHeight = 210;

  // Background Canvas Header
  pdf.setFillColor(15, 23, 42); // Dark slate
  pdf.rect(0, 0, pdfWidth, 24, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RiskLens AI - Fraud Relationship Intelligence Graph Dossier', 14, 12);

  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(148, 163, 184);
  pdf.text(`Investigator: ${exportData.investigator} | Case Date: ${new Date().toUTCString()} | Total Nodes: ${exportData.totalNodes} | Edges: ${exportData.totalEdges}`, 14, 18);

  // Graph Snapshot Image
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  pdf.addImage(imgData, 'JPEG', 14, 28, 269, 130);

  // Forensic Summary & Syndicate Assessment Footer Card
  pdf.setFillColor(248, 250, 252);
  pdf.setDrawColor(203, 213, 225);
  pdf.roundedRect(14, 162, 269, 38, 3, 3, 'FD');

  pdf.setTextColor(30, 41, 59);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MULTI-AGENT GRAPH FORENSIC ASSESSMENT', 20, 170);

  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(71, 85, 105);

  const summaryText = exportData.aiInsightsSummary || 
    `Autonomous multi-agent surveillance detected ${exportData.clustersFound} suspicious fraud cluster(s) with ${exportData.totalNodes} interconnected nodes. Relationship topology demonstrates cross-jurisdiction device sharing, proxy tunneling, and rapid mule layering consistent with organized cyber syndicates. Immediate settlement suspension and SAR reporting are enforced.`;

  const splitLines = pdf.splitTextToSize(summaryText, 255);
  pdf.text(splitLines, 20, 177);

  // Page numbering
  pdf.setFontSize(8);
  pdf.setTextColor(148, 163, 184);
  pdf.text('Confidential - Law Enforcement & AML Financial Intelligence Unit (FIU) Use Only', 14, 204);
  pdf.text('Page 1 of 1', 265, 204);

  pdf.save(filename);
}
