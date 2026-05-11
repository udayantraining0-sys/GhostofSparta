'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Play, Plus, Save, Trash2, ArrowRight, MessageCircle,
  Bot, Wrench, Brain, Clock, GitBranch, GitMerge,
  Power, Flag, Move, ZoomIn, ZoomOut,
} from 'lucide-react';

interface WorkflowNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  config?: Record<string, string>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

const NODE_COLORS: Record<string, string> = {
  start: '#00F0FF',
  end: '#00FFD1',
  chat: '#1E90FF',
  agent: '#FF6B35',
  tool: '#8B5CF6',
  memory: '#00F0FF',
  wait: '#F59E0B',
  condition: '#EC4899',
  branch: '#6366F1',
  merge: '#14B8A6',
};

const NODE_ICONS: Record<string, React.ReactNode> = {
  start: <Power size={14} />,
  end: <Flag size={14} />,
  chat: <MessageCircle size={14} />,
  agent: <Bot size={14} />,
  tool: <Wrench size={14} />,
  memory: <Brain size={14} />,
  wait: <Clock size={14} />,
  condition: <GitBranch size={14} />,
  branch: <GitBranch size={14} />,
  merge: <GitMerge size={14} />,
};

const PALETTE_TYPES = [
  { type: 'chat', label: 'Chat' },
  { type: 'agent', label: 'Agent' },
  { type: 'tool', label: 'Tool' },
  { type: 'memory', label: 'Memory' },
  { type: 'wait', label: 'Wait' },
  { type: 'condition', label: 'Condition' },
];

