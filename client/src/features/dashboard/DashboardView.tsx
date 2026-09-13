import React, { useState } from 'react';
import { TelemetryData, PlayitStatus } from '../../lib/types';
import { MetricGauge } from '../../components/common/MetricGauge';
import { ConnectedPlayersList } from './ConnectedPlayersList';
import { QuickActionsModal } from './QuickActionsModal';
import {
  Cpu,
  Database,
  HardDrive,
  Activity,
  Play,
  Square,
  RotateCw,
  Clock,
  Radio,
  Server,
  Terminal,
  FileCode,
  ExternalLink,
} from 'lucide-react';

interface DashboardViewProps {
  telemetry: TelemetryData | null;
  playit: PlayitStatus | null;
  onServerAction: (action: 'start' | 'stop' | 'restart' | 'kill') => Promise<void>;
  onNavigateTab: (tab: string) => void;
  onKickPlayer: (name: string, reason?: string) => Promise<void>;
  onBanPlayer: (name: string, reason?: string) => Promise<void>;
  onToggleOp: (name: string, isOp: boolean) => Promise<void>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  telemetry,
  playit,
  onServerAction,
  onNavigateTab,
  onKickPlayer,
  onBanPlayer,
  onToggleOp,
}) => {
  const [isPowerModalOpen, setIsPowerModalOpen] = useState(false);
  const isOnline = Boolean(telemetry?.isRunning);

  const formatUptime = (seconds: number) => {
    if (!seconds) return '0m';
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const playitTunnel = playit?.tunnels?.[0];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Main Server Banner */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 relative overflow-hidden">
        {/* Glow accent */}
        <div
          className={`absolute -right-16 -top-16 w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-20 ${
            isOnline ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start sm:items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border ${
                isOnline
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <Server className="w-7 h-7" />
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-bold text-white tracking-tight">Servidor Minecraft</h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider font-mono flex items-center gap-1.5 ${
                    isOnline
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  <span>{telemetry?.state.toUpperCase() || 'OFFLINE'}</span>
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {telemetry?.version || 'NeoForge 1.21.1'}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Activo: {formatUptime(telemetry?.uptime || 0)}</span>
                </div>
                {telemetry?.pid && (
                  <div className="flex items-center gap-1.5 font-mono">
                    <Radio className="w-3.5 h-3.5 text-slate-500" />
                    <span>PID: {telemetry.pid}</span>
                  </div>
                )}
                {playitTunnel && (
                  <div className="flex items-center gap-1.5 font-mono text-cyan-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span>Playit: {playitTunnel.assignedDomain}:{playitTunnel.publicPort}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {!isOnline ? (
              <button
                onClick={() => onServerAction('start')}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Iniciar Servidor</span>
              </button>
            ) : (
              <>
                <button
                  onClick={() => onServerAction('restart')}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
                  title="Reiniciar Servidor"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Reiniciar</span>
                </button>

                <button
                  onClick={() => onServerAction('stop')}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-medium border border-rose-500/30 flex items-center gap-1.5 transition-all"
                  title="Detener Servidor"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Detener</span>
                </button>

                <button
                  onClick={() => setIsPowerModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-dark-950 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700 transition-colors"
                >
                  Más Acciones...
                </button>
              </>
            )}

            <button
              onClick={() => onNavigateTab('console')}
              className="px-3.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-all"
            >
              <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ver Consola</span>
            </button>
          </div>
        </div>
      </div>

      {/* Telemetry Resource Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <MetricGauge
          title="Uso de CPU"
          value={isOnline ? `${telemetry?.cpu.java || 0}%` : '0%'}
          subtitle={`Host global: ${telemetry?.cpu.host || 0}%`}
          percentage={telemetry?.cpu.java || 0}
          icon={Cpu}
          variant="emerald"
        />

        {/* RAM */}
        <MetricGauge
          title="Memoria RAM"
          value={
            isOnline
              ? `${((telemetry?.ram.used || 0) / 1024).toFixed(1)} GB`
              : '0.0 GB'
          }
          subtitle={`Asignado: ${((telemetry?.ram.maxAllocated || 8192) / 1024).toFixed(0)} GB / Sistema: ${((telemetry?.ram.total || 16384) / 1024).toFixed(0)} GB`}
          percentage={
            telemetry
              ? (telemetry.ram.used / telemetry.ram.maxAllocated) * 100
              : 0
          }
          icon={Database}
          variant="cyan"
        />

        {/* TPS */}
        <MetricGauge
          title="Rendimiento del Mundo"
          value={isOnline ? `${telemetry?.tps.current || 20.0} TPS` : '-- TPS'}
          subtitle={
            isOnline
              ? (telemetry?.tps.current || 20) >= 19.5
                ? 'Rendimiento Óptimo (100%)'
                : 'Carga Elevada detectada'
              : 'Servidor apagado'
          }
          percentage={isOnline ? ((telemetry?.tps.current || 20) / 20) * 100 : 0}
          icon={Activity}
          variant={(telemetry?.tps.current || 20) >= 19.0 ? 'emerald' : 'amber'}
        />

        {/* Disk */}
        <MetricGauge
          title="Almacenamiento"
          value={`${telemetry?.disk.used || 34.8} GB`}
          subtitle={`Libre: ${telemetry?.disk.free || 85.2} GB de ${telemetry?.disk.total || 120} GB`}
          percentage={
            telemetry
              ? (telemetry.disk.used / telemetry.disk.total) * 100
              : 29
          }
          icon={HardDrive}
          variant="indigo"
        />
      </div>

      {/* Connected Players Section */}
      <ConnectedPlayersList
        players={telemetry?.players.list || []}
        maxPlayers={telemetry?.players.max || 20}
        onKick={onKickPlayer}
        onBan={onBanPlayer}
        onToggleOp={onToggleOp}
      />

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigateTab('properties')}
          className="glass-panel-interactive rounded-2xl p-4 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">server.properties</h4>
              <p className="text-[11px] text-slate-400">Gamemode, MOTD, Semilla y puertos</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500" />
        </div>

        <div
          onClick={() => onNavigateTab('mods')}
          className="glass-panel-interactive rounded-2xl p-4 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Mods de NeoForge</h4>
              <p className="text-[11px] text-slate-400">Subir, activar o desactivar .jar</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500" />
        </div>

        <div
          onClick={() => onNavigateTab('playit')}
          className="glass-panel-interactive rounded-2xl p-4 cursor-pointer flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white">Túnel Playit.gg</h4>
              <p className="text-[11px] text-slate-400">Conexión pública sin abrir puertos</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500" />
        </div>
      </div>

      {/* Quick Power Actions Modal */}
      <QuickActionsModal
        isOpen={isPowerModalOpen}
        onClose={() => setIsPowerModalOpen(false)}
        isRunning={isOnline}
        onExecute={onServerAction}
      />
    </div>
  );
};
