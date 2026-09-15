import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import {
  Folder,
  FolderOpen,
  ArrowUp,
  CornerDownRight,
  Sparkles,
  Check,
  X,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Edit2,
} from 'lucide-react';

interface FolderExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedPath: string) => void;
  initialPath?: string;
}

interface DirectoryItem {
  name: string;
  path: string;
  isMinecraftCandidate: boolean;
}

interface ShortcutItem {
  label: string;
  path: string;
  exists: boolean;
}

export const FolderExplorerModal: React.FC<FolderExplorerModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  initialPath = '/data',
}) => {
  const [currentPath, setCurrentPath] = useState<string>(initialPath || '/data');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [directories, setDirectories] = useState<DirectoryItem[]>([]);
  const [shortcuts, setShortcuts] = useState<ShortcutItem[]>([]);
  const [hasMinecraftFiles, setHasMinecraftFiles] = useState(false);
  const [isDocker, setIsDocker] = useState(false);
  const [isHomeMounted, setIsHomeMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [pathInput, setPathInput] = useState<string>(initialPath || '/data');

  useEffect(() => {
    if (isOpen) {
      loadDirectory(initialPath || '/data');
      setIsEditingPath(false);
    }
  }, [isOpen, initialPath]);

  const loadDirectory = async (target: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.browseDirectories(target);
      setCurrentPath(res.currentPath);
      setPathInput(res.currentPath);
      setParentPath(res.parentPath);
      setDirectories(res.directories || []);
      setHasMinecraftFiles(!!res.hasMinecraftFiles);
      if (res.isDocker !== undefined) setIsDocker(res.isDocker);
      if (res.isHomeMounted !== undefined) setIsHomeMounted(res.isHomeMounted);
      if (res.shortcuts) {
        setShortcuts(res.shortcuts);
      }
      if (!res.exists && res.error) {
        setError(res.error);
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo explorar la carpeta solicitada');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (path: string) => {
    loadDirectory(path);
    setIsEditingPath(false);
  };

  const handleGoUp = () => {
    if (parentPath) {
      loadDirectory(parentPath);
      setIsEditingPath(false);
    }
  };

  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pathInput.trim()) {
      loadDirectory(pathInput.trim());
      setIsEditingPath(false);
    }
  };

  const handleConfirmSelect = () => {
    onSelect(currentPath);
    onClose();
  };

  if (!isOpen) return null;

  const breadcrumbs = currentPath.split('/').filter(Boolean);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.15 }}
          className="relative w-full max-w-xl bg-dark-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-dark-950/70">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400">
                <FolderOpen className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-semibold text-white">Explorador del Servidor</h3>
              {hasMinecraftFiles && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                  <span>Minecraft Detectado</span>
                </span>
              )}
              {isDocker && (
                <span
                  className={`hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-mono border items-center gap-1 ${
                    isHomeMounted
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                  title={
                    isHomeMounted
                      ? 'El árbol HOST_HOME_PATH del host está montado y disponible para el explorador'
                      : 'El contenedor no tiene montado el árbol del host. Configura HOST_HOME_PATH y reinicia el despliegue'
                  }
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isHomeMounted ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                  <span>{isHomeMounted ? 'Montaje host detectado' : 'Monta HOST_HOME_PATH'}</span>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation & Breadcrumbs Bar */}
          <div className="p-3 border-b border-slate-800/80 bg-dark-950/30 space-y-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleGoUp}
                disabled={!parentPath || currentPath === '/'}
                title="Subir un nivel"
                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800/80 text-slate-300 transition-colors shrink-0"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>

              {isEditingPath ? (
                <form onSubmit={handleInputSubmit} className="flex-1 flex gap-1.5">
                  <input
                    type="text"
                    value={pathInput}
                    onChange={(e) => setPathInput(e.target.value)}
                    autoFocus
                    placeholder="/data..."
                    className="flex-1 px-2.5 py-1 bg-dark-950 border border-emerald-500/60 rounded-lg text-xs text-white font-mono focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="px-2.5 py-1 rounded-lg bg-emerald-500 text-dark-950 text-xs font-semibold hover:bg-emerald-400 transition-colors shrink-0 flex items-center gap-1"
                  >
                    <CornerDownRight className="w-3 h-3" />
                    <span>Ir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingPath(false)}
                    className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </form>
              ) : (
                <div className="flex-1 flex items-center justify-between px-2.5 py-1 bg-dark-950/80 border border-slate-800 rounded-lg min-w-0">
                  <div className="flex items-center gap-1 overflow-x-auto text-xs font-mono text-slate-400 scrollbar-none py-0.5">
                    <button
                      type="button"
                      onClick={() => handleNavigate('/')}
                      className="hover:text-emerald-400 px-1 py-0.5 rounded transition-colors"
                    >
                      /
                    </button>
                    {breadcrumbs.map((crumb, idx) => {
                      const fullBreadcrumbPath = '/' + breadcrumbs.slice(0, idx + 1).join('/');
                      const isLast = idx === breadcrumbs.length - 1;
                      return (
                        <React.Fragment key={fullBreadcrumbPath}>
                          <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
                          <button
                            type="button"
                            onClick={() => handleNavigate(fullBreadcrumbPath)}
                            className={`px-1 py-0.5 rounded transition-colors truncate max-w-[120px] ${
                              isLast
                                ? 'text-emerald-300 font-semibold bg-emerald-500/10'
                                : 'hover:text-emerald-400 hover:bg-white/5'
                            }`}
                          >
                            {crumb}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-1 shrink-0 pl-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingPath(true)}
                      title="Editar ruta manualmente"
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => loadDirectory(currentPath)}
                      title="Recargar"
                      className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Subtle Shortcuts Chips */}
            {shortcuts.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-mono shrink-0">Atajos:</span>
                {shortcuts.map((sc) => (
                  <button
                    key={sc.path}
                    type="button"
                    onClick={() => handleNavigate(sc.path)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-mono transition-all shrink-0 ${
                      currentPath === sc.path
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-dark-950 text-slate-400 border border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Error notice if path does not exist */}
          {error && (
            <div className="mx-3 mt-2 p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate">{error}</span>
            </div>
          )}

          {/* Folders List Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-1 min-h-[180px] max-h-[300px]">
            {loading ? (
              <div className="h-32 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Cargando carpetas...</span>
              </div>
            ) : directories.length === 0 ? (
              <div className="py-6 px-4 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-500">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300">Sin subcarpetas en este directorio</p>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-mono">{currentPath}</p>
                </div>

                {/* Host mount guidance for Docker environments */}
                {(currentPath === '/home' || currentPath.startsWith('/home/')) && (
                  <div className="mt-2 w-full max-w-md p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-left space-y-2.5 animate-fadeIn">
                    <div className="flex items-center gap-2 text-amber-300 font-medium text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>¿Esperabas ver una carpeta del host aquí?</span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      El explorador solo puede ver rutas que Docker haya montado. Para recorrer todo el home del host, monta <code className="text-amber-200 font-mono bg-amber-500/20 px-1 py-0.5 rounded">/home/vm</code> sobre la misma ruta dentro del contenedor mediante Dokploy.
                    </p>
                    <div className="space-y-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Solución en docker-compose.yml o Dokploy:</span>
                      <pre className="p-2 rounded-lg bg-black/60 border border-slate-800 font-mono text-[11px] text-emerald-400 select-all overflow-x-auto">
{`volumes:
  - /home/vm:/home/vm:rw`}
                      </pre>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      💡 Tras añadir este volumen y reiniciar el contenedor, el home del host aparecerá dentro de /home/vm.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              directories.map((dir) => (
                <div
                  key={dir.path}
                  onClick={() => handleNavigate(dir.path)}
                  className="px-3 py-2 rounded-xl border border-slate-800/60 hover:border-slate-700 bg-dark-950/40 hover:bg-slate-800/40 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Folder className="w-4 h-4 text-emerald-400/70 group-hover:text-emerald-400 group-hover:scale-105 transition-transform shrink-0" />
                    <span className="font-mono text-xs text-slate-300 group-hover:text-white truncate">
                      {dir.name}/
                    </span>
                  </div>

                  {dir.isMinecraftCandidate && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 shrink-0 flex items-center gap-1 border border-emerald-500/20">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Minecraft</span>
                    </span>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-slate-800 bg-dark-950/80 flex items-center justify-between gap-3">
            <div className="text-xs font-mono text-slate-400 truncate min-w-0">
              <span className="text-slate-500 text-[11px]">Ruta: </span>
              <span className="text-emerald-300 font-medium">{currentPath}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmSelect}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-dark-950 flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Seleccionar</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