export default function WorkflowBuilder() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<WorkflowNode[]>([
    { id: 'start', type: 'start', label: 'Start', x: 80, y: 200 },
    { id: 'end', type: 'end', label: 'End', x: 620, y: 200 },
  ]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([
    { id: 'e1', source: 'start', target: 'end' },
  ]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [scale, setScale] = useState(1);

  const addNode = (type: string) => {
    const id = crypto.randomUUID();
    const centerX = 350 + Math.random() * 100;
    const centerY = 200 + Math.random() * 100;
    const label = PALETTE_TYPES.find((p) => p.type === type)?.label || type;

    setNodes((prev) => [...prev, { id, type, label, x: centerX, y: centerY }]);
  };

  const handleNodeClick = (nodeId: string) => {
    if (connectingFrom) {
      if (nodeId !== connectingFrom) {
        setEdges((prev) => [...prev, { id: crypto.randomUUID(), source: connectingFrom, target: nodeId }]);
      }
      setConnectingFrom(null);
    } else {
      setSelectedNode(nodeId === selectedNode ? null : nodeId);
    }
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (e.shiftKey) {
      e.preventDefault();
      setConnectingFrom(nodeId);
      return;
    }

    const startX = e.clientX;
    const startY = e.clientY;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    const handleMove = (me: MouseEvent) => {
      const dx = (me.clientX - startX) / scale;
      const dy = (me.clientY - startY) / scale;
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, x: Math.max(0, node.x + dx), y: Math.max(0, node.y + dy) } : n
        )
      );
    };

    const handleUp = () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === 'start' || nodeId === 'end') return;
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
  };

  const runWorkflow = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 3000);
  };

  return (
    <div className="flex h-full">
      {/* Palette */}
      <div className="w-40 shrink-0 border-r border-glass p-3 space-y-2 overflow-y-auto">
        <p className="text-[10px] font-mono text-white/20 uppercase tracking-wider mb-2">Nodes</p>
        {PALETTE_TYPES.map((item) => (
          <motion.button
            key={item.type}
            onClick={() => addNode(item.type)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-glass hover:border-neon-cyan/20 text-xs text-white/40 hover:text-neon-cyan transition-colors"
            whileHover={{ x: 2 }}
          >
            <span style={{ color: NODE_COLORS[item.type] }}>{NODE_ICONS[item.type]}</span>
            {item.label}
          </motion.button>
        ))}

        <div className="pt-4 border-t border-glass">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-wider mb-2">Actions</p>
          <button
            onClick={runWorkflow}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md cyber-button cyber-button-primary text-xs mb-2"
          >
            <Play size={12} /> Run
          </button>
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-white/30 hover:text-white/50 transition-colors">
            <Save size={12} /> Save
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative overflow-hidden bg-space-black/40">
        {/* Toolbar */}
        <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between">
          <input
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            className="text-sm font-mono text-neon-cyan/60 bg-transparent outline-none"
          />
          <div className="flex items-center gap-2">
            <button onClick={() => setScale(Math.max(0.5, scale - 0.1))} className="p-1 rounded text-white/20 hover:text-white/50">
              <ZoomOut size={14} />
            </button>
            <span className="text-[10px] font-mono text-white/20">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(Math.min(2, scale + 0.1))} className="p-1 rounded text-white/20 hover:text-white/50">
              <ZoomIn size={14} />
            </button>
            {connectingFrom && (
              <span className="text-[10px] font-mono text-neon-cyan/50 animate-pulse">Connecting...</span>
            )}
          </div>
        </div>

        {/* Node canvas */}
        <div
          ref={canvasRef}
          className="absolute inset-0"
          style={{ transform: `scale(${scale})`, transformOrigin: '0 0' }}
        >
          {/* Grid background */}
          <svg className="absolute inset-0 w-[2000px] h-[2000px] pointer-events-none">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,240,255,0.03)" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          {/* Edges */}
          <svg className="absolute inset-0 w-[2000px] h-[2000px] pointer-events-none z-0">
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              if (!src || !tgt) return null;

              return (
                <g key={edge.id}>
                  <line
                    x1={src.x + 70}
                    y1={src.y + 28}
                    x2={tgt.x + 70}
                    y2={tgt.y + 28}
                    stroke="rgba(0,240,255,0.15)"
                    strokeWidth="1.5"
                    strokeDasharray={isRunning ? '6 3' : '3 2'}
                  />
                  <polygon
                    points={`${tgt.x + 65},${tgt.y + 23} ${tgt.x + 80},${tgt.y + 28} ${tgt.x + 65},${tgt.y + 33}`}
                    fill="rgba(0,240,255,0.2)"
                  />
                </g>
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <motion.div
              key={node.id}
              className={`absolute glass-panel px-3 py-2 cursor-pointer select-none ${
                selectedNode === node.id ? 'glass-panel-active ring-1 ring-neon-cyan/30' : ''
              } ${connectingFrom === node.id ? 'ring-1 ring-holographic/50' : ''}`}
              style={{
                left: node.x,
                top: node.y,
                minWidth: 140,
                zIndex: selectedNode === node.id ? 20 : 10,
              }}
              onClick={() => handleNodeClick(node.id)}
              onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
              whileHover={{ y: -1, borderColor: 'rgba(0,240,255,0.25)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded flex items-center justify-center"
                  style={{ backgroundColor: NODE_COLORS[node.type] + '15', color: NODE_COLORS[node.type] }}
                >
                  {NODE_ICONS[node.type] || <Move size={14} />}
                </div>
                <div>
                  <p className="text-[11px] text-white/70 font-medium">{node.label}</p>
                  <p className="text-[9px] text-white/25 font-mono uppercase">{node.type}</p>
                </div>
                {node.id !== 'start' && node.id !== 'end' && selectedNode === node.id && (
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                    className="ml-auto p-1 rounded hover:bg-red-500/10 text-white/15 hover:text-red-400"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Hint text */}
        {nodes.length <= 2 && (
          <div className="absolute bottom-4 left-4 text-[11px] text-white/10 font-mono">
            Shift+Click node to connect   |   Click palette to add nodes   |   Drag nodes to reposition
          </div>
        )}
      </div>
    </div>
  );
}
