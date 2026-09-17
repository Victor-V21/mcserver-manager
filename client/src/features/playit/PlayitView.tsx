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
  Save,
  AlertCircle,
  ExternalLink,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

export const PlayitView: React.FC = () => {
  const [status, setStatus] = useState<PlayitStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [localPort, setLocalPort] = useState(25565);
  const [configured, setConfigured] = useState(false);
  const [secretPath, setSecretPath] = useState('');
  const [binaryPath, setBinaryPath] = useState<string | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [playitSecret, setPlayitSecret] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkMessage, setLinkMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPlayit();
  }, []);

  const loadPlayit = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [data, config] = await Promise.all([api.getPlayitStatus(), api.getPlayitConfig()]);
      setStatus(data);
      setLocalPort(config.localPort);
      setConfigured(config.configured);
      setSecretPath(config.secretPath);
      setBinaryPath(config.binaryPath);
      setError(data.lastError || null);
    } catch (err: any) {
      setError(err.message || 'No se pudo consultar Playit');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    setError(null);
    try {
      const result = await api.savePlayitConfig(localPort);
      setLocalPort(result.localPort);
    } catch (err: any) {
      setError(err.message || 'No se pudo guardar el puerto local');
    } finally {
      setConfigSaving(false);
    }
  };

  const handleAction = async (action: 'start' | 'stop' | 'restart') => {
    setActionLoading(true);
    setError(null);
    try {
      await api.executePlayitAction(action);
      await loadPlayit();
    } catch (err: any) {
      setError(err.message || 'No se pudo cambiar el estado de Playit');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLink = async () => {
    if (!playitSecret.trim()) {
      setError('Pega la clave de vinculación de Playit antes de continuar');
      return;
    }

    setLinkLoading(true);
    setError(null);
    setLinkMessage(null);
    try {
      const result = await api.linkPlayit(playitSecret);
      setPlayitSecret('');
      setLinkMessage(result.message);
      await loadPlayit();
    } catch (err: any) {
      setError(err.message || 'No se pudo vincular el agente de Playit');
    } finally {
      setLinkLoading(false);
    }
  };

  const copyAddress = (domain: string, port: number) => {
    navigator.clipboard.writeText(`${domain}:${port}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = Boolean(status?.isRunning);
  const tunnel = status?.tunnels?.[0];

  useEffect(() => {
    if (!isRunning) return undefined;
    const interval = window.setInterval(() => {
      void loadPlayit(false);
    }, 3000);
    return () => window.clearInterval(interval);
  }, [isRunning]);

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

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Agent configuration stored with the container data */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white">Configuración del agente</h3>
            <p className="text-xs text-slate-400 mt-1">La identidad y configuración de Playit se conservan dentro de /data/playit.</p>
          </div>
          <span className={`px-2 py-1 rounded-lg text-[10px] font-mono border ${configured ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10' : 'text-amber-300 border-amber-500/30 bg-amber-500/10'}`}>
            {configured ? 'Agente vinculado' : 'Requiere vinculación'}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <label className="space-y-1 text-xs text-slate-400">
            <span className="block">Puerto local de Minecraft</span>
            <input
              type="number"
              min={1}
              max={65535}
              value={localPort}
              onChange={(event) => setLocalPort(Number(event.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-dark-950 border border-slate-700 text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </label>
          <div className="text-[11px] text-slate-500 font-mono break-all">Identidad: {secretPath || 'se genera al vincular Playit'}</div>
          <GlassShimmerButton variant="cyan" size="sm" onClick={handleSaveConfig} disabled={configSaving}>
            {configSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Guardar puerto</span>
          </GlassShimmerButton>
        </div>
        <p className="text-[11px] text-slate-500 font-mono">Binario: {binaryPath || 'no encontrado en la imagen'}</p>

        {!configured ? (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg border border-amber-500/25 bg-amber-500/10 p-2 text-amber-300">
                <KeyRound className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-semibold text-amber-100">Vincula este agente con tu cuenta</h4>
                <p className="mt-1 text-[11px] leading-relaxed text-amber-200/70">
                  El agente está instalado, pero todavía no tiene identidad. Obtén una clave para este servidor en Playit y pégala aquí.
                </p>
                <a
                  href="https://playit.gg/account/setup/wizard/new-account/docker/mcserver-manager"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
                >
                  Obtener clave en Playit.gg
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="playit-secret" className="sr-only">Clave de vinculación de Playit</label>
              <input
                id="playit-secret"
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={playitSecret}
                onChange={(event) => setPlayitSecret(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void handleLink();
                }}
                placeholder="Pega aquí tu secret key de Playit"
                className="min-w-0 flex-1 px-3 py-2 rounded-xl bg-dark-950 border border-amber-500/25 text-white text-xs font-mono placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/40"
              />
              <GlassShimmerButton
                variant="cyan"
                size="sm"
                onClick={handleLink}
                disabled={linkLoading || !playitSecret.trim()}
                aria-label="Vincular agente de Playit"
              >
                {linkLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>{linkLoading ? 'Vinculando…' : 'Vincular agente'}</span>
              </GlassShimmerButton>
            </div>
            <p className="text-[10px] text-slate-500">
              La clave se envía una sola vez al agente local y no se almacena en la configuración del manager.
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-3.5 py-3">
            <div className="flex items-center gap-2 text-[11px] text-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Identidad de Playit disponible para este contenedor.</span>
            </div>
            <a
              href="https://playit.gg/account/tunnels"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-cyan-300 hover:text-cyan-200 transition-colors"
            >
              Administrar túneles
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {linkMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2.5 text-[11px] text-emerald-200">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{linkMessage}. El agente queda listo para publicar Minecraft.</span>
          </div>
        )}
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
      ) : isRunning ? (
        <div className="glass-panel rounded-2xl p-6 text-center text-cyan-200 border border-cyan-500/20 text-xs">
          El agente de Playit está conectado y todavía está esperando los datos del túnel. Actualiza en unos segundos.
        </div>
      ) : (
        <div className="glass-panel rounded-2xl p-6 text-center text-slate-500 border border-slate-800 text-xs">
          El proceso de Playit está detenido. Haz clic en "Iniciar Túnel" para conectar el servidor al mundo exterior.
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
