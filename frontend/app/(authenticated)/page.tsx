'use client';

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import BootScreen from '@/components/core/BootScreen';
import Starfield from '@/components/core/Starfield';
import NeuralGrid from '@/components/core/NeuralGrid';
import ParticleField from '@/components/core/ParticleField';
import DataStream from '@/components/core/DataStream';
import AICoreVolumetric from '@/components/core/AICoreVolumetric';
import EnergyRing from '@/components/core/EnergyRing';
import { HolographicOverlay } from '@/components/core/HolographicOverlay';
import TopBar from '@/components/panels/TopBar';
import ChatInterface from '@/components/chat/ChatInterface';
import AgentStatusBar from '@/components/agents/AgentStatusBar';
import MultiAgentGrid from '@/components/agents/MultiAgentGrid';
import KnowledgePanel from '@/components/knowledge/KnowledgePanel';
import VoiceInterface from '@/components/voice/VoiceInterface';
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder';
import MissionTimeline from '@/components/missions/MissionTimeline';
import BrowserPanel from '@/components/browser/BrowserPanel';
import { PanelTransition } from '@/components/panels/Transitions';
import { useCoreStore } from '@/stores/coreStore';
import { useLayoutStore } from '@/stores/layoutStore';
import { useAgentStore } from '@/stores/agentStore';
import { Activity, Zap, Cpu } from 'lucide-react';
import type { PanelType } from '@/types/system';

const AgentTerminal = dynamic(() => import('@/components/terminal/AgentTerminal'), { ssr: false });
const SystemMap = dynamic(() => import('@/components/monitor/SystemMap'), { ssr: false });

const PANEL_COMPONENTS: Record<PanelType, React.ReactNode> = {
  chat: <ChatInterface />,
  terminal: <AgentTerminal />,
  agents: <MultiAgentGrid />,
  knowledge: <KnowledgePanel />,
  browser: <BrowserPanel />,
  models: <PlaceholderPanel title="Model Control Center" icon={<Cpu size={20} />} />,
  workflows: <WorkflowBuilder />,
  missions: <MissionTimeline />,
  monitor: <SystemMap />,
  voice: <PlaceholderPanel title="Voice Interface" icon={<Activity size={20} />} />,
  settings: <PlaceholderPanel title="Settings" icon={<Cpu size={20} />} />,
};

function PlaceholderPanel({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6">
      <motion.div
        className="w-20 h-20 rounded-full bg-neon-cyan/5 border border-neon-cyan/10 flex items-center justify-center text-neon-cyan/30 relative"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        {icon}
        <EnergyRing size={120} color="#00F0FF" delay={0.5} />
      </motion.div>
      <div className="text-center">
        <p className="text-neon-cyan/40 font-mono text-sm tracking-wider">{title}</p>
        <p className="text-white/10 text-xs mt-1">Module initializing...</p>
      </div>
    </div>
  );
}

