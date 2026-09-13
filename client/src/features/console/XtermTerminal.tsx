import React, { useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

interface XtermTerminalProps {
  logs: string[];
  autoScroll: boolean;
  onInitTerminal?: (term: Terminal) => void;
}

export const XtermTerminal: React.FC<XtermTerminalProps> = ({
  logs,
  autoScroll,
  onInitTerminal,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastRenderedIndexRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Terminal
    const term = new Terminal({
      cursorBlink: true,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      lineHeight: 1.35,
      convertEol: true,
      disableStdin: true,
      theme: {
        background: '#080c14',
        foreground: '#e2e8f0',
        cursor: '#10b981',
        selectionBackground: 'rgba(16, 185, 129, 0.3)',
        black: '#1e293b',
        red: '#f43f5e',
        green: '#10b981',
        yellow: '#fbbf24',
        blue: '#38bdf8',
        magenta: '#c084fc',
        cyan: '#22d3ee',
        white: '#f8fafc',
        brightBlack: '#475569',
        brightRed: '#fb7185',
        brightGreen: '#34d399',
        brightYellow: '#fcd34d',
        brightBlue: '#7dd3fc',
        brightMagenta: '#e879f9',
        brightCyan: '#67e8f9',
        brightWhite: '#ffffff',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(containerRef.current);

    terminalRef.current = term;
    fitAddonRef.current = fitAddon;

    if (onInitTerminal) {
      onInitTerminal(term);
    }

    // Fit on open
    setTimeout(() => {
      try {
        fitAddon.fit();
      } catch {
        // Safe catch on initial layout
      }
    }, 50);

    // Resize observer for automatic resizing
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch {
        // Ignore during unmount
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      terminalRef.current = null;
      lastRenderedIndexRef.current = 0;
    };
  }, []);

  // Write new logs
  useEffect(() => {
    const term = terminalRef.current;
    if (!term) return;

    if (logs.length === 0) {
      term.clear();
      lastRenderedIndexRef.current = 0;
      return;
    }

    const startIndex = lastRenderedIndexRef.current;
    for (let i = startIndex; i < logs.length; i++) {
      term.writeln(logs[i]);
    }
    lastRenderedIndexRef.current = logs.length;

    if (autoScroll) {
      term.scrollToBottom();
    }
  }, [logs, autoScroll]);

  return (
    <div
      ref={containerRef}
      className="terminal-container w-full h-full rounded-xl overflow-hidden bg-dark-950 border border-slate-800"
      style={{ minHeight: '380px' }}
    />
  );
};
