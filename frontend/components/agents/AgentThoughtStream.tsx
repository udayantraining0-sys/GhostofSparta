'use client';

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentThought } from '@/types/agents';
import { Code2, Search, Lightbulb, Eye, CheckCircle2, Wrench } from 'lucide-react';

interface Props {
  thoughts: AgentThought[];
  maxItems?: number;
}

const THOUGHT_ICONS: Record<string, React.ReactNode> = {
  planning: <Lightbulb size={12} />,
  action: <Wrench size={12} />,
  observation: <Eye size={12} />,
  reflection: <Search size={12} />,
  final: <CheckCircle2 size={12} />,
};

const THOUGHT_COLORS: Record<string, string> = {
  planning: 'rgba(255,215,0,0.5)',
  action: 'rgba(0,240,255,0.5)',
  observation: 'rgba(30,144,255,0.5)',
  reflection: 'rgba(138,43,226,0.5)',
  final: 'rgba(0,255,209,0.6)',
};

export default function AgentThoughtStream({ thoughts, maxItems = 50 }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts.length]);

  const displayed = thoughts.slice(-maxItems);

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1.5 max-h-[300px]">
      <AnimatePresence initial={false}>
        {displayed.map((thought, i) => (
          <motion.div
            key={thought.id || `${thought.step}-${i}`}
            className="flex items-start gap-2 px-2 py-1.5 rounded-md bg-white/[0.02] border border-glass"
            initial={{ opacity: 0, x: -10, height: 0 }}
            animate={{ opacity: 1, x: 0, height: 'auto' }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5"
              style={{ color: THOUGHT_COLORS[thought.type] || 'gray' }}
            >
              {THOUGHT_ICONS[thought.type] || <Code2 size={12} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono text-white/30 uppercase">
                  {thought.type}
                </span>
                {thought.toolName && (
                  <span className="text-[9px] font-mono text-neon-cyan/40">
                    {thought.toolName}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-white/60 leading-relaxed line-clamp-2">
                {thought.content}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {displayed.length === 0 && (
        <div className="flex items-center justify-center h-full">
          <p className="text-[11px] text-white/15 font-mono">Awaiting agent thoughts...</p>
        </div>
      )}
    </div>
  );
}
