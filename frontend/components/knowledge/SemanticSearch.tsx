'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Brain, Calendar, Tag, Trash2 } from 'lucide-react';
import type { MemoryItem } from '@/types/memory';

const DEMO_MEMORIES: MemoryItem[] = [
  { id: '1', content: 'KRATOS architecture uses hybrid FastAPI + Node BFF pattern for optimal AI and real-time workloads', type: 'semantic', importance: 0.9, tags: ['architecture', 'backend'], createdAt: '2024-05-01', lastAccessed: '2024-05-10', score: 0.92 },
  { id: '2', content: 'Agent engine implements ReAct loop with planning, execution, tool calls, observation, and reflection phases', type: 'procedural', importance: 0.85, tags: ['agents', 'engine'], createdAt: '2024-05-02', lastAccessed: '2024-05-09', score: 0.88 },
  { id: '3', content: 'Voice pipeline supports Whisper STT, Kokoro/ElevenLabs TTS with wake word detection', type: 'semantic', importance: 0.7, tags: ['voice', 'stt', 'tts'], createdAt: '2024-05-03', lastAccessed: '2024-05-08', score: 0.75 },
  { id: '4', content: 'Weaviate configured as vector database for long-term memory with embedding support', type: 'semantic', importance: 0.8, tags: ['memory', 'weaviate'], createdAt: '2024-05-04', lastAccessed: '2024-05-07', score: 0.82 },
  { id: '5', content: 'Model router intelligently selects between OpenAI, Anthropic, OpenRouter, Groq based on task type', type: 'procedural', importance: 0.75, tags: ['models', 'routing'], createdAt: '2024-05-05', lastAccessed: '2024-05-06', score: 0.78 },
];

const TYPE_COLORS: Record<string, string> = {
  episodic: 'rgba(30,144,255,0.6)',
  semantic: 'rgba(0,240,255,0.6)',
  conversation: 'rgba(0,255,209,0.6)',
  procedural: 'rgba(255,107,53,0.6)',
};

export default function SemanticSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MemoryItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'browse'>('browse');

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    await new Promise((r) => setTimeout(r, 500));
    const filtered = DEMO_MEMORIES.filter((m) =>
      m.content.toLowerCase().includes(query.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
    );
    setResults(filtered);
    setIsSearching(false);
  }, [query]);

  const displayed = activeTab === 'search' && query ? results : DEMO_MEMORIES;

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4 border-b border-glass">
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'browse' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' : 'text-white/30 hover:text-white/50'
            }`}
          >
            Browse
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
              activeTab === 'search' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' : 'text-white/30 hover:text-white/50'
            }`}
          >
            Search
          </button>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search semantic memory..."
              className="cyber-input pl-9"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="cyber-button text-xs"
          >
            <Search size={14} />
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence>
          {displayed.map((item, i) => (
            <motion.div
              key={item.id}
              className="glass-panel p-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ borderColor: 'rgba(0,240,255,0.25)' }}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Brain size={12} className="text-neon-cyan/40" />
                  <span
                    className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: TYPE_COLORS[item.type] + '20', color: TYPE_COLORS[item.type] }}
                  >
                    {item.type}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-white/15 flex items-center gap-1">
                    <Calendar size={10} />
                    {item.createdAt}
                  </span>
                  <button className="p-0.5 rounded hover:bg-red-500/10 text-white/10 hover:text-red-400/60">
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/60 leading-relaxed">{item.content}</p>
              <div className="flex items-center gap-2 mt-2">
                {item.tags.map((tag) => (
                  <span key={tag} className="text-[9px] text-neon-cyan/30 font-mono flex items-center gap-1">
                    <Tag size={8} />
                    {tag}
                  </span>
                ))}
                <div className="flex-1" />
                <span className="text-[9px] text-neon-cyan/40 font-mono">{Math.round((item.score ?? 0) * 100)}% match</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {displayed.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 space-y-3">
            <Brain className="w-8 h-8 text-neon-cyan/15" />
            <p className="text-xs text-white/15 font-mono">No memories found</p>
          </div>
        )}
      </div>
    </div>
  );
}
