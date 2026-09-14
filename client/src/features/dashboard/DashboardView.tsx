import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TelemetryData, PlayitStatus } from '../../lib/types';
import { MetricGauge } from '../../components/common/MetricGauge';
import { ConnectedPlayersList } from './ConnectedPlayersList';
import { QuickActionsModal } from './QuickActionsModal';
import { RetroPixelButton } from '../../components/rareui/RetroPixelButton';
import { GlassShimmerButton } from '../../components/rareui/GlassShimmerButton';
import {
  RareServerIcon,
  RareCpuIcon,
  RareRamIcon,
  RareDiskIcon,
  RareTpsIcon,
  RareVersionsIcon,
  RarePropertiesIcon,
  RareModsIcon,
  RarePlayitIcon,
  RareTerminalIcon,
} from '../../components/rareui/RareIcons';
import {
  RotateCw,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight,
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
      {/* Installation Banner if no version detected */}
      {!telemetry?.version && (
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
              <RareVersionsIcon size={24} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>Servidor Minecraft aún no configurado</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                  Acción Requerida
                </span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Selecciona tu versión de Minecraft y build de NeoForge para descargar e instalar el servidor automáticamente.
              </p>
            </div>
          </div>

          <GlassShimmerButton
            variant="amber"
            size="sm"
            onClick={() => onNavigateTab('versions')}
          >
            <span>Ir al Gestor de Versiones</span>
            <ChevronRight className="w-4 h-4" />
          </GlassShimmerButton>
        </div>
      )}

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
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.25)]'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}
            >
              <RareServerIcon size={30} />
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
                  {telemetry?.version || 'Sin versión instalada'}
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
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    <span>Playit: {playitTunnel.assignedDomain}:{playitTunnel.publicPort}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quick Action Buttons with RareUI */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {!isOnline ? (
              <RetroPixelButton
                variant="emerald"
                size="md"
                onClick={() => onServerAction('start')}
              >
                INICIAR SERVIDOR
              </RetroPixelButton>
            ) : (
              <>
                <GlassShimmerButton
                  variant="amber"
                  size="sm"
                  onClick={() => onServerAction('restart')}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </GlassShimmerButton>

                <GlassShimmerButton
                  variant="rose"
                  size="sm"
                  onClick={() => setIsPowerModalOpen(true)}
                >
                  <span>Detener / Kill...</span>
                </GlassShimmerButton>
              </>
            )}

            <GlassShimmerButton
              variant="default"
              size="sm"
              onClick={() => onNavigateTab('console')}
            >
              <RareTerminalIcon size={16} />
              <span>Consola</span>
            </GlassShimmerButton>
          </div>
        </div>
      </div>

      {/* Telemetry Resource Gauges Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU */}
        <MetricGauge
          title="Uso de CPU"
          value={isOnline ? `${telemetry?.cpu?.java ?? 0}%` : '0%'}
          subtitle={`Host global: ${telemetry?.cpu?.host ?? 0}%`}
          percentage={telemetry?.cpu?.java ?? 0}
          icon={RareCpuIcon as any}
          variant="emerald"
        />

        {/* RAM */}
        <MetricGauge
          title="Memoria RAM"
          value={
            isOnline && telemetry?.ram?.used
              ? `${(telemetry.ram.used / 1024).toFixed(2)} GB`
              : '0.00 GB'
          }
          subtitle={`Asignado: ${((telemetry?.ram?.maxAllocated || 4096) / 1024).toFixed(0)} GB • Host libre: ${(Math.max(0, (telemetry?.ram?.total || 8192) - (telemetry?.ram?.systemUsed || telemetry?.ram?.used || 0)) / 1024).toFixed(1)} GB`}
          percentage={
            telemetry?.ram?.used && telemetry?.ram?.maxAllocated
              ? (telemetry.ram.used / telemetry.ram.maxAllocated) * 100
              : 0
          }
          icon={RareRamIcon as any}
          variant="cyan"
        />

        {/* TPS */}
        <MetricGauge
          title="Rendimiento del Mundo"
          value={isOnline ? `${telemetry?.tps?.current ?? 20.0} TPS` : '-- TPS'}
          subtitle={
            isOnline
              ? `Avg. Tick: ${telemetry?.tps?.avgTickMs !== undefined ? `${telemetry.tps.avgTickMs} ms` : '< 1.0 ms'} • Meta: 50 ms`
              : 'Servidor apagado'
          }
          percentage={isOnline ? ((telemetry?.tps?.current ?? 20) / 20) * 100 : 0}
          icon={RareTpsIcon as any}
          variant={(telemetry?.tps?.current ?? 20) >= 19.0 ? 'emerald' : 'amber'}
        />

        {/* Disk */}
        <MetricGauge
          title="Almacenamiento Servidor"
          value={
            telemetry?.disk?.serverSizeFormatted ||
            (telemetry?.disk?.serverSizeMb
              ? `${telemetry.disk.serverSizeMb} MB`
              : telemetry?.disk?.used
              ? `${telemetry.disk.used} GB`
              : '-- MB')
          }
          subtitle={
            telemetry?.disk
              ? `Libre en disco: ${telemetry.disk.free} GB de ${telemetry.disk.total} GB`
              : 'Consultando espacio...'
          }
          percentage={
            telemetry?.disk
              ? (telemetry.disk.used / telemetry.disk.total) * 100
              : 0
          }
          icon={RareDiskIcon as any}
          variant="indigo"
        />
      </div>

      {/* Connected Players Section */}
      <ConnectedPlayersList
        players={telemetry?.players?.list || []}
        maxPlayers={telemetry?.players?.max || 20}
        onKick={onKickPlayer}
        onBan={onBanPlayer}
        onToggleOp={onToggleOp}
      />

      {/* Quick Access Navigation Tiles with RareIcons & Framer Motion physics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div
          onClick={() => onNavigateTab('versions')}
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel-interactive rounded-2xl p-4 cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-105 transition-transform">
              <RareVersionsIcon size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">Versión & Motor</h4>
              <p className="text-[11px] text-slate-400">Instalador NeoForge / MC</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
        </motion.div>

        <motion.div
          onClick={() => onNavigateTab('properties')}
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel-interactive rounded-2xl p-4 cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-105 transition-transform">
              <RarePropertiesIcon size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">server.properties</h4>
              <p className="text-[11px] text-slate-400">Gamemode, MOTD y red</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
        </motion.div>

        <motion.div
          onClick={() => onNavigateTab('mods')}
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel-interactive rounded-2xl p-4 cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 group-hover:scale-105 transition-transform">
              <RareModsIcon size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">Gestor de Mods</h4>
              <p className="text-[11px] text-slate-400">Subir y conmutar .jar</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
        </motion.div>

        <motion.div
          onClick={() => onNavigateTab('playit')}
          whileHover={{ y: -3, scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="glass-panel-interactive rounded-2xl p-4 cursor-pointer flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-105 transition-transform">
              <RarePlayitIcon size={20} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">Túnel Playit.gg</h4>
              <p className="text-[11px] text-slate-400">IP pública y puertos</p>
            </div>
          </div>
          <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" />
        </motion.div>
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
