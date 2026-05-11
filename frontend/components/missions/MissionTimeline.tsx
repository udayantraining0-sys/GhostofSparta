'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Play, ChevronRight, CheckCircle2, AlertCircle,
  Clock, Bot, Search, Code2, Cpu, Flag,
} from 'lucide-react';

interface MissionEvent {
  id: string;
  type: string;
  message: string;
  timestamp: string;
  agentType?: string;
}

const DEMO_MISSIONS = [
  {
    id: 'm1',
    title: 'Analyze & Optimize Database Queries',
    goal: 'Analyze current SQL queries and suggest performance optimizations',
    status: 'completed',
    agentCount: 3,
    startedAt: '2024-05-10T10:00:00Z',
    events: [
      { id: 'e1', type: 'planning', message: 'Analyzing mission goal and creating execution plan', timestamp: 'T+0s' },
      { id: 'e2', type: 'agent_spawn', message: 'Spawning Research Agent', timestamp: 'T+1s', agentType: 'researcher' },
      { id: 'e3', type: 'agent_spawn', message: 'Spawning Code Agent', timestamp: 'T+2s', agentType: 'coder' },
      { id: 'e4', type: 'milestone', message: 'Research Agent: Analyzed current query patterns', timestamp: 'T+5s', agentType: 'researcher' },
      { id: 'e5', type: 'milestone', message: 'Code Agent: Implemented optimizations', timestamp: 'T+8s', agentType: 'coder' },
      { id: 'e6', type: 'agent_spawn', message: 'Spawning Executor Agent for verification', timestamp: 'T+9s', agentType: 'executor' },
      { id: 'e7', type: 'milestone', message: 'Executor Agent: Validated optimizations - 3.2x improvement', timestamp: 'T+12s', agentType: 'executor' },
      { id: 'e8', type: 'completed', message: 'Mission completed successfully', timestamp: 'T+15s' },
    ] as MissionEvent[],
  },
  {
    id: 'm2',
    title: 'Build REST API Documentation',
    goal: 'Generate comprehensive API documentation from codebase',
    status: 'active',
    agentCount: 2,
    startedAt: '2024-05-10T11:00:00Z',
    events: [
      { id: 'e1', type: 'planning', message: 'Scanning API endpoints and generating docs', timestamp: 'T+0s' },
      { id: 'e2', type: 'agent_spawn', message: 'Spawning Research Agent', timestamp: 'T+1s', agentType: 'researcher' },
    ] as MissionEvent[],
  },
];

const EVENT_ICONS: Record<string, React.ReactNode> = {
  planning: <Target size={12} />,
  agent_spawn: <Bot size={12} />,
  milestone: <CheckCircle2 size={12} />,
  completed: <Flag size={12} />,
  error: <AlertCircle size={12} />,
};

const EVENT_COLORS: Record<string, string> = {
  planning: '#F59E0B',
  agent_spawn: '#1E90FF',
  milestone: '#00F0FF',
  completed: '#00FFD1',
  error: '#FF3333',
};

const AGENT_ICONS: Record<string, React.ReactNode> = {
  researcher: <Search size={10} />,
  coder: <Code2 size={10} />,
  executor: <Cpu size={10} />,
};

