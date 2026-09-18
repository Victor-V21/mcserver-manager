import React from 'react';
import {
  RareServerIcon,
  RareVersionsIcon,
  RareTerminalIcon,
  RareModsIcon,
  RareFilesIcon,
  RarePlayersIcon,
  RarePropertiesIcon,
  RarePlayitIcon,
  RareSettingsIcon,
} from '../rareui/RareIcons';
import { Sliders, X, LogOut } from 'lucide-react';
import { useAuth } from '../../features/auth/AuthContext';
import { TelemetryData } from '../../lib/types';

interface MobileNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  telemetry: TelemetryData | null;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onOpen,
  onClose,
  telemetry,
}) => {
  const { logout, username } = useAuth();

  const primaryTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: RareServerIcon },
    { id: 'versions', label: 'Versión', icon: RareVersionsIcon },
    { id: 'console', label: 'Consola', icon: RareTerminalIcon },
    { id: 'mods', label: 'Mods', icon: RareModsIcon },
    { id: 'files', label: 'Archivos', icon: RareFilesIcon },
  ];

  const drawerItems = [
    { id: 'dashboard', label: 'Dashboard General', icon: RareServerIcon },
    { id: 'versions', label: 'Versión & Motor NeoForge', icon: RareVersionsIcon },
    { id: 'console', label: 'Consola en Vivo (xterm)', icon: RareTerminalIcon },
    { id: 'properties', label: 'Editor server.properties', icon: RarePropertiesIcon },
    { id: 'players', label: 'Control de Jugadores & OPs', icon: RarePlayersIcon },
    { id: 'mods', label: 'Gestor de Mods (.jar)', icon: RareModsIcon },
    { id: 'files', label: 'Archivos del Servidor', icon: RareFilesIcon },
    { id: 'playit', label: 'Túnel Playit.gg', icon: RarePlayitIcon },
    { id: 'settings', label: 'Ajustes del Panel', icon: RareSettingsIcon },
  ];

  return (
    <>
      {/* Bottom Floating Bar for Smartphones */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 min-h-16 h-[calc(4rem+env(safe-area-inset-bottom))] bg-dark-900/95 backdrop-blur-lg border-t border-slate-800/80 px-1 pb-[env(safe-area-inset-bottom)] flex items-center justify-around z-30">
        {primaryTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex-1 min-w-0 min-h-11 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={18} className="mb-0.5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}

        <button
          onClick={onOpen}
          aria-expanded={isOpen}
          aria-label="Abrir más opciones"
          className={`flex-1 min-w-0 min-h-11 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition-colors cursor-pointer ${
            isOpen ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sliders className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] font-medium">Más</span>
        </button>
      </div>

      {/* Slide-in Mobile Drawer */}
      {isOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[80vw] bg-dark-900 h-full border-r border-slate-800 p-5 flex flex-col justify-between shadow-2xl z-10 animate-slideRight">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                    <RareVersionsIcon size={18} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">MC Manager</h3>
                    <p className="text-[11px] text-emerald-400 font-mono">
                      {telemetry?.isRunning ? '● Servidor Activo' : '○ Detenido'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-1">
                {drawerItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectTab(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono truncate">{username || 'Admin'}</span>
              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg hover:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
