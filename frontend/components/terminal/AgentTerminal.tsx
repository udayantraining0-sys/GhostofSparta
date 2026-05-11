'use client';

import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';

export default function AgentTerminal() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      theme: {
        background: 'rgba(5, 5, 12, 0.95)',
        foreground: '#00F0FF',
        cursor: '#00F0FF',
        selectionBackground: 'rgba(0, 240, 255, 0.3)',
        black: '#0A0A0F',
        red: '#FF3333',
        green: '#00FFD1',
        yellow: '#FFD700',
        blue: '#1E90FF',
        magenta: '#FF6B35',
        cyan: '#00F0FF',
        white: '#E0E0E0',
        brightBlack: '#333333',
        brightRed: '#FF6666',
        brightGreen: '#66FFCC',
        brightYellow: '#FFFF66',
        brightBlue: '#66B2FF',
        brightMagenta: '#FF9F66',
        brightCyan: '#66F5FF',
        brightWhite: '#FFFFFF',
      },
      allowProposedApi: true,
      cols: 100,
      rows: 30,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.open(terminalRef.current);
    fitAddon.fit();

    term.writeln('\x1b[1;36m╔══════════════════════════════════════════════════╗\x1b[0m');
    term.writeln('\x1b[1;36m║              KRATOS AGENT TERMINAL                 ║\x1b[0m');
    term.writeln('\x1b[1;36m║         Sentient Agentic Operating System         ║\x1b[0m');
    term.writeln('\x1b[1;36m╚══════════════════════════════════════════════════╝\x1b[0m');
    term.writeln('');
    term.writeln('\x1b[0;36mType commands to interact with the system.\x1b[0m');
    term.writeln('\x1b[0;36mAvailable: ls, pwd, help, clear, agents, status, exec\x1b[0m');
    term.writeln('');
    term.write('\x1b[1;32m➜ \x1b[0m\x1b[1;36m/workspace\x1b[0m ');

    const commands: Record<string, string> = {
      help: 'Available commands:\n  ls      - List workspace files\n  pwd     - Print working directory\n  clear   - Clear terminal\n  agents  - List active agents\n  status  - System status\n  exec    - Execute agent task',
      ls: 'main.py    config.json    data/\nREADME.md    src/    tests/',
      pwd: '/workspace',
      agents: 'Active Agents:\n  [idle]    Research Agent (researcher)\n  [idle]    Code Agent (coder)',
      status: 'KRATOS Core: ONLINE\nAgents: 2 active\nMemory: 12MB used\nTokens today: 0',
      clear: '__CLEAR__',
    };

    term.onData((data) => {
      const char = data;
      if (char === '\r') {
        term.write('\r\n');
        const currentLine = (term as unknown as { _core?: { buffer?: { getLine?: (y: number) => string | null } } })._core?.buffer?.getLine?.(term.buffer.active.cursorY - 1);
        const lineText = currentLine?.toString() || '';

        const input = lineText.substring(lineText.lastIndexOf('/workspace ') + 11).trim();

        if (input) {
          const cmd = input.toLowerCase();
          if (cmd === 'clear') {
            term.clear();
          } else if (commands[cmd]) {
            term.writeln(commands[cmd]);
          } else if (cmd.startsWith('exec ')) {
            const task = input.substring(5);
            term.writeln(`\x1b[0;33mDispatching task to agent: ${task}\x1b[0m`);
            term.writeln('\x1b[0;32mTask accepted. Agent executing...\x1b[0m');
          } else {
            term.writeln(`\x1b[0;31mCommand not found: ${input}\x1b[0m`);
          }
        }

        term.write('\x1b[1;32m➜ \x1b[0m\x1b[1;36m/workspace\x1b[0m ');
      } else if (char === '\x7f') {
        // Backspace
        if (term.buffer.active.cursorX > 14) {
          term.write('\b \b');
        }
      } else {
        term.write(char);
      }
    });

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    xtermRef.current = term;

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-hidden">
        <div ref={terminalRef} className="h-full" />
      </div>

      {/* Toolbar */}
      <div className="h-9 border-t border-glass bg-obsidian/60 flex items-center justify-between px-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/30 font-mono">TERMINAL</span>
          <span className="h-3 w-px bg-glass" />
          <span className="text-[10px] text-neon-cyan/50 font-mono">SESSION: ACTIVE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/20 font-mono">COLS: 100</span>
          <span className="text-[10px] text-white/20 font-mono">ROWS: 30</span>
        </div>
      </div>
    </div>
  );
}
