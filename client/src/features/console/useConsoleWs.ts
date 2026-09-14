import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../lib/api';

export type WsStatus = 'connected' | 'connecting' | 'disconnected';

export function useConsoleWs() {
  const [status, setStatus] = useState<WsStatus>('connecting');
  const [logs, setLogs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);

  const addLogLine = useCallback((line: string) => {
    setLogs((prev) => [...prev.slice(-1500), line]);
  }, []);

  const connectWebSocket = useCallback(() => {
    setStatus('connecting');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/console`;

    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setStatus('connected');
        addLogLine('\x1b[32m[WS] Conectado al stream de consola en vivo.\x1b[0m');
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'log' && typeof parsed.data === 'string') {
            addLogLine(parsed.data);
          } else {
            addLogLine(event.data);
          }
        } catch {
          addLogLine(event.data);
        }
      };

      socket.onerror = () => {
        setStatus('disconnected');
      };

      socket.onclose = () => {
        setStatus('disconnected');
        // Auto-reconnect after 3 seconds
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };
    } catch {
      setStatus('disconnected');
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    }
  }, [addLogLine]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connectWebSocket]);

  const sendCommand = useCallback(
    async (command: string) => {
      if (!command.trim()) return;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'command', command }));
      } else {
        // Fallback to REST endpoint
        await api.sendCommand(command);
      }
    },
    []
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    status,
    logs,
    sendCommand,
    clearLogs,
  };
}
