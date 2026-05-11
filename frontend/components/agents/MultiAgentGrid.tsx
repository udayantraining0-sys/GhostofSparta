'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Activity } from 'lucide-react';
import AgentCard from './AgentCard';
import AgentThoughtStream from './AgentThoughtStream';
import { useAgentStore } from '@/stores/agentStore';
import type { Agent, AgentThought } from '@/types/agents';

export default function MultiAgentGrid() {
  const { agents, setActiveAgent, activeAgentId } = useAgentStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [demoThoughts, setDemoThoughts] = useState<AgentThought[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Simulated neural connections between agents
  useEffect(() => {
    if (agents.length < 2) return;

    const seedThoughts: AgentThought[] = [];
    agents.forEach((agent, i) => {
      seedThoughts.push({
        id: `seed-${i}`,
        agentId: agent.id,
        step: 0,
        type: 'planning',
        content: `Agent initialized with ${agent.model}`,
        toolName: null,
        toolStatus: null,
        timestamp: new Date().toISOString(),
      });
    });
    setDemoThoughts(seedThoughts);
  }, [agents.length]);

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setActiveAgent(agent.id);
  };

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <motion.div
          className="w-16 h-16 rounded-full bg-neon-cyan/5 border border-neon-cyan/10 flex items-center justify-center text-neon-cyan/40"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Activity size={28} />
        </motion.div>
        <div className="text-center">
          <p className="text-neon-cyan/40 font-mono text-sm">NO ACTIVE AGENTS</p>
          <p className="text-white/15 text-xs mt-1">Create an agent to begin</p>
        </div>
        <button className="cyber-button cyber-button-primary flex items-center gap-2">
          <Plus size={14} />
          <span>Create Agent</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Agent Grid */}
      <div ref={containerRef} className="flex-1 p-4 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence>
            {agents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
              >
                <AgentCard
                  agent={agent}
                  isActive={activeAgentId === agent.id}
                  onClick={() => handleAgentClick(agent)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Neural connections SVG overlay */}
        {agents.length > 1 && (
          <svg
            className="fixed inset-0 pointer-events-none z-20"
            style={{ width: '100%', height: '100%' }}
          >
            {agents.slice(0, -1).map((agent, i) => (
              <line
                key={`line-${i}`}
                x1="50%"
                y1="50%"
                x2={`${50 + (i + 1) * 10}%`}
                y2={`${50 + (i + 1) * 5}%`}
                stroke="rgba(0,240,255,0.06)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            ))}
          </svg>
        )}
      </div>

      {/* Agent detail sidebar */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            className="w-80 shrink-0 border-l border-glass bg-obsidian/60 backdrop-blur-glass flex flex-col"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="p-4 border-b border-glass">
              <div className="flex items-center gap-2 mb-2">
                <motion.div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedAgent.status === 'executing' ? '#FF6B35' : '#00F0FF' }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <p className="text-sm font-medium text-white/80">{selectedAgent.name}</p>
              </div>
              <p className="text-[10px] text-white/30 font-mono uppercase">{selectedAgent.type}</p>
            </div>

            <div className="p-3 border-b border-glass">
              <p className="text-[10px] text-white/25 font-mono uppercase mb-2">Live Thought Stream</p>
              <AgentThoughtStream thoughts={demoThoughts} />
            </div>

            <div className="p-4">
              <p className="text-[10px] text-white/25 font-mono uppercase mb-2">Agent Details</p>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-[11px] text-white/30">Status</span>
                  <span className="text-[11px] text-neon-cyan/60 font-mono uppercase">{selectedAgent.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-white/30">Model</span>
                  <span className="text-[11px] text-neon-cyan/60 font-mono">{selectedAgent.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-white/30">Tools</span>
                  <span className="text-[11px] text-neon-cyan/60 font-mono">{selectedAgent.toolCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[11px] text-white/30">Memory</span>
                  <span className="text-[11px] text-neon-cyan/60 font-mono">{selectedAgent.memoryUsage}MB</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
