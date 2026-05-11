'use client';

import { useState } from 'react';
import { Brain, Search } from 'lucide-react';
import KnowledgeGraph from './KnowledgeGraph';
import SemanticSearch from './SemanticSearch';

export default function KnowledgePanel() {
  const [view, setView] = useState<'graph' | 'search'>('search');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 p-3 border-b border-glass">
        <button
          onClick={() => setView('search')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
            view === 'search' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' : 'text-white/30 hover:text-white/50'
          }`}
        >
          <Search size={13} />
          Semantic
        </button>
        <button
          onClick={() => setView('graph')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
            view === 'graph' ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20' : 'text-white/30 hover:text-white/50'
          }`}
        >
          <Brain size={13} />
          Graph
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {view === 'graph' ? <KnowledgeGraph /> : <SemanticSearch />}
      </div>
    </div>
  );
}
