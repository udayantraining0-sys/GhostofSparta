'use client';

import { motion } from 'framer-motion';
import { Bot, Search, Code2, Globe, Brain, Cpu, Target, Zap, Pause, Play, Square } from 'lucide-react';
import type { Agent, AgentType } from '@/types/agents';

const AGENT_ICONS: Record<AgentType, React.ReactNode> = {
  researcher: <Search size={18} />,
  coder: <Code2 size={18} />,
  planner: <Target size={18} />,
  executor: <Cpu size={18} />,
  browser_agent: <Globe size={18} />,
  memory_agent: <Brain size={18} />,
};

const AGENT_LABELS: Record<AgentType, string> = {
  researcher: 'RESEARCH',
  coder: 'CODE',
  planner: 'PLAN',
  executor: 'EXEC',
  browser_agent: 'BROWSER',
  memory_agent: 'MEMORY',
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'rgba(0,240,255,0.4)',
  thinking: '#1E90FF',
  executing: '#FF6B35',
  paused: 'rgba(255,255,255,0.3)',
  stopped: '#FF3333',
  error: '#FF3333',
  completed: '#00FFD1',
};

const STATUS_LABELS: Record<string, string> = {
  idle: 'IDLE',
  thinking: 'THINKING',
  executing: 'EXECUTING',
  paused: 'PAUSED',
  stopped: 'STOPPED',
  error: 'ERROR',
  completed: 'DONE',
};

interface Props {
  agent: Agent;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onClick?: () => void;
  isActive?: boolean;
}

export default function AgentCard({ agent, onPause, onResume, onStop, onClick, isActive }: Props) {
  const statusColor = STATUS_COLORS[agent.status] || STATUS_COLORS.idle;

  return (
    <motion.div
      className={`glass-panel p-4 cursor-pointer transition-all ${
        isActive ? 'glass-panel-active ring-1 ring-neon-cyan/20' : 'hover:border-neon-cyan/15'
      }`}
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      layout
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-neon-cyan/5 border border-neon-cyan/10 flex items-center justify-center text-neon-cyan">
            {AGENT_ICONS[agent.type] || <Bot size={18} />}
          </div>
          <div>
            <p className="text-sm text-white/80 font-medium">{agent.name}</p>
            <p className="text-[10px] text-white/30 font-mono uppercase">{AGENT_LABELS[agent.type]}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {agent.status === 'executing' && (
            <button
              onClick={(e) => { e.stopPropagation(); onPause?.(); }}
              className="p-1 rounded hover:bg-neon-cyan/10 text-white/40 hover:text-neon-cyan"
            >
              <Pause size={14} />
            </button>
          )}
          {agent.status === 'paused' && (
            <button
              onClick={(e) => { e.stopPropagation(); onResume?.(); }}
              className="p-1 rounded hover:bg-neon-cyan/10 text-white/40 hover:text-neon-cyan"
            >
              <Play size={14} />
            </button>
          )}
          {['executing', 'thinking', 'paused'].includes(agent.status) && (
            <button
              onClick={(e) => { e.stopPropagation(); onStop?.(); }}
              className="p-1 rounded hover:bg-red-500/10 text-white/40 hover:text-red-400"
            >
              <Square size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-2 mb-3">
        <motion.div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: statusColor }}
          animate={{
            opacity: ['idle', 'paused', 'stopped'].includes(agent.status) ? [0.5, 1, 0.5] : 1,
            scale: agent.status === 'executing' ? [1, 1.3, 1] : 1,
          }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-[10px] font-mono text-white/40">{STATUS_LABELS[agent.status]}</span>
        {agent.currentTask && (
          <>
            <span className="w-px h-3 bg-glass" />
            <span className="text-[10px] text-white/25 truncate">{agent.currentTask}</span>
          </>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-2 py-1.5 rounded-md bg-white/[0.02] border border-glass">
          <p className="text-[9px] text-white/20 uppercase font-mono">Model</p>
          <p className="text-[10px] text-neon-cyan/60 font-mono truncate">{agent.model}</p>
        </div>
        <div className="px-2 py-1.5 rounded-md bg-white/[0.02] border border-glass">
          <p className="text-[9px] text-white/20 uppercase font-mono">Tools</p>
          <p className="text-[10px] text-neon-cyan/60 font-mono">{agent.toolCount}</p>
        </div>
        <div className="px-2 py-1.5 rounded-md bg-white/[0.02] border border-glass">
          <p className="text-[9px] text-white/20 uppercase font-mono">Memory</p>
          <p className="text-[10px] text-neon-cyan/60 font-mono">{agent.memoryUsage}MB</p>
        </div>
        <div className="px-2 py-1.5 rounded-md bg-white/[0.02] border border-glass">
          <p className="text-[9px] text-white/20 uppercase font-mono">Started</p>
          <p className="text-[10px] text-neon-cyan/60 font-mono">{agent.startedAt ? 'Active' : '--'}</p>
        </div>
      </div>
    </motion.div>
  );
}
