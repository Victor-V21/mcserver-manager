import { useState, useEffect, useRef, useCallback } from 'react';
import { mockConsoleSubscribers } from '../../lib/mockDevAdapter';
import { api } from '../../lib/api';

export type WsStatus = 'connected' | 'connecting' | 'disconnected';

export function useConsoleWs() {
  const [status, setStatus] = useState<WsStatus>('connected');
  const [logs, setLogs] = useState<string[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  const addLogLine = useCallback((line: string) => {
    setLogs((prev) => [...prev.slice(-1000), line]);
  }, []);

  useEffect(() => {
    // Initial welcome banner
    addLogLine('\x1b[38;2;16;185;129m=== Panel de Administración de Servidor Minecraft ===\x1b[0m');
    addLogLine('\x1b[90mConectando al stream de logs de latest.log y canal RCON...\x1b[0m');

    // Check if WebSocket is available
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/console`;

    let socket: WebSocket | null = null;
    let fallbackToMock = true;

    try {
      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        setStatus('connected');
        fallbackToMock = false;
        addLogLine('\x1b[32m[WS] Conexión WebSocket establecida con el servidor.\x1b[0m');
      };

      socket.onmessage = (event) => {
        addLogLine(event.data);
      };

      socket.onerror = () => {
        if (fallbackToMock) {
          // Dev mock fallback
          setStatus('connected');
          addLogLine('\x1b[36m[WS DEV] Modo simulación interactivo activado.\x1b[0m');
        } else {
          setStatus('disconnected');
        }
      };

      socket.onclose = () => {
        if (!fallbackToMock) {
          setStatus('disconnected');
        }
      };
    } catch {
      // Fallback
      setStatus('connected');
    }

    // Subscribe to mock emitter as fallback
    const mockHandler = (msg: string) => {
      addLogLine(msg);
    };
    mockConsoleSubscribers.add(mockHandler);

    return () => {
      mockConsoleSubscribers.delete(mockHandler);
      if (socket) {
        socket.close();
      }
    };
  }, [addLogLine]);

  const sendCommand = useCallback(
    async (command: string) => {
      if (!command.trim()) return;

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'command', command }));
      } else {
        // Dev fallback via api.sendCommand
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
