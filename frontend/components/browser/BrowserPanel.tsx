'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Search, ArrowLeft, ArrowRight, RefreshCw,
  Camera, MousePointer, Keyboard, ChevronDown, ExternalLink,
} from 'lucide-react';

export default function BrowserPanel() {
  const [url, setUrl] = useState('https://example.com');
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<string[]>(['https://example.com']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [extractedText, setExtractedText] = useState('');

  const navigate = (newUrl: string) => {
    let fullUrl = newUrl;
    if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
      fullUrl = 'https://' + newUrl;
    }

    setIsLoading(true);
    setUrl(fullUrl);

    setHistory((prev) => {
      const newHist = [...prev.slice(0, historyIndex + 1), fullUrl];
      setHistoryIndex(newHist.length - 1);
      return newHist;
    });

    setTimeout(() => {
      setIsLoading(false);
      setExtractedText(`Simulated page content from ${fullUrl}\n\nThis is a demo browser panel. PAge extracted content would appear here.`);
    }, 1500);
  };

  const goBack = () => {
    if (historyIndex > 0) {
      const newIdx = historyIndex - 1;
      setHistoryIndex(newIdx);
      setUrl(history[newIdx]);
    }
  };

  const goForward = () => {
    if (historyIndex < history.length - 1) {
      const newIdx = historyIndex + 1;
      setHistoryIndex(newIdx);
      setUrl(history[newIdx]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* URL bar */}
      <div className="p-3 border-b border-glass flex items-center gap-2">
        <button
          onClick={goBack}
          disabled={historyIndex <= 0}
          className="p-1.5 rounded text-white/20 hover:text-white/50 disabled:opacity-20"
        >
          <ArrowLeft size={14} />
        </button>
        <button
          onClick={goForward}
          disabled={historyIndex >= history.length - 1}
          className="p-1.5 rounded text-white/20 hover:text-white/50 disabled:opacity-20"
        >
          <ArrowRight size={14} />
        </button>
        <button
          onClick={() => navigate(url)}
          className="p-1.5 rounded text-white/20 hover:text-neon-cyan/60"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
        </button>

        <div className="flex-1 relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && navigate(url)}
            className="cyber-input pl-9 text-xs"
            placeholder="Enter URL..."
          />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Browser view */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 bg-black/40 border-r border-glass flex items-center justify-center relative">
            {isLoading ? (
              <motion.div
                className="flex flex-col items-center gap-3"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <div className="w-12 h-12 rounded-full border-2 border-neon-cyan/20 border-t-neon-cyan animate-spin" />
                <span className="text-xs text-white/20 font-mono">NAVIGATING...</span>
              </motion.div>
            ) : (
              <div className="text-center space-y-4 p-8">
                <div className="w-32 h-24 mx-auto rounded-lg border border-glass bg-white/[0.01] flex items-center justify-center">
                  <Globe className="w-8 h-8 text-neon-cyan/20" />
                </div>
                <div>
                  <p className="text-sm text-white/40 font-mono">{url}</p>
                  <p className="text-[10px] text-white/15 mt-1">
                    {extractedText ? 'Page loaded (simulated)' : 'Enter a URL and press Enter to navigate'}
                  </p>
                </div>
              </div>
            )}

            {/* Floating action bar */}
            <div className="absolute bottom-3 left-3 right-3 glass-panel p-2 flex items-center gap-2">
              <button className="p-1.5 rounded text-white/20 hover:text-neon-cyan/60" title="Screenshot">
                <Camera size={14} />
              </button>
              <button className="p-1.5 rounded text-white/20 hover:text-neon-cyan/60" title="Click">
                <MousePointer size={14} />
              </button>
              <button className="p-1.5 rounded text-white/20 hover:text-neon-cyan/60" title="Type">
                <Keyboard size={14} />
              </button>
              <span className="w-px h-4 bg-glass" />
              <button className="p-1.5 rounded text-white/20 hover:text-neon-cyan/60" title="Extract">
                <ChevronDown size={14} />
              </button>
              <button className="p-1.5 rounded text-white/20 hover:text-neon-cyan/60 ml-auto" title="Open">
                <ExternalLink size={12} />
              </button>
            </div>
          </div>
        </div>

        {/* Extracted content sidebar */}
        <div className="w-72 shrink-0 bg-obsidian/40 p-3 overflow-y-auto">
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-wider mb-2">Extracted Content</p>
          {extractedText ? (
            <pre className="text-[10px] text-white/40 whitespace-pre-wrap font-mono leading-relaxed">
              {extractedText}
            </pre>
          ) : (
            <p className="text-[11px] text-white/10 font-mono">Navigate to a page to see extracted content</p>
          )}

          <div className="mt-4">
            <p className="text-[10px] font-mono text-white/20 uppercase tracking-wider mb-2">History</p>
            <div className="space-y-1">
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => { setHistoryIndex(i); setUrl(h); }}
                  className={`w-full text-left text-[10px] font-mono px-2 py-1 rounded truncate ${
                    i === historyIndex ? 'text-neon-cyan/60 bg-neon-cyan/5' : 'text-white/15 hover:text-white/30'
                  }`}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
