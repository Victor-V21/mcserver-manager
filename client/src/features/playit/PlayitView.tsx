import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { PlayitStatus } from '../../lib/types';
import { GlassShimmerButton } from '../../components/rareui/GlassShimmerButton';
import { RarePlayitIcon } from '../../components/rareui/RareIcons';
import {
  Play,
  Square,
  RotateCw,
  Copy,
  Check,
  Terminal,
} from 'lucide-react';

export const PlayitView: React.FC = () => {
  const [status, setStatus] = useState<PlayitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadPlayit();
  }, []);

  const loadPlayit = async () => {
    setLoading(true);
    try {
      const data = await api.getPlayitStatus();
      setStatus(data);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(true);
    try {
      await api.executePlayitAction(action);
      await loadPlayit();
    } finally {
      setActionLoading(false);
    }
  };

  const copyAddress = (domain: string, port: number) => {
    navigator.clipboard.writeText(`${domain}:${port}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = Boolean(status?.isRunning);
  const tunnel = status?.tunnels?.[0];

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 text-xs">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Verificando conector Playit.gg...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 relative overflow-hidden">
        <div
          className={`absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
            isRunning ? 'bg-cyan-500' : 'bg-slate-700'
          }`}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                isRunning
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-800 border-slate-700 text-slate-500'
              }`}
            >
              <RarePlayitIcon size={32} />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">Túnel Playit.gg</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                    isRunning
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isRunning ? 'bg-cyan-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>{isRunning ? 'TÚNEL EN LÍNEA' : 'TÚNEL DETENIDO'}</span>
                </span>
                {status?.agentId && (
                  <span className="text-xs text-slate-400 font-mono">Agent: {status.agentId}</span>
                )}
              </div>

              <p className="text-xs text-slate-400 mt-1">
                Conexión segura P2P a través de la infraestructura global de Playit.gg sin necesidad de abrir puertos en el router.
              </p>
            </div>
          </div>

          {/* Action buttons with RareUI GlassShimmerButton */}
          <div className="flex items-center gap-2.5">
            {!isRunning ? (
              <GlassShimmerButton
                variant="cyan"
                size="md"
                onClick={() => handleAction('start')}
                disabled={actionLoading}
              >
                <Play className="w-4 h-4 fill-cyan-400" />
                <span>Iniciar Túnel</span>
              </GlassShimmerButton>
            ) : (
              <>
                <GlassShimmerButton
                  variant="default"
                  size="sm"
                  onClick={() => handleAction('restart')}
                  disabled={actionLoading}
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Reiniciar</span>
                </GlassShimmerButton>

                <GlassShimmerButton
                  variant="rose"
                  size="sm"
                  onClick={() => handleAction('stop')}
                  disabled={actionLoading}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Detener</span>
                </GlassShimmerButton>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active Tunnel Details Cards */}
      {tunnel && isRunning ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Dirección de Conexión Pública
            </span>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-dark-950 border border-slate-800">
              <span className="font-mono text-cyan-300 text-xs font-bold truncate">
                {tunnel.assignedDomain}:{tunnel.publicPort}
              </span>
              <button
                onClick={() => copyAddress(tunnel.assignedDomain, tunnel.publicPort)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                title="Copiar IP"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Esta es la IP que deben poner tus amigos en Minecraft</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              IP Directa de Anycast
            </span>
            <div className="p-2.5 rounded-xl bg-dark-950 border border-slate-800">
              <span className="font-mono text-slate-200 text-xs">
                {tunnel.publicAddress}:{tunnel.publicPort} ({tunnel.proto.toUpperCase()})
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Enrutamiento Anycast optimizado por latencia</p>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Mapeo Local (Host)
            </span>
            <div className="p-2.5 rounded-xl bg-dark-950 border border-slate-800">
              <span className="font-mono text-emerald-400 text-xs">
                127.0.0.1:{tunnel.localPort} (Minecraft Default)
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Tráfico redirigido al puerto local de Java</p>
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-6 text-center text-slate-500 border border-slate-800 text-xs">
          El proceso de Playit está inactivo. Haz clic en "Iniciar Túnel" para conectar el servidor al mundo exterior.
        </div>
      )}

      {/* Playit Logs Viewer */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Logs del Proceso Playit-CLI
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Últimas líneas capturadas</span>
        </div>

        <div className="p-4 rounded-xl bg-dark-950 border border-slate-800 font-mono text-xs text-slate-300 space-y-1.5 max-h-64 overflow-y-auto leading-relaxed shadow-inner">
          {status?.logs && status.logs.length > 0 ? (
            status.logs.map((line, idx) => (
              <div key={idx} className="hover:bg-slate-900/50 px-1 py-0.5 rounded">
                <span className="text-cyan-500">&gt;</span> {line}
              </div>
            ))
          ) : (
            <div className="text-slate-600">No hay registros disponibles de Playit.</div>
          )}
        </div>
      </div>
    </div>
  );
};
