import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { 
  GraphNode, 
  GraphEdge, 
  GraphNodeType, 
  FraudCluster, 
  ShortestPathResult 
} from '../../types/graph';
import { 
  NODE_TYPE_CONFIG, 
  AGENT_COLOR_MAP,
  AGENT_DISPLAY_NAME_MAP 
} from '../../lib/graph_engine';

interface GraphCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: FraudCluster[];
  selectedNode: GraphNode | null;
  highlightedPath: ShortestPathResult | null;
  onSelectNode: (node: GraphNode | null) => void;
  showLabels: boolean;
  showEdgeLabels: boolean;
  isDarkMode?: boolean;
  animatedStage?: number; // 0: None, 1: AI Analysis, 2: Discovery, 3: Clusters, 4: Matching, 5: Consensus
}

export function GraphCanvas({
  nodes,
  edges,
  clusters,
  selectedNode,
  highlightedPath,
  onSelectNode,
  showLabels,
  showEdgeLabels,
  isDarkMode = true,
  animatedStage = 0,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniMapRef = useRef<HTMLCanvasElement>(null);

  // Transform state (pan X, pan Y, zoom Scale)
  const transformRef = useRef<{ x: number; y: number; k: number }>({ x: 0, y: 0, k: 1 });
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // D3 Force Simulation reference
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null);

  // Hover state
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Dragging state
  const isDraggingCanvasRef = useRef<boolean>(false);
  const dragStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const draggedNodeRef = useRef<GraphNode | null>(null);

  // Particle animation ticker
  const animFrameRef = useRef<number | null>(null);
  const particleOffsetRef = useRef<number>(0);

  // Mini-map dimensions
  const MINI_MAP_WIDTH = 180;
  const MINI_MAP_HEIGHT = 120;

  // Initialize D3 Force Simulation
  useEffect(() => {
    if (!nodes.length) return;

    const width = containerRef.current?.clientWidth || 1000;
    const height = containerRef.current?.clientHeight || 650;

    // Reset initial transforms to center
    if (transformRef.current.x === 0 && transformRef.current.y === 0) {
      transformRef.current = { x: width / 2, y: height / 2, k: 0.85 };
      setZoomLevel(85);
    }

    // Stop previous simulation
    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    // Deep clone/copy nodes and edges to avoid mutating props
    const simNodes: GraphNode[] = nodes.map(n => ({ ...n }));
    const simEdges: GraphEdge[] = edges.map(e => ({
      ...e,
      source: typeof e.source === 'object' ? e.source.id : e.source,
      target: typeof e.target === 'object' ? e.target.id : e.target,
    }));

    // Setup force simulation
    const simulation = d3.forceSimulation<GraphNode>(simNodes)
      .force(
        'link',
        d3.forceLink<GraphNode, GraphEdge>(simEdges)
          .id(d => d.id)
          .distance(d => (d.riskLevel === 'CRITICAL' ? 120 : 160))
          .strength(0.6)
      )
      .force('charge', d3.forceManyBody().strength(d => ((d as GraphNode).isCenter ? -1200 : -650)))
      .force('collision', d3.forceCollide<GraphNode>().radius(d => (NODE_TYPE_CONFIG[d.type]?.defaultRadius || 24) + 28))
      .force('center', d3.forceCenter(0, 0).strength(0.08))
      .alphaDecay(0.022);

    simulationRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [nodes.length, edges.length]);

  // Main Render Loop (Canvas + MiniMap)
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !simulationRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);
    const dpr = window.devicePixelRatio || 1;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Clear background
    ctx.fillStyle = isDarkMode ? '#090d16' : '#f8fafc';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw subtle background grid
    const { x: panX, y: panY, k: scale } = transformRef.current;
    const gridSize = 40 * scale;
    const offsetX = panX % gridSize;
    const offsetY = panY % gridSize;

    ctx.strokeStyle = isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = offsetX; x < width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = offsetY; y < height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // 3. Apply Camera Zoom & Pan Transformations
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(scale, scale);

    const currentNodes = simulationRef.current.nodes();
    const linkForce = simulationRef.current.force('link') as d3.ForceLink<GraphNode, GraphEdge>;
    const currentEdges = linkForce ? linkForce.links() : [];

    // Map for fast node lookup
    const nodeLookup = new Map<string, GraphNode>();
    currentNodes.forEach(n => nodeLookup.set(n.id, n));

    // 4. Draw Cluster Glowing Halos
    clusters.forEach(cluster => {
      const clusterNodes = cluster.nodeIds
        .map(id => nodeLookup.get(id))
        .filter((n): n is GraphNode => !!n && n.x !== undefined && n.y !== undefined);

      if (clusterNodes.length > 1) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        clusterNodes.forEach(n => {
          if (n.x! < minX) minX = n.x!;
          if (n.x! > maxX) maxX = n.x!;
          if (n.y! < minY) minY = n.y!;
          if (n.y! > maxY) maxY = n.y!;
        });

        const padding = 50;
        const boxX = minX - padding;
        const boxY = minY - padding;
        const boxW = maxX - minX + padding * 2;
        const boxH = maxY - minY + padding * 2;

        ctx.save();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.04)';
        ctx.strokeStyle = cluster.glowingColor || 'rgba(239, 68, 68, 0.35)';
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 6]);

        // Rounded rect for cluster
        const radius = 24;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxW, boxH, radius);
        ctx.fill();
        ctx.stroke();

        // Cluster Title Pill
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
        ctx.beginPath();
        ctx.roundRect(boxX + 16, boxY - 12, 220, 24, 12);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`🚨 ${cluster.name.substring(0, 28)}`, boxX + 26, boxY);
        ctx.restore();
      }
    });

    // 5. Draw Edges
    particleOffsetRef.current = (particleOffsetRef.current + 0.4) % 30;

    currentEdges.forEach((edge) => {
      const source = typeof edge.source === 'object' ? edge.source : nodeLookup.get(edge.source as string);
      const target = typeof edge.target === 'object' ? edge.target : nodeLookup.get(edge.target as string);

      if (!source || !target || source.x === undefined || source.y === undefined || target.x === undefined || target.y === undefined) {
        return;
      }

      const isPathEdge = highlightedPath?.pathEdgeIds.includes(edge.id);
      const isCritical = edge.riskLevel === 'CRITICAL';
      const agentColor = AGENT_COLOR_MAP[edge.discoveredByAgent] || '#64748b';

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);

      if (isPathEdge) {
        // Glowing Neon Gold/Green for Shortest Path
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 4.5;
        ctx.shadowColor = 'rgba(34, 197, 94, 0.8)';
        ctx.shadowBlur = 12;
      } else if (isCritical) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(239, 68, 68, 0.5)';
        ctx.shadowBlur = 6;
      } else {
        ctx.strokeStyle = isDarkMode ? 'rgba(148, 163, 184, 0.35)' : 'rgba(100, 116, 139, 0.45)';
        ctx.lineWidth = 1.5;
      }

      ctx.stroke();
      ctx.restore();

      // Animated Particles along high-risk / path edges
      if (isCritical || isPathEdge) {
        ctx.save();
        ctx.setLineDash([4, 12]);
        ctx.lineDashOffset = -particleOffsetRef.current;
        ctx.strokeStyle = isPathEdge ? '#86efac' : '#fca5a5';
        ctx.lineWidth = isPathEdge ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(source.x, source.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.restore();
      }

      // Edge Labels
      if (showEdgeLabels && scale > 0.6) {
        const midX = (source.x + target.x) / 2;
        const midY = (source.y + target.y) / 2;

        ctx.save();
        ctx.font = '8.5px sans-serif';
        const labelText = edge.label;
        const textMetrics = ctx.measureText(labelText);
        const padding = 4;

        ctx.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)';
        ctx.strokeStyle = isCritical ? '#ef4444' : (isDarkMode ? '#334155' : '#cbd5e1');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(
          midX - textMetrics.width / 2 - padding,
          midY - 7 - padding,
          textMetrics.width + padding * 2,
          14 + padding,
          6
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isCritical ? '#ef4444' : (isDarkMode ? '#cbd5e1' : '#475569');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, midX, midY);
        ctx.restore();
      }
    });

    // 6. Draw Nodes
    currentNodes.forEach((node) => {
      if (node.x === undefined || node.y === undefined) return;

      const config = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.transaction;
      const isSelected = selectedNode?.id === node.id;
      const isHovered = hoveredNode?.id === node.id;
      const isCenter = node.isCenter;
      const isCritical = node.riskTier === 'CRITICAL';
      const isPathNode = highlightedPath?.pathNodeIds.includes(node.id);

      const baseRadius = config.defaultRadius;
      const radius = (baseRadius + (isCenter ? 8 : 0) + (isSelected ? 6 : 0) + (isHovered ? 4 : 0));

      ctx.save();

      // Outer Pulsing Glow on Critical / Path / Selected Nodes
      if (isSelected || isPathNode || isCritical) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + (isSelected ? 10 : 6), 0, Math.PI * 2);
        ctx.fillStyle = isSelected
          ? 'rgba(59, 130, 246, 0.35)'
          : (isPathNode ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.25)');
        ctx.fill();

        if (isCritical) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
        }
      }

      // Central Focal Aura Ring
      if (isCenter) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius + 14, 0, Math.PI * 2);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
      }

      // Core Node Circle Body
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = config.bgColor;
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#ffffff' : config.borderColor;
      ctx.lineWidth = isSelected ? 3.5 : 2;
      ctx.stroke();

      // Node Type Glyph / Icon representation
      ctx.fillStyle = config.textColor;
      ctx.font = `bold ${radius > 26 ? '13px' : '11px'} sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Type abbreviation glyph
      const typeGlyphMap: Record<GraphNodeType, string> = {
        transaction: 'TX',
        customer: '👤',
        account: '🏛️',
        merchant: '🏪',
        device: '📱',
        ip_address: '🌐',
        location: '📍',
        phone: '📞',
        email: '✉️',
        beneficiary: '⇄',
        historical_case: '⚖️',
        fraud_ring: '💀',
        ai_recommendation: '✨',
      };
      const glyph = typeGlyphMap[node.type] || '●';
      ctx.fillText(glyph, node.x, node.y);

      // Risk Score Badge on Node Corner
      if (node.riskScore > 0 && radius >= 20) {
        const badgeX = node.x + radius * 0.7;
        const badgeY = node.y - radius * 0.7;
        const badgeRadius = 10;

        ctx.beginPath();
        ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
        ctx.fillStyle = isCritical ? '#dc2626' : (node.riskScore >= 50 ? '#d97706' : '#16a34a');
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8.5px sans-serif';
        ctx.fillText(String(node.riskScore), badgeX, badgeY);
      }

      ctx.restore();

      // Node Labels & Sublabels
      if (showLabels || isSelected || isHovered || isCenter) {
        ctx.save();
        const labelY = node.y + radius + 12;
        ctx.font = `bold ${isCenter ? '12px' : '11px'} sans-serif`;

        const labelText = node.label.length > 24 ? node.label.substring(0, 22) + '...' : node.label;
        const labelWidth = ctx.measureText(labelText).width;

        // Label Pill Background
        ctx.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.95)';
        ctx.strokeStyle = isSelected ? '#3b82f6' : (isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)');
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(node.x - labelWidth / 2 - 6, labelY - 8, labelWidth + 12, 16, 8);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = isDarkMode ? '#f8fafc' : '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, node.x, labelY);

        // Sublabel if available
        if (node.sublabel && scale > 0.75) {
          ctx.font = '9px sans-serif';
          ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
          const subText = node.sublabel.length > 22 ? node.sublabel.substring(0, 20) + '...' : node.sublabel;
          ctx.fillText(subText, node.x, labelY + 14);
        }

        ctx.restore();
      }
    });

    ctx.restore(); // Restore Camera Transform

    // 7. Render Mini-Map
    renderMiniMap(currentNodes, currentEdges, width, height);

    ctx.restore(); // Restore DPR scaling
  }, [nodes, edges, clusters, selectedNode, hoveredNode, highlightedPath, showLabels, showEdgeLabels, isDarkMode]);

  // Mini-Map Renderer
  const renderMiniMap = (
    currentNodes: GraphNode[],
    currentEdges: GraphEdge[],
    canvasWidth: number,
    canvasHeight: number
  ) => {
    const miniCanvas = miniMapRef.current;
    if (!miniCanvas) return;
    const miniCtx = miniCanvas.getContext('2d');
    if (!miniCtx) return;

    miniCtx.clearRect(0, 0, MINI_MAP_WIDTH, MINI_MAP_HEIGHT);

    // MiniMap Background
    miniCtx.fillStyle = isDarkMode ? 'rgba(15, 23, 42, 0.92)' : 'rgba(241, 245, 249, 0.95)';
    miniCtx.fillRect(0, 0, MINI_MAP_WIDTH, MINI_MAP_HEIGHT);

    if (currentNodes.length === 0) return;

    // Find bounding box of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    currentNodes.forEach(n => {
      if (n.x !== undefined && n.y !== undefined) {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      }
    });

    const graphWidth = Math.max(maxX - minX, 400);
    const graphHeight = Math.max(maxY - minY, 400);
    const scaleMini = Math.min((MINI_MAP_WIDTH - 20) / graphWidth, (MINI_MAP_HEIGHT - 20) / graphHeight);

    const miniCenterX = MINI_MAP_WIDTH / 2;
    const miniCenterY = MINI_MAP_HEIGHT / 2;
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const toMiniX = (gx: number) => miniCenterX + (gx - graphCenterX) * scaleMini;
    const toMiniY = (gy: number) => miniCenterY + (gy - graphCenterY) * scaleMini;

    // Draw Mini-Map Edges
    miniCtx.strokeStyle = isDarkMode ? 'rgba(148, 163, 184, 0.2)' : 'rgba(100, 116, 139, 0.2)';
    miniCtx.lineWidth = 0.8;
    miniCtx.beginPath();
    currentEdges.forEach(e => {
      const s = typeof e.source === 'object' ? e.source : currentNodes.find(n => n.id === e.source);
      const t = typeof e.target === 'object' ? e.target : currentNodes.find(n => n.id === e.target);
      if (s?.x !== undefined && s?.y !== undefined && t?.x !== undefined && t?.y !== undefined) {
        miniCtx.moveTo(toMiniX(s.x), toMiniY(s.y));
        miniCtx.lineTo(toMiniX(t.x), toMiniY(t.y));
      }
    });
    miniCtx.stroke();

    // Draw Mini-Map Nodes
    currentNodes.forEach(n => {
      if (n.x !== undefined && n.y !== undefined) {
        miniCtx.beginPath();
        miniCtx.arc(toMiniX(n.x), toMiniY(n.y), n.isCenter ? 3.5 : (n.riskTier === 'CRITICAL' ? 2.5 : 1.5), 0, Math.PI * 2);
        miniCtx.fillStyle = n.riskTier === 'CRITICAL' ? '#ef4444' : (n.isCenter ? '#38bdf8' : '#64748b');
        miniCtx.fill();
      }
    });

    // Draw Current Viewport Box on Mini-Map
    const { x: panX, y: panY, k: scale } = transformRef.current;
    const viewLeft = -panX / scale;
    const viewTop = -panY / scale;
    const viewRight = (canvasWidth - panX) / scale;
    const viewBottom = (canvasHeight - panY) / scale;

    const vx = toMiniX(viewLeft);
    const vy = toMiniY(viewTop);
    const vw = toMiniX(viewRight) - vx;
    const vh = toMiniY(viewBottom) - vy;

    miniCtx.strokeStyle = '#3b82f6';
    miniCtx.lineWidth = 1.5;
    miniCtx.fillStyle = 'rgba(59, 130, 246, 0.15)';
    miniCtx.beginPath();
    miniCtx.rect(vx, vy, vw, vh);
    miniCtx.fill();
    miniCtx.stroke();
  };

  // Run Animation Frame Loop
  useEffect(() => {
    let active = true;
    const loop = () => {
      if (!active) return;
      render();
      animFrameRef.current = requestAnimationFrame(loop);
    };
    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [render]);

  // Window Resize & DPR Canvas Buffer Adjuster
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const dpr = window.devicePixelRatio || 1;
      const width = container.clientWidth;
      const height = container.clientHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      render();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // Convert Screen Mouse Coordinate to Graph Space Coordinate
  const screenToGraphPos = (screenX: number, screenY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const mouseX = screenX - rect.left;
    const mouseY = screenY - rect.top;
    const { x: panX, y: panY, k: scale } = transformRef.current;
    return {
      x: (mouseX - panX) / scale,
      y: (mouseY - panY) / scale,
    };
  };

  // Find Node under Screen Position
  const findNodeAtPos = (screenX: number, screenY: number): GraphNode | null => {
    if (!simulationRef.current) return null;
    const { x, y } = screenToGraphPos(screenX, screenY);
    const nodes = simulationRef.current.nodes();

    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (node.x === undefined || node.y === undefined) continue;
      const config = NODE_TYPE_CONFIG[node.type] || NODE_TYPE_CONFIG.transaction;
      const radius = config.defaultRadius + (node.isCenter ? 8 : 0);
      const dist = Math.hypot(node.x - x, node.y - y);
      if (dist <= radius + 6) {
        return node;
      }
    }
    return null;
  };

  // Mouse & Touch Event Handlers for Drag, Pan & Zoom
  const handleMouseDown = (e: React.MouseEvent) => {
    const targetNode = findNodeAtPos(e.clientX, e.clientY);
    if (targetNode) {
      draggedNodeRef.current = targetNode;
      targetNode.fx = targetNode.x;
      targetNode.fy = targetNode.y;
      simulationRef.current?.alphaTarget(0.3).restart();
    } else {
      isDraggingCanvasRef.current = true;
      dragStartPosRef.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const targetNode = findNodeAtPos(e.clientX, e.clientY);
    setHoveredNode(targetNode);

    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      setHoverPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (draggedNodeRef.current) {
      const { x, y } = screenToGraphPos(e.clientX, e.clientY);
      draggedNodeRef.current.fx = x;
      draggedNodeRef.current.fy = y;
    } else if (isDraggingCanvasRef.current) {
      transformRef.current = {
        ...transformRef.current,
        x: e.clientX - dragStartPosRef.current.x,
        y: e.clientY - dragStartPosRef.current.y,
      };
    }
  };

  const handleMouseUp = () => {
    if (draggedNodeRef.current) {
      draggedNodeRef.current.fx = null;
      draggedNodeRef.current.fy = null;
      draggedNodeRef.current = null;
      simulationRef.current?.alphaTarget(0);
    }
    isDraggingCanvasRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    const targetNode = findNodeAtPos(e.clientX, e.clientY);
    onSelectNode(targetNode);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    const newScale = Math.max(0.2, Math.min(3.5, transformRef.current.k * zoomFactor));

    // Zoom centered around cursor
    const newX = mouseX - (mouseX - transformRef.current.x) * (newScale / transformRef.current.k);
    const newY = mouseY - (mouseY - transformRef.current.y) * (newScale / transformRef.current.k);

    transformRef.current = { x: newX, y: newY, k: newScale };
    setZoomLevel(Math.round(newScale * 100));
  };

  // Mini-Map Click-to-Pan Handler
  const handleMiniMapClick = (e: React.MouseEvent) => {
    const miniCanvas = miniMapRef.current;
    const mainCanvas = canvasRef.current;
    if (!miniCanvas || !mainCanvas || !simulationRef.current) return;

    const rect = miniCanvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const currentNodes = simulationRef.current.nodes();
    if (!currentNodes.length) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    currentNodes.forEach(n => {
      if (n.x !== undefined && n.y !== undefined) {
        if (n.x < minX) minX = n.x;
        if (n.x > maxX) maxX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.y > maxY) maxY = n.y;
      }
    });

    const graphWidth = Math.max(maxX - minX, 400);
    const graphHeight = Math.max(maxY - minY, 400);
    const scaleMini = Math.min((MINI_MAP_WIDTH - 20) / graphWidth, (MINI_MAP_HEIGHT - 20) / graphHeight);

    const miniCenterX = MINI_MAP_WIDTH / 2;
    const miniCenterY = MINI_MAP_HEIGHT / 2;
    const graphCenterX = (minX + maxX) / 2;
    const graphCenterY = (minY + maxY) / 2;

    const targetGraphX = graphCenterX + (clickX - miniCenterX) / scaleMini;
    const targetGraphY = graphCenterY + (clickY - miniCenterY) / scaleMini;

    const width = mainCanvas.width / (window.devicePixelRatio || 1);
    const height = mainCanvas.height / (window.devicePixelRatio || 1);

    transformRef.current = {
      ...transformRef.current,
      x: width / 2 - targetGraphX * transformRef.current.k,
      y: height / 2 - targetGraphY * transformRef.current.k,
    };
  };

  // Center on Selected Node
  const centerOnNode = useCallback((node: GraphNode) => {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas || node.x === undefined || node.y === undefined) return;
    const width = mainCanvas.width / (window.devicePixelRatio || 1);
    const height = mainCanvas.height / (window.devicePixelRatio || 1);

    transformRef.current = {
      k: 1.1,
      x: width / 2 - node.x * 1.1,
      y: height / 2 - node.y * 1.1,
    };
    setZoomLevel(110);
  }, []);

  // When selectedNode changes externally, auto-center
  useEffect(() => {
    if (selectedNode) {
      centerOnNode(selectedNode);
    }
  }, [selectedNode?.id, centerOnNode]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-[620px] bg-slate-950 rounded-2xl overflow-hidden select-none cursor-grab active:cursor-grabbing border border-slate-800/80 shadow-inner"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
      onWheel={handleWheel}
    >
      {/* Primary HTML5 Rendering Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />

      {/* Floating Hover Tooltip */}
      {hoveredNode && hoverPos && (
        <div
          className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-3"
          style={{ left: hoverPos.x, top: hoverPos.y }}
        >
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700 text-white px-3.5 py-2.5 rounded-xl shadow-2xl text-xs space-y-1 min-w-[200px] max-w-[280px] animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between gap-2">
              <span className="font-extrabold text-slate-100 truncate text-[11px]">
                {hoveredNode.label}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${
                  hoveredNode.riskTier === 'CRITICAL'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : (hoveredNode.riskTier === 'HIGH' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30')
                }`}
              >
                {hoveredNode.riskScore}/100 Risk
              </span>
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Type: <strong className="text-slate-300 font-semibold">{NODE_TYPE_CONFIG[hoveredNode.type]?.label || hoveredNode.type}</strong></span>
              {hoveredNode.country && <span>{hoveredNode.country}</span>}
            </div>

            {hoveredNode.aiSummary && (
              <p className="text-[10px] text-slate-300 line-clamp-2 leading-relaxed pt-1 border-t border-slate-800">
                {hoveredNode.aiSummary}
              </p>
            )}

            <div className="text-[9px] text-blue-400 font-semibold pt-0.5">
              Click to open full investigation dossier →
            </div>
          </div>
        </div>
      )}

      {/* Interactive Mini-Map in Bottom-Left */}
      <div className="absolute bottom-4 left-4 z-20 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl overflow-hidden shadow-2xl p-1.5 flex flex-col gap-1">
        <div className="flex items-center justify-between px-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          <span>Network Radar</span>
          <span className="text-blue-400 font-mono">{zoomLevel}%</span>
        </div>
        <canvas
          ref={miniMapRef}
          width={MINI_MAP_WIDTH}
          height={MINI_MAP_HEIGHT}
          onClick={handleMiniMapClick}
          className="rounded-lg cursor-crosshair border border-slate-800 block"
        />
      </div>

      {/* Floating Animated Stage Indicator when running consensus */}
      {animatedStage > 0 && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-slate-900/90 backdrop-blur-xl border border-blue-500/60 text-white px-5 py-2.5 rounded-full shadow-[0_0_30px_rgba(59,130,246,0.3)] flex items-center gap-3 animate-pulse">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          <span className="text-xs font-bold text-slate-100 tracking-wide">
            {animatedStage === 1 && '1/5: Synthesizing Multi-Agent AI Telemetry...'}
            {animatedStage === 2 && '2/5: Expanding Hidden Entity Relationships & Proxy Hops...'}
            {animatedStage === 3 && '3/5: Isolating High-Risk Syndicate Clusters & Mule Loops...'}
            {animatedStage === 4 && '4/5: Matching Vector Embeddings against Historical Fraud Cases...'}
            {animatedStage === 5 && '5/5: Supervisor Consensus Reached (98.8% Confidence)'}
          </span>
        </div>
      )}
    </div>
  );
}
