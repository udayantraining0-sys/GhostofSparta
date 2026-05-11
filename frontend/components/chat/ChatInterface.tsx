'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Zap } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useCoreStore } from '@/stores/coreStore';
import type { Message } from '@/types/chat';

export default function ChatInterface() {
  const [input, setInput] = useState('');
  const { messages, streaming, isLoading, addMessage, setIsStreaming, setIsLoading, appendToCurrentMessage } =
    useChatStore();
  const { setState } = useCoreStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming.currentMessage]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming.isStreaming) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
    };

    addMessage(userMsg);
    setInput('');
    setIsLoading(true);
    setState('thinking');

    try {
      const response = await fetch('http://localhost:8000/api/v1/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.content,
          session_id: null,
          model: 'auto',
          task_type: 'conversation',
          stream: true,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error('Failed to connect');
      }

      setState('executing');
      setIsStreaming(true);
      const msgId = crypto.randomUUID();
      currentMessageIdRef.current = msgId;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.event === 'token' && data.data) {
                appendToCurrentMessage(data.data);
              } else if (data.event === 'done') {
                const finalMsg: Message = {
                  id: msgId,
                  role: 'assistant',
                  content: '', // Filled below
                  timestamp: new Date().toISOString(),
                };
                setIsStreaming(false);
                // The content is already in streaming.currentMessage
                setTimeout(() => {
                  const state = useChatStore.getState();
                  if (state.streaming.currentMessage) {
                    addMessage({
                      ...finalMsg,
                      content: state.streaming.currentMessage,
                    });
                    setIsStreaming(false);
                  }
                }, 0);
              } else if (data.event === 'error') {
                addMessage({
                  id: crypto.randomUUID(),
                  role: 'assistant',
                  content: `Error: ${data.data}`,
                  timestamp: new Date().toISOString(),
                });
                setIsStreaming(false);
              }
            } catch {
              // Plain text chunk
              appendToCurrentMessage(line.slice(6));
            }
          }
        }
      }

      // Ensure final message is added if stream ended without done event
      const finalState = useChatStore.getState();
      if (finalState.streaming.currentMessage) {
        addMessage({
          id: msgId,
          role: 'assistant',
          content: finalState.streaming.currentMessage,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      // Backend not available - use simulated response
      const responseText = (
        `KRATOS online. No backend connection detected.\n\n` +
        `You said: "${userMsg.content}"\n\n` +
        `To enable full AI capabilities:\n` +
        `1. Start the backend: cd backend/core && uvicorn app.main:app --reload\n` +
        `2. Add API keys for OpenAI, Anthropic, or OpenRouter\n` +
        `3. Or use Ollama locally\n\n` +
        `The frontend is running independently. Configure providers in Model Control Center once the backend is up.`
      );

      setIsStreaming(true);

      let idx = 0;
      const interval = setInterval(() => {
        if (idx < responseText.length) {
          appendToCurrentMessage(responseText[idx]);
          idx++;
        } else {
          clearInterval(interval);
          addMessage({
            id: crypto.randomUUID(),
            role: 'assistant',
            content: responseText,
            timestamp: new Date().toISOString(),
          });
          setIsStreaming(false);
        }
      }, 12);
    } finally {
      setIsLoading(false);
      setState('idle');
    }
  }, [input, streaming.isStreaming, addMessage, appendToCurrentMessage, setIsStreaming, setIsLoading, setState]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streaming.currentMessage && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
            <motion.div
              className="w-20 h-20 rounded-full bg-neon-cyan/5 border border-neon-cyan/10 flex items-center justify-center"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div
                className="w-12 h-12 rounded-full"
                style={{
                  background: 'radial-gradient(circle, rgba(0,240,255,0.3) 0%, transparent 70%)',
                }}
              />
            </motion.div>
            <div>
              <p className="text-neon-cyan/60 font-mono text-sm">KRATOS ONLINE</p>
              <p className="text-white/30 text-sm mt-1">Ask anything. Deploy agents. Execute tasks.</p>
            </div>
            <div className="flex gap-2">
              {['Research', 'Code', 'Analyze', 'Automate'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion + '...'); }}
                  className="px-3 py-1.5 rounded-md border border-glass text-xs text-white/30 hover:text-neon-cyan hover:border-neon-cyan/20 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-neon-cyan/8 border border-neon-cyan/20 text-white/90 shadow-neon-cyan-sm'
                    : 'bg-white/[0.03] border border-glass text-white/80'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap [&>pre]:bg-black/30 [&>pre]:rounded [&>pre]:p-3 [&>pre]:text-xs [&>pre]:overflow-x-auto [&_code]:text-neon-cyan/80">
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Streaming message */}
        {streaming.isStreaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-xl px-4 py-3 bg-white/[0.03] border border-neon-cyan/20 shadow-neon-cyan-sm">
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {streaming.currentMessage}
                <motion.span
                  className="inline-block w-2 h-4 ml-0.5 bg-neon-cyan"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                />
              </div>
            </div>
          </div>
        )}

        {isLoading && !streaming.isStreaming && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-glass">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-neon-cyan/60" />
                <span className="text-xs text-white/40 font-mono">CONNECTING...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-glass">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter command or message..."
              rows={2}
              className="cyber-input resize-none h-[52px]"
              disabled={streaming.isStreaming}
            />
            <div className="absolute bottom-2 right-3 flex items-center gap-2">
              <span className="text-[9px] text-white/15 font-mono">
                {input.length > 0 ? `${input.length} chars` : 'KRATOS'}
              </span>
            </div>
          </div>
          <button
            onClick={handleSend}
            disabled={!input.trim() || streaming.isStreaming}
            className={`p-2.5 rounded-lg transition-all ${
              input.trim() && !streaming.isStreaming
                ? 'bg-neon-cyan/15 text-neon-cyan hover:bg-neon-cyan/25 border border-neon-cyan/30 shadow-neon-cyan-sm'
                : 'bg-white/5 text-white/20 cursor-not-allowed border border-glass'
            }`}
          >
            {streaming.isStreaming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-white/15 font-mono">
              {streaming.isStreaming ? 'STREAMING' : 'READY'}
            </span>
            <span className="w-px h-3 bg-glass" />
            <span className="text-[9px] text-white/15 font-mono">
              AUTO
            </span>
          </div>
          <div className="flex items-center gap-1 text-[9px] text-white/15 font-mono">
            <Zap size={10} />
            <span>MODEL: AUTO</span>
          </div>
        </div>
      </div>
    </div>
  );
}
