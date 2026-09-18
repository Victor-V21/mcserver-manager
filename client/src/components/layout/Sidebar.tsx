import React from 'react';
import { motion } from 'framer-motion';
import {
  RareServerIcon,
  RareVersionsIcon,
  RareTerminalIcon,
  RarePropertiesIcon,
  RarePlayersIcon,
  RareModsIcon,
  RareFilesIcon,
  RarePlayitIcon,
  RareSettingsIcon,
  RarePowerIcon,
} from '../rareui/RareIcons';
import { LogOut } from 'lucide-react';
import { TelemetryData } from '../../lib/types';
import { useAuth } from '../../features/auth/AuthContext';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  telemetry: TelemetryData | null;
  onOpenPowerModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  telemetry,
  onOpenPowerModal,
}) => {
  const { username, logout } = useAuth();
  const isOnline = Boolean(telemetry?.isRunning);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: RareServerIcon },
    { id: 'versions', label: 'Versión & Motor', icon: RareVersionsIcon, badge: isOnline ? 'Activo' : undefined },
    { id: 'console', label: 'Consola en Vivo', icon: RareTerminalIcon, badge: isOnline ? 'Live' : undefined },
    { id: 'properties', label: 'Configuración', icon: RarePropertiesIcon },
    { id: 'players', label: 'Jugadores & OPs', icon: RarePlayersIcon, count: telemetry?.players?.online ?? 0 },
    { id: 'mods', label: 'Gestor de Mods', icon: RareModsIcon },
    { id: 'files', label: 'Archivos Servidor', icon: RareFilesIcon },
    { id: 'playit', label: 'Túnel Playit.gg', icon: RarePlayitIcon },
    { id: 'settings', label: 'Ajustes del Panel', icon: RareSettingsIcon },
  ];

  return (
    <aside className="hidden lg:flex w-64 bg-dark-900 border-r border-slate-800/80 flex-col shrink-0 h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
            whileHover={{ scale: 1.05, rotate: 5 }}
            transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          >
            <RareServerIcon size={22} />
          </motion.div>
          <div>
            <h1 className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>MC Manager</span>
            </h1>
            <span className="text-[10px] text-slate-400 font-mono block">
              {telemetry?.version || 'Minecraft Server'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Status Pill */}
      <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-dark-950/80 border border-slate-800/90 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className="text-xs font-semibold text-slate-300 font-mono">
            {isOnline ? 'Servidor Activo' : 'Servidor Detenido'}
          </span>
        </div>

        <motion.button
          onClick={onOpenPowerModal}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          title="Control de Energía"
        >
          <RarePowerIcon size={16} />
        </motion.button>
      </div>

      {/* Navigation List with RareUI Interactive Effects & layoutId spring */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
              className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer outline-none ${
                isActive
                  ? 'text-emerald-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {/* Animated active highlight pill */}
              {isActive && (
                <motion.div
                  layoutId="sidebarActivePill"
                  className="absolute inset-0 rounded-xl bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.18)] z-0"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}

              <div className="relative z-10 flex items-center gap-3">
                <Icon
                  size={18}
                  className={isActive ? 'text-emerald-400' : 'text-slate-400'}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="relative z-10 px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}

              {typeof item.count === 'number' && (
                <span className="relative z-10 px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {item.count}
                </span>
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Mini Telemetry Widget (only if online) */}
      {telemetry && isOnline && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-dark-950/80 border border-slate-800/90 text-[11px] space-y-2">
          <div className="flex justify-between text-slate-400 font-mono">
            <span>CPU</span>
            <span className="text-slate-200">{telemetry.cpu.java}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(telemetry.cpu.java, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-slate-400 font-mono pt-1">
            <span>RAM</span>
            <span className="text-slate-200">
              {telemetry.ram.maxAllocated > 0 ? `${(telemetry.ram.used / 1024).toFixed(1)} / ${(telemetry.ram.maxAllocated / 1024).toFixed(1)} GB` : 'No configurada'}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-500"
              style={{
                width: `${telemetry.ram.maxAllocated > 0 ? Math.min((telemetry.ram.used / telemetry.ram.maxAllocated) * 100, 100) : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-dark-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
            {username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="truncate">
            <span className="text-xs font-medium text-slate-200 block truncate">{username || 'Admin'}</span>
            <span className="text-[10px] text-slate-400 block font-mono">Panel Producción</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-rose-900/30 transition-colors cursor-pointer"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
