import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { api } from '../../lib/api';
import {
  RotateCw,
  Clock,
  Radio,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  Sparkles,
  AlertCircle,
  RefreshCw,
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

  const [aiElapsedSeconds, setAiElapsedSeconds] = useState(0);
  const [isManualAnalyzing, setIsManualAnalyzing] = useState(false);
  const [aiErrorState, setAiErrorState] = useState<string | null>(null);

  const isAiAnalyzing = Boolean(
    !isOnline && (
      telemetry?.crashDiagnostic?.modName?.includes('Analizando con IA') ||
      telemetry?.crashDiagnostic?.error?.includes('Esperando respuesta de Gemini') ||
      isManualAnalyzing
    )
  );

  React.useEffect(() => {
    let interval: any = null;
    if (isAiAnalyzing) {
      interval = setInterval(() => {
        setAiElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      setAiElapsedSeconds(0);
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAiAnalyzing]);

  // Handle timeout if analysis exceeds 25s
  React.useEffect(() => {
    if (isAiAnalyzing && aiElapsedSeconds >= 25) {
      setAiErrorState('Tiempo de espera agotado (25s). Los servidores de Google Gemini pueden estar saturados.');
    }
  }, [isAiAnalyzing, aiElapsedSeconds]);

  const handleTriggerAi = async () => {
    setIsManualAnalyzing(true);
    setAiErrorState(null);
    setAiElapsedSeconds(0);
    try {
      const res = await api.triggerAiDiagnosis();
      if (!res.success && res.message) {
        setAiErrorState(res.message);
      }
    } catch (err: any) {
      setAiErrorState(err.message || 'Error al conectar con el motor de IA');
    } finally {
      setIsManualAnalyzing(false);
    }
  };

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

      {/* Crash Diagnostic / AI Analysis Banner */}
      <AnimatePresence mode="wait">
        {!isOnline && isAiAnalyzing && (
          <motion.div
            key="ai-analyzing"
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="mb-4"
          >
            <div className="glass-panel border border-purple-500/40 rounded-2xl p-4 sm:p-5 relative overflow-hidden bg-gradient-to-br from-purple-950/30 via-slate-900/80 to-indigo-950/30 shadow-xl shadow-purple-500/10 backdrop-blur-xl">
              {/* Ethereal Animated Top Edge Beam */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400 to-transparent animate-pulse" />
              
              {/* Scan Beam Sweeping Horizontally */}
              <motion.div
                animate={{ x: ['-100%', '250%'] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className="absolute top-0 bottom-0 w-40 bg-gradient-to-r from-transparent via-purple-500/15 to-transparent pointer-events-none"
              />

              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center relative z-10">
                {/* Left Icon with Dual Pulsing and Rotating Rings */}
                <div className="relative shrink-0">
                  <motion.div
                    animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.6, 0.2] }}
                    transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                    className="absolute -inset-1 rounded-2xl bg-purple-500/30 blur-md"
                  />
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 p-[2px] shadow-lg shadow-purple-500/20">
                    <div className="w-full h-full bg-dark-950/90 rounded-[14px] flex items-center justify-center relative overflow-hidden">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                        className="absolute inset-0 bg-gradient-to-tr from-purple-500/25 to-transparent rounded-[14px]"
                      />
                      <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-purple-300 relative z-10 animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Main Content & Counter */}
                <div className="flex-1 w-full min-w-0">
                  <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                      </span>
                      <span>Diagnóstico con IA en Proceso</span>
                    </div>

                    {/* Live Stopwatch Counter */}
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-dark-950/90 border border-purple-500/30 text-purple-200 text-xs font-mono shadow-inner">
                      <Clock className="w-3.5 h-3.5 text-purple-400 animate-spin-slow" />
                      <span>{aiElapsedSeconds < 10 ? `00:0${aiElapsedSeconds}s` : `00:${aiElapsedSeconds}s`}</span>
                    </div>

                    {aiElapsedSeconds >= 15 && (
                      <span className="text-[11px] text-amber-400/90 flex items-center gap-1 font-mono">
                        <AlertCircle className="w-3 h-3" />
                        <span>Analizando logs extensos...</span>
                      </span>
                    )}
                  </div>

                  <h4 className="text-white font-medium text-sm sm:text-base flex items-center gap-2">
                    <span>Gemini está interpretando las trazas del crash y dependencias...</span>
                  </h4>
                  
                  <p className="text-xs text-slate-400 mt-0.5">
                    Se está consultando el modelo de IA para identificar exactamente qué mods causaron el fallo y brindarte la solución en lenguaje natural.
                  </p>

                  {/* Failure / Timeout State & Retry if exceeded */}
                  {aiErrorState && (
                    <div className="mt-2.5 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
                      <span>{aiErrorState}</span>
                      <button
                        type="button"
                        onClick={handleTriggerAi}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-medium transition-colors flex items-center gap-1.5 shrink-0"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Reintentar</span>
                      </button>
                    </div>
                  )}

                  {/* Futuristic Progress Bar with Glowing Shimmer */}
                  <div className="w-full bg-slate-900/90 rounded-full h-1.5 overflow-hidden relative border border-purple-800/30 mt-3">
                    <motion.div
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                      className="w-1/2 h-full bg-gradient-to-r from-transparent via-purple-400 to-indigo-400 rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {!isOnline && !isAiAnalyzing && telemetry?.crashDiagnostic && (
          <motion.div
            key="crash-result"
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            className="mb-4"
          >
            <div className={`glass-panel border rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center ${
              telemetry.crashDiagnostic.severity === 'warning'
                ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-red-500/30 bg-red-500/5'
            }`}>
              <div className={`p-3 rounded-xl shrink-0 ${
                telemetry.crashDiagnostic.severity === 'warning'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1 w-full overflow-hidden">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className={`font-bold text-base ${
                    telemetry.crashDiagnostic.severity === 'warning' ? 'text-amber-400' : 'text-red-400'
                  }`}>
                    {telemetry.crashDiagnostic.severity === 'warning' ? 'Advertencia detectada en el servidor' : 'Fallo o crasheo detectado en el servidor'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-mono flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-400" />
                    <span>Diagnóstico Detallado con IA</span>
                  </span>
                </div>

                {/* Error Summary */}
                {telemetry.crashDiagnostic.error && (
                  <p className="text-xs text-slate-300 font-medium mb-2.5">
                    {telemetry.crashDiagnostic.error}
                  </p>
                )}

                {/* Missing Dependencies Pills */}
                {telemetry.crashDiagnostic.missingDependencies && telemetry.crashDiagnostic.missingDependencies.length > 0 && (
                  <div className="mb-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
                    <span className="font-semibold text-cyan-300 text-xs mb-1.5 flex items-center gap-1.5">
                      <span>Librerías / Dependencias requeridas que faltan por instalar:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {telemetry.crashDiagnostic.missingDependencies.map((dep: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg font-mono text-xs bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 flex items-center gap-1 font-semibold"
                        >
                          <span className="text-cyan-400 font-bold">+</span>
                          <span>{dep}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Installed Culprit Mods or Affected Component */}
                {telemetry.crashDiagnostic.modName && (
                  <div className="mb-3">
                    <span className="font-semibold text-slate-300 text-xs mb-1.5 block">
                      {telemetry.crashDiagnostic.modName.includes('/') ||
                       telemetry.crashDiagnostic.modName.toLowerCase().includes('memoria') ||
                       telemetry.crashDiagnostic.modName.toLowerCase().includes('puerto') ||
                       telemetry.crashDiagnostic.modName.toLowerCase().includes('eula') ||
                       telemetry.crashDiagnostic.modName.toLowerCase().includes('java') ||
                       telemetry.crashDiagnostic.modName.toLowerCase().includes('mundo') ||
                       telemetry.crashDiagnostic.modName.toLowerCase().includes('sistema')
                        ? 'Componente / Causa detectada:'
                        : 'Mod(s) instalados involucrados en el conflicto:'}
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {telemetry.crashDiagnostic.modName.split(',').map((item: string, idx: number) => (
                        <span 
                          key={idx} 
                          className={`px-2 py-0.5 rounded-md font-mono text-xs ${
                            telemetry.crashDiagnostic?.severity === 'warning' 
                              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-200' 
                              : 'bg-red-500/10 border border-red-500/20 text-red-200'
                          }`}
                        >
                          {item.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Solution Box */}
                <div className="p-3.5 rounded-xl bg-dark-950/70 border border-slate-800 mb-2.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Solución sugerida:</span>
                  <p className={`text-xs sm:text-sm leading-relaxed ${
                    telemetry.crashDiagnostic.severity === 'warning' ? 'text-amber-200' : 'text-red-200'
                  }`}>
                    {telemetry.crashDiagnostic.solution}
                  </p>
                </div>

                {/* Detailed Breakdown */}
                {telemetry.crashDiagnostic.details && telemetry.crashDiagnostic.details.length > 0 && (
                  <div className="mt-2.5 text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
                    <span className="font-semibold text-slate-300 block mb-1.5 text-xs">Desglose y detalles técnicos:</span>
                    <ul className="space-y-1 text-xs">
                      {telemetry.crashDiagnostic.details.map((detail: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 text-slate-300">
                          <span className="text-purple-400 font-bold shrink-0">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">
                <GlassShimmerButton
                  variant="default"
                  size="sm"
                  onClick={handleTriggerAi}
                  className="flex-1 sm:flex-none justify-center gap-1.5 border-purple-500/30 hover:border-purple-500/60"
                >
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span>Reanalizar con IA</span>
                </GlassShimmerButton>
                {telemetry.crashDiagnostic.severity === 'warning' && (
                  <GlassShimmerButton
                    variant="amber"
                    size="sm"
                    onClick={() => onNavigateTab('versions')}
                    className="flex-1 sm:flex-none justify-center"
                  >
                    Actualizar NeoForge
                  </GlassShimmerButton>
                )}
                {/* Contextual navigation button */}
                {telemetry.crashDiagnostic.modName && (
                  telemetry.crashDiagnostic.modName.includes('/') ||
                  telemetry.crashDiagnostic.modName.toLowerCase().includes('memoria') ||
                  telemetry.crashDiagnostic.modName.toLowerCase().includes('puerto') ||
                  telemetry.crashDiagnostic.modName.toLowerCase().includes('eula') ||
                  telemetry.crashDiagnostic.modName.toLowerCase().includes('java') ||
                  telemetry.crashDiagnostic.modName.toLowerCase().includes('mundo') ||
                  telemetry.crashDiagnostic.modName.toLowerCase().includes('sistema')
                ) ? (
                  <GlassShimmerButton
                    variant="default"
                    size="sm"
                    onClick={() => onNavigateTab('console')}
                    className="flex-1 sm:flex-none justify-center"
                  >
                    Ver Consola en Vivo
                  </GlassShimmerButton>
                ) : (
                  <GlassShimmerButton
                    variant={telemetry.crashDiagnostic.severity === 'warning' ? 'default' : 'rose'}
                    size="sm"
                    onClick={() => onNavigateTab('mods')}
                    className="flex-1 sm:flex-none justify-center"
                  >
                    Gestionar Mods
                  </GlassShimmerButton>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              : '-- MB')
          }
          subtitle="Tamaño total de los archivos del servidor"
          percentage={0} // No mostramos barra de porcentaje por ser variable
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