export default function MissionTimeline() {
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [replayState, setReplayState] = useState<{ active: boolean; step: number }>({ active: false, step: -1 });

  const mission = DEMO_MISSIONS.find((m) => m.id === selectedMission);

  const startReplay = (missionId: string) => {
    const m = DEMO_MISSIONS.find((mi) => mi.id === missionId);
    if (!m) return;

    setReplayState({ active: true, step: -1 });

    let step = 0;
    const interval = setInterval(() => {
      if (step >= m.events.length) {
        clearInterval(interval);
        setReplayState({ active: false, step: -1 });
        return;
      }
      setReplayState({ active: true, step });
      step++;
    }, 800);
  };

  if (selectedMission && mission) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-glass flex items-center justify-between">
          <button
            onClick={() => setSelectedMission(null)}
            className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60"
          >
            <ChevronRight size={14} className="rotate-180" /> Back
          </button>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-white/20 uppercase">{mission.status}</span>
            <button
              onClick={() => startReplay(mission.id)}
              className="cyber-button text-xs flex items-center gap-1"
              disabled={replayState.active}
            >
              <Play size={10} /> Replay
            </button>
          </div>
        </div>

        {/* Mission Info */}
        <div className="p-4 border-b border-glass">
          <h3 className="text-sm text-white/80 font-medium">{mission.title}</h3>
          <p className="text-xs text-white/30 mt-1">{mission.goal}</p>
          <div className="flex items-center gap-3 mt-2 text-[10px] text-white/25 font-mono">
            <span>{mission.agentCount} agents</span>
            <span className="w-px h-3 bg-glass" />
            <span>{mission.events.length} events</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[19px] top-0 bottom-0 w-px bg-glass" />

            <div className="space-y-3">
              {mission.events.map((event, i) => {
                const isReplayed = replayState.active && i <= replayState.step;
                const isActive = isReplayed || (!replayState.active && true);

                return (
                  <motion.div
                    key={event.id}
                    className="flex items-start gap-3 pl-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{
                      opacity: isActive ? 1 : 0.3,
                      x: 0,
                    }}
                    transition={{ delay: isReplayed ? 0 : i * 0.05 }}
                  >
                    {/* Node dot */}
                    <div className="relative z-10 shrink-0">
                      <motion.div
                        className="w-[10px] h-[10px] rounded-full border-2"
                        style={{
                          backgroundColor: isActive ? EVENT_COLORS[event.type] + '30' : 'transparent',
                          borderColor: EVENT_COLORS[event.type] || '#333',
                        }}
                        animate={isReplayed && i === replayState.step ? { scale: [1, 1.5, 1] } : {}}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {event.agentType && (
                          <span className="text-neon-cyan/40">
                            {AGENT_ICONS[event.agentType] || <Bot size={10} />}
                          </span>
                        )}
                        <span
                          className="text-[9px] font-mono uppercase px-1 rounded"
                          style={{
                            color: EVENT_COLORS[event.type],
                            backgroundColor: EVENT_COLORS[event.type] + '10',
                          }}
                        >
                          {event.type}
                        </span>
                        <span className="text-[9px] text-white/15 font-mono ml-auto">{event.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-white/50 mt-0.5">{event.message}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mission list view
  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-mono text-white/30 uppercase tracking-wider">Missions</h3>
        <button className="cyber-button text-xs flex items-center gap-1">
          <Target size={10} /> New
        </button>
      </div>

      <div className="space-y-3">
        {DEMO_MISSIONS.map((m) => (
          <motion.div
            key={m.id}
            className="glass-panel p-4 cursor-pointer"
            whileHover={{ borderColor: 'rgba(0,240,255,0.2)' }}
            onClick={() => setSelectedMission(m.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-sm text-white/70 font-medium">{m.title}</h3>
              <span
                className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                  m.status === 'completed' ? 'text-neon-cyan/60 bg-neon-cyan/5' : 'text-yellow-400/60 bg-yellow-400/5'
                }`}
              >
                {m.status}
              </span>
            </div>
            <p className="text-xs text-white/30 mb-3">{m.goal}</p>
            <div className="flex items-center gap-3 text-[10px] text-white/20 font-mono">
              <span>{m.agentCount} agents</span>
              <span className="w-px h-3 bg-glass" />
              <span>{m.events.length} events</span>
              <span className="w-px h-3 bg-glass" />
              <span>{new Date(m.startedAt).toLocaleTimeString()}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {DEMO_MISSIONS.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 space-y-3">
          <Target className="w-8 h-8 text-neon-cyan/15" />
          <p className="text-xs text-white/15 font-mono">No missions yet</p>
        </div>
      )}
    </div>
  );
}
