'use client';

import { useAgentStore } from '@/stores/agentStore';
import { motion } from 'framer-motion';
import { Bot, Cpu, Search, Code2, Brain, Globe, Target } from 'lucide-react';
import type { AgentType } from '@/types/agents';

const AGENT_ICONS: Record<AgentType, React.ReactNode> = {
  researcher: <Search size={14} />,
  coder: <Code2 size={14} />,
  planner: <Target size={14} />,
  executor: <Cpu size={14} />,
  browser_agent: <Globe size={14} />,
  memory_agent: <Brain size={14} />,
};

const STATUS_COLORS: Record<string, string> = {
  idle: 'rgba(0,240,255,0.3)',
  thinking: '#1E90FF',
  executing: '#FF6B35',
  paused: 'rgba(255,255,255,0.3)',
  stopped: '#FF3333',
  error: '#FF3333',
};

export default function AgentStatusBar() {
  const { agents } = useAgentStore();

  if (agents.length === 0) {
    return (
      <div className="p-4">
        <p className="text-xs text-white/20 font-mono uppercase tracking-wider">No Active Agents</p>
        <p className="text-xs text-white/10 mt-1">Create an agent to begin</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-2">
      <p className="text-xs font-mono text-white/30 uppercase tracking-wider px-1">
        Active Agents ({agents.length})
      </p>
      {agents.map((agent, i) => (
        <motion.div
          key={agent.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-2 p-2 rounded-lg border border-glass hover:border-neon-cyan/20 transition-colors cursor-pointer"
        >
          <div className="w-7 h-7 rounded-md bg-neon-cyan/5 border border-neon-cyan/10 flex items-center justify-center text-neon-cyan/60">
            {AGENT_ICONS[agent.type] || <Bot size={14} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/60 truncate">{agent.name}</p>
            <p className="text-[10px] text-white/30 font-mono">{agent.type}</p>
          </div>
          <motion.div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: STATUS_COLORS[agent.status] || 'gray' }}
            animate={{ opacity: ['idle', 'paused'].includes(agent.status) ? [0.5, 1, 0.5] : 1 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        </motion.div>
      ))}
    </div>
  );
}
