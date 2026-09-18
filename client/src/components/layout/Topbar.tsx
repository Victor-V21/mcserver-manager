import React, { useState } from 'react';
import { Menu, Play, Square, RotateCw, Skull, Copy, Check } from 'lucide-react';
import { TelemetryData, PlayitStatus } from '../../lib/types';
import { RarePowerIcon, RarePlayitIcon, RareTpsIcon } from '../rareui/RareIcons';
import { GlassShimmerButton } from '../rareui/GlassShimmerButton';

interface TopbarProps {
  currentTab: string;
  onOpenMobileMenu: () => void;
  telemetry: TelemetryData | null;
  playit: PlayitStatus | null;
  onServerAction: (action: 'start' | 'stop' | 'restart' | 'kill') => void;
  actionPending: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  currentTab,
  onOpenMobileMenu,
  telemetry,
  playit,
  onServerAction,
  actionPending,
}) => {
  const [copied, setCopied] = useState(false);
  const [showPowerDropdown, setShowPowerDropdown] = useState(false);

  const tabTitles: Record<string, { title: string; subtitle: string }> = {
    dashboard: { title: 'Dashboard', subtitle: 'Telemetría y control general en tiempo real' },
    versions: { title: 'Versión & Motor', subtitle: 'Instalación y configuración de Minecraft, NeoForge y Java' },
    console: { title: 'Consola en Vivo', subtitle: 'Terminal interactiva y streaming de logs' },
    properties: { title: 'Configuración', subtitle: 'Editor de server.properties y visualizador MOTD' },
    players: { title: 'Jugadores & Permisos', subtitle: 'Administración de OPs, Whitelist y Bans' },
    mods: { title: 'Gestor de Mods', subtitle: 'Subida, activación y control de archivos .jar' },
    playit: { title: 'Túnel Playit.gg', subtitle: 'Estado del conector y dominios asignados' },
    settings: { title: 'Ajustes del Panel', subtitle: 'Almacenamiento del contenedor y seguridad' },
  };

  const currentInfo = tabTitles[currentTab] || { title: 'Panel', subtitle: 'Administrador de Minecraft' };
  const isOnline = Boolean(telemetry?.isRunning);
  const playitTunnel = playit?.tunnels?.[0];

  const handleCopyIp = () => {
    if (!playitTunnel) return;
    const address = `${playitTunnel.assignedDomain}:${playitTunnel.publicPort}`;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-dark-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile trigger & Page titles */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 cursor-pointer"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            {currentInfo.title}
          </h1>
          <p className="hidden sm:block text-xs text-slate-400">{currentInfo.subtitle}</p>
        </div>
      </div>

      {/* Right: Quick Stats & Power Trigger */}
      <div className="flex items-center gap-2.5">
        {/* Playit address pill */}
        {playitTunnel && (
          <button
            onClick={handleCopyIp}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs font-mono hover:bg-cyan-900/40 transition-colors cursor-pointer"
            title="Copiar dirección de conexión al portapapeles"
          >
            <RarePlayitIcon size={16} />
            <span className="max-w-[180px] truncate">{playitTunnel.assignedDomain}:{playitTunnel.publicPort}</span>
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400 ml-1" /> : <Copy className="w-3.5 h-3.5 text-cyan-400/70 ml-1" />}
          </button>
        )}

        {/* TPS Pill */}
        {isOnline && telemetry?.tps && telemetry.tps.current !== null && telemetry.tps.current !== undefined && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
            <RareTpsIcon size={15} />
            <span>{telemetry.tps.current} TPS</span>
            {telemetry.tps.avgTickMs !== undefined && telemetry.tps.avgTickMs !== null && (
              <span className="text-emerald-400/80 text-[11px] pl-0.5">({telemetry.tps.avgTickMs} ms)</span>
            )}
          </div>
        )}

        {/* Power Dropdown Trigger with GlassShimmerButton */}
        <div className="relative">
          <GlassShimmerButton
            variant={isOnline ? 'emerald' : 'rose'}
            size="sm"
            onClick={() => setShowPowerDropdown(!showPowerDropdown)}
            disabled={actionPending}
          >
            <RarePowerIcon size={15} />
            <span>{isOnline ? 'En Línea' : 'Detenido'}</span>
          </GlassShimmerButton>

          {/* Dropdown Menu */}
          {showPowerDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPowerDropdown(false)}
              />
              <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-dark-900 border border-slate-700/80 shadow-2xl p-2 z-50 animate-fadeIn text-xs">
                <div className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 font-mono">
                  Control de Energía
                </div>

                {!isOnline ? (
                  <button
                    onClick={() => {
                      onServerAction('start');
                      setShowPowerDropdown(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-emerald-400 hover:bg-emerald-500/10 transition-colors font-medium text-left mt-1 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-emerald-400" />
                    <span>Iniciar Servidor</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        onServerAction('restart');
                        setShowPowerDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-amber-400 hover:bg-amber-500/10 transition-colors font-medium text-left mt-1 cursor-pointer"
                    >
                      <RotateCw className="w-4 h-4" />
                      <span>Reiniciar Servidor</span>
                    </button>

                    <button
                      onClick={() => {
                        onServerAction('stop');
                        setShowPowerDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors font-medium text-left cursor-pointer"
                    >
                      <Square className="w-4 h-4" />
                      <span>Detener Servidor (/stop)</span>
                    </button>

                    <div className="my-1 border-t border-slate-800" />

                    <button
                      onClick={() => {
                        onServerAction('kill');
                        setShowPowerDropdown(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-rose-500 hover:bg-rose-600/20 transition-colors font-semibold text-left cursor-pointer"
                    >
                      <Skull className="w-4 h-4" />
                      <span>Forzar Apagado (SIGKILL)</span>
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