export default function AuthenticatedApp() {
  const [booted, setBooted] = useState(false);
  const { setBooted: setStoreBooted, state } = useCoreStore();
  const { activePanel, leftDockOpen, rightDockOpen, bottomBarVisible } = useLayoutStore();
  const { addAgent } = useAgentStore();

  const handleBootComplete = () => {
    setBooted(true);
    setStoreBooted(true);

    addAgent({
      id: 'demo-agent-1',
      type: 'researcher',
      name: 'Research Agent',
      status: 'idle',
      currentTask: null,
      model: 'claude-sonnet',
      toolCount: 3,
      memoryUsage: 12,
      startedAt: new Date().toISOString(),
    });
    addAgent({
      id: 'demo-agent-2',
      type: 'coder',
      name: 'Code Agent',
      status: 'idle',
      currentTask: null,
      model: 'claude-sonnet',
      toolCount: 5,
      memoryUsage: 8,
      startedAt: new Date().toISOString(),
    });
  };

  return (
    <>
      <AnimatePresence>
        {!booted && <BootScreen onBootComplete={handleBootComplete} />}
      </AnimatePresence>

      {booted && (
        <motion.div
          className="h-screen w-screen flex flex-col overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        >
          {/* Background Layers */}
          <Starfield />
          <NeuralGrid className="absolute inset-0 z-[1]" />
          <ParticleField className="absolute inset-0 z-[1]" />
          <DataStream className="absolute inset-0 z-[1]" speed={0.6} density={0.015} />

          {/* Scan line */}
          <div className="absolute inset-0 z-[2] pointer-events-none">
            <div className="scan-line" />
          </div>

          {/* Main layout */}
          <TopBar />

          <div className="flex-1 flex overflow-hidden relative z-10">
            {/* Left Dock */}
            <AnimatePresence>
              {leftDockOpen && (
                <motion.div
                  className="w-56 shrink-0 border-r border-glass bg-obsidian/40 backdrop-blur-glass overflow-y-auto"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 224, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <HolographicOverlay variant="overlay">
                    <AgentStatusBar />
                    <div className="p-4 pt-0">
                      <p className="text-[10px] font-mono text-white/20 uppercase tracking-wider px-1 mb-2">
                        Quick Actions
                      </p>
                      <div className="space-y-1">
                        <button className="w-full text-left px-3 py-2 rounded-md text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                          + New Agent
                        </button>
                        <button className="w-full text-left px-3 py-2 rounded-md text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                          + New Mission
                        </button>
                        <button className="w-full text-left px-3 py-2 rounded-md text-xs text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors">
                          Clear Memory
                        </button>
                      </div>
                    </div>
                  </HolographicOverlay>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Center Panel */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePanel}
                    className="h-full"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <HolographicOverlay variant="overlay">
                      {PANEL_COMPONENTS[activePanel]}
                    </HolographicOverlay>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Bottom Bar */}
              {bottomBarVisible && (
                <div className="h-12 border-t border-glass bg-obsidian/60 backdrop-blur-glass flex items-center justify-between px-4 z-20">
                  <div className="flex items-center gap-4 text-xs text-white/30 font-mono">
                    <span>STATE: {state.toUpperCase()}</span>
                    <span className="w-px h-3 bg-glass" />
                    <span>AGENTS: 2</span>
                    <span className="w-px h-3 bg-glass" />
                    <span>TOKENS: --</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <VoiceInterface />
                    <span className="w-px h-4 bg-glass" />
                    <div className="text-xs text-white/20 font-mono">
                      LAT: <span className="text-neon-cyan/60">--ms</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Dock */}
            <AnimatePresence>
              {rightDockOpen && (
                <motion.div
                  className="w-64 shrink-0 border-l border-glass bg-obsidian/40 backdrop-blur-glass overflow-y-auto p-4"
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 256, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <p className="text-xs font-mono text-white/30 uppercase tracking-wider mb-3">File Explorer</p>
                  <div className="space-y-1">
                    <p className="text-xs text-white/20">/workspace</p>
                    <p className="text-xs text-white/15 pl-3">- main.py</p>
                    <p className="text-xs text-white/15 pl-3">- config.json</p>
                    <p className="text-xs text-white/15 pl-3">- data/</p>
                  </div>
                  <div className="mt-6">
                    <p className="text-xs font-mono text-white/30 uppercase tracking-wider mb-3">Tool Activity</p>
                    <p className="text-xs text-white/15">No recent tool executions</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* AI Core - bottom right */}
          <motion.div
            className="fixed bottom-24 right-10 z-[5] pointer-events-none"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <div className="relative">
              <EnergyRing size={160} color="#00F0FF" delay={2} />
              <EnergyRing size={160} color="#00FFD1" delay={2.5} />
              <AICoreVolumetric state={state} size={200} />
            </div>
          </motion.div>

          {/* Status indicator top-right */}
          <motion.div
            className="fixed top-14 right-4 z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="glass-panel px-3 py-1.5 flex items-center gap-2 text-[10px]">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-holographic"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-holographic/60 font-mono">SYSTEM NOMINAL</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
