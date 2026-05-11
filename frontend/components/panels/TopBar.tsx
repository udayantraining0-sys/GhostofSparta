'use client';

import { useLayoutStore } from '@/stores/layoutStore';
import { useCoreStore } from '@/stores/coreStore';
import { motion } from 'framer-motion';
import {
  MessageCircle,
  Terminal,
  Bot,
  Brain,
  Globe,
  Cpu,
  Workflow,
  Target,
  BarChart3,
  Menu,
  PanelRight,
  Mic,
  Settings,
} from 'lucide-react';
import type { PanelType } from '@/types/system';

const NAV_ITEMS: { id: PanelType; label: string; icon: React.ReactNode }[] = [
  { id: 'chat', label: 'Chat', icon: <MessageCircle size={16} /> },
  { id: 'terminal', label: 'Terminal', icon: <Terminal size={16} /> },
  { id: 'agents', label: 'Agents', icon: <Bot size={16} /> },
  { id: 'knowledge', label: 'Knowledge', icon: <Brain size={16} /> },
  { id: 'browser', label: 'Browser', icon: <Globe size={16} /> },
  { id: 'models', label: 'Models', icon: <Cpu size={16} /> },
  { id: 'workflows', label: 'Workflows', icon: <Workflow size={16} /> },
  { id: 'missions', label: 'Missions', icon: <Target size={16} /> },
  { id: 'monitor', label: 'Monitor', icon: <BarChart3 size={16} /> },
];

export default function TopBar() {
  const { activePanel, setActivePanel, leftDockOpen, toggleLeftDock, rightDockOpen, toggleRightDock } =
    useLayoutStore();
  const { state, connected } = useCoreStore();

  const statusColor = connected
    ? state === 'executing'
      ? '#FF6B35'
      : state === 'thinking'
      ? '#1E90FF'
      : '#00F0FF'
    : '#FF3333';

  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-glass bg-obsidian/60 backdrop-blur-glass z-30 relative">
      {/* Left: Menu + Nav */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleLeftDock}
          className="p-2 rounded-lg hover:bg-neon-cyan/10 text-neon-cyan/60 hover:text-neon-cyan transition-colors"
        >
          <Menu size={16} />
        </button>
        <div className="w-px h-5 bg-glass mx-1" />

        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => setActivePanel(item.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activePanel === item.id
                ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            {item.icon}
            <span className="hidden lg:inline">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Right: Status + Actions */}
      <div className="flex items-center gap-3">
        {/* System status */}
        <div className="flex items-center gap-2 text-xs text-white/40">
          <motion.div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColor }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="font-mono uppercase">{state}</span>
        </div>

        <div className="w-px h-5 bg-glass" />

        {/* Voice toggle */}
        <button className="p-1.5 rounded-md hover:bg-neon-cyan/10 text-white/40 hover:text-neon-cyan transition-colors">
          <Mic size={16} />
        </button>

        {/* Settings */}
        <button className="p-1.5 rounded-md hover:bg-neon-cyan/10 text-white/40 hover:text-neon-cyan transition-colors">
          <Settings size={16} />
        </button>

        {/* Right dock toggle */}
        <button
          onClick={toggleRightDock}
          className={`p-1.5 rounded-md transition-colors ${
            rightDockOpen ? 'bg-neon-cyan/10 text-neon-cyan' : 'text-white/40 hover:text-white/70'
          }`}
        >
          <PanelRight size={16} />
        </button>
      </div>
    </div>
  );
}
