import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useConsoleWs } from './useConsoleWs';
import { XtermTerminal } from './XtermTerminal';
import {
  Terminal as TerminalIcon,
  Trash2,
  ArrowDown,
  Send,
  Download,
  Wifi,
} from 'lucide-react';

export const ConsoleView: React.FC = () => {
  const { status, logs, sendCommand, clearLogs } = useConsoleWs();
  const [command, setCommand] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = command.trim();
    if (!trimmed) return;

    // Add to history
    setHistory((prev) => [...prev, trimmed]);
    setHistoryIndex(-1);

    // Send via WebSocket
    sendCommand(trimmed);
    setCommand('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === -1 ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setCommand(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(-1);
        setCommand('');
      } else {
        setHistoryIndex(nextIndex);
        setCommand(history[nextIndex]);
      }
    }
  };

  const handleDownloadLogs = () => {
    // Strip ANSI codes for clean download
    const cleanLogs = logs.map((l) => l.replace(/\x1b\[[0-9;]*m/g, '')).join('\n');
    const blob = new Blob([cleanLogs], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mc-server-log-${new Date().toISOString().substring(0, 10)}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const quickCommands = [
    { label: 'list', cmd: 'list' },
    { label: 'tps', cmd: 'neoforge tps' },
    { label: 'save-all', cmd: 'save-all' },
    { label: 'help', cmd: 'help' },
    { label: 'say ¡Hola!', cmd: 'say ¡Hola a todos en el servidor!' },
  ];

  return (
    <div className="space-y-4 animate-fadeIn flex flex-col h-[calc(100vh-8rem)]">
      {/* Top Console Controls */}
      <div className="glass-panel rounded-2xl p-3 sm:px-5 flex items-center justify-between border border-slate-800 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-wide">Consola del Servidor</span>
              <span
                className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full ${
                  status === 'connected'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                }`}
              >
                <Wifi className="w-2.5 h-2.5 animate-pulse" />
                <span>{status === 'connected' ? 'STREAM ACTIVO' : 'RECONECTANDO...'}</span>
              </span>
            </div>
            <span className="text-[11px] text-slate-400 hidden sm:block">
              latest.log en vivo con soporte de colores ANSI
            </span>
          </div>
        </div>

        {/* Action icons with micro-interactions */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setAutoScroll(!autoScroll)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
              autoScroll
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Auto-scroll activado"
          >
            <ArrowDown className={`w-3.5 h-3.5 ${autoScroll ? 'animate-bounce' : ''}`} />
            <span className="hidden md:inline">Auto-scroll</span>
          </motion.button>

          <motion.button
            onClick={handleDownloadLogs}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Descargar logs actuales"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Descargar</span>
          </motion.button>

          <motion.button
            onClick={clearLogs}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700 text-slate-300 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Limpiar pantalla"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Limpiar</span>
          </motion.button>
        </div>
      </div>

      {/* Terminal Viewport Container */}
      <div className="flex-1 min-h-0 relative shadow-2xl">
        <XtermTerminal logs={logs} autoScroll={autoScroll} />
      </div>

      {/* Quick command buttons with tactile feedback */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-1 shrink-0">
        <span className="text-[11px] text-slate-500 font-mono shrink-0 mr-1">Atajos:</span>
        {quickCommands.map((qc) => (
          <motion.button
            key={qc.label}
            onClick={() => sendCommand(qc.cmd)}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', stiffness: 450, damping: 25 }}
            className="px-2.5 py-1 rounded-lg bg-dark-900 border border-slate-800 hover:border-emerald-500/40 text-slate-300 hover:text-emerald-400 text-[11px] font-mono transition-colors shrink-0 cursor-pointer"
          >
            /{qc.cmd}
          </motion.button>
        ))}
      </div>

      {/* Command Input Bar */}
      <form onSubmit={handleSend} className="shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400 font-mono font-bold text-sm">
            &gt;
          </div>
          <input
            ref={inputRef}
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Introduce un comando de Minecraft (ej: list, time set day, op Notch)..."
            className="w-full pl-8 pr-12 py-3 bg-dark-900 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono shadow-inner"
          />
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">↑↓ historial</span>
          </div>
        </div>

        <motion.button
          type="submit"
          disabled={!command.trim()}
          whileHover={{ scale: command.trim() ? 1.02 : 1 }}
          whileTap={{ scale: command.trim() ? 0.96 : 1 }}
          className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950/40 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Enviar</span>
        </motion.button>
      </form>
    </div>
  );
};
