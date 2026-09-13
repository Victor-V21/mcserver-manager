import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  FileSliders,
  Users,
  Package,
  Network,
  Settings,
  LogOut,
  Server,
  Zap,
} from 'lucide-react';
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
  const { logout, username } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'console', label: 'Consola en Vivo', icon: Terminal, badge: 'Live' },
    { id: 'properties', label: 'Configuración', icon: FileSliders },
    { id: 'players', label: 'Jugadores & OPs', icon: Users, count: telemetry?.players.online },
    { id: 'mods', label: 'Gestor de Mods', icon: Package },
    { id: 'playit', label: 'Túnel Playit.gg', icon: Network, status: 'ok' },
    { id: 'settings', label: 'Ajustes del Panel', icon: Settings },
  ];

  const isOnline = telemetry?.isRunning;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-dark-900 border-r border-slate-800/80 shrink-0 h-screen sticky top-0 select-none z-30">
      {/* Brand */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-900/30">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">MC Manager</span>
            <span className="text-[11px] text-slate-400 font-mono block">NeoForge 1.21.1</span>
          </div>
        </div>
      </div>

      {/* Server Status Compact Bar */}
      <div className="px-4 py-3 bg-dark-950/60 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            {isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isOnline ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
          </span>
          <span className="text-xs font-semibold text-slate-300">
            {isOnline ? 'Servidor Activo' : 'Servidor Detenido'}
          </span>
        </div>

        <button
          onClick={onOpenPowerModal}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          title="Acciones de Energía"
        >
          <Zap className="w-3.5 h-3.5 text-amber-400" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-300'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {item.badge}
                </span>
              )}

              {typeof item.count === 'number' && (
                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Mini Telemetry Widget */}
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
              {(telemetry.ram.used / 1024).toFixed(1)} / {(telemetry.ram.maxAllocated / 1024).toFixed(0)} GB
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-500 h-full transition-all duration-500"
              style={{
                width: `${Math.min((telemetry.ram.used / telemetry.ram.maxAllocated) * 100, 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* User Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-dark-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-xs text-emerald-400 border border-slate-700">
            {username?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="truncate">
            <span className="text-xs font-medium text-slate-200 block truncate">{username || 'Admin'}</span>
            <span className="text-[10px] text-slate-400 block font-mono">Panel Admin</span>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title="Cerrar Sesión"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
