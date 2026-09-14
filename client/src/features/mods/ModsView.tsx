import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import { ModFile } from '../../lib/types';
import { Modal } from '../../components/common/Modal';
import { AnimatedTabs } from '../../components/rareui/AnimatedTab';
import { GlassShimmerButton } from '../../components/rareui/GlassShimmerButton';
import { RareModsIcon } from '../../components/rareui/RareIcons';
import {
  UploadCloud,
  Search,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit3,
  FileCheck,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react';

interface ModsViewProps {
  telemetry?: any;
}

export const ModsView: React.FC<ModsViewProps> = ({ telemetry }) => {
  const [mods, setMods] = useState<ModFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  const errorModName = telemetry?.crashDiagnostic?.modName?.toLowerCase() || '';

  // Notification and Restart State
  const [notice, setNotice] = useState<{
    type: 'warning' | 'error' | 'success';
    message: string;
  } | null>(null);
  const [restarting, setRestarting] = useState(false);

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStats, setUploadStats] = useState<{ total: number; uploaded: number; pct: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [modToDelete, setModToDelete] = useState<ModFile | null>(null);
  const [modToRename, setModToRename] = useState<ModFile | null>(null);
  const [newFilename, setNewFilename] = useState('');

  useEffect(() => {
    loadMods();
  }, []);

  const loadMods = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getMods();
      // Ensure each item has both filename and name populated
      const normalized = (data || []).map((m: any) => ({
        ...m,
        filename: m.filename || m.name,
        name: m.name || m.filename,
      }));
      setMods(normalized);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al cargar la lista de mods',
      });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleToggleMod = async (mod: ModFile) => {
    const nextState = !mod.isEnabled;
    const target = mod.filename || mod.name;
    try {
      await api.toggleMod(target, nextState);
      setNotice({
        type: 'warning',
        message: `Mod "${mod.name}" ${nextState ? 'activado' : 'desactivado'}. Es necesario reiniciar el servidor para que los cambios se apliquen en Minecraft.`,
      });
      await loadMods(true);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al cambiar estado del mod',
      });
    }
  };

  const handleDelete = async () => {
    if (!modToDelete) return;
    const target = modToDelete.filename || modToDelete.name;
    try {
      await api.deleteMod(target);
      setNotice({
        type: 'warning',
        message: `Mod "${modToDelete.name}" eliminado del disco. Es necesario reiniciar el servidor para que los cambios se apliquen en Minecraft.`,
      });
      setModToDelete(null);
      await loadMods(true);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al eliminar el mod',
      });
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modToRename || !newFilename.trim()) return;
    const target = modToRename.filename || modToRename.name;
    try {
      await api.renameMod(target, newFilename.trim());
      setNotice({
        type: 'warning',
        message: `Mod renombrado a "${newFilename.trim()}". Es necesario reiniciar el servidor para que los cambios se apliquen en Minecraft.`,
      });
      setModToRename(null);
      setNewFilename('');
      await loadMods(true);
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al renombrar el mod',
      });
    }
  };

  const handleQuickRestart = async () => {
    setRestarting(true);
    try {
      await api.executeServerAction('restart');
      setNotice({
        type: 'success',
        message: 'Reiniciando el servidor Minecraft para aplicar los cambios de mods...',
      });
    } catch (err: any) {
      setNotice({
        type: 'error',
        message: err.message || 'Error al reiniciar el servidor',
      });
    } finally {
      setRestarting(false);
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const validFiles = Array.from(files).filter(f => f.name.endsWith('.jar') || f.name.endsWith('.jar.disabled'));
    if (validFiles.length === 0) return;
    
    setUploading(true);
    setUploadStats({ total: validFiles.length, uploaded: 0, pct: 0 });

    let uploadedCount = 0;
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      setUploadStats({ total: validFiles.length, uploaded: uploadedCount, pct: 30 });
      await new Promise((r) => setTimeout(r, 200));
      setUploadStats({ total: validFiles.length, uploaded: uploadedCount, pct: 75 });
      try {
        await api.uploadMod(file);
        uploadedCount++;
        setUploadStats({ total: validFiles.length, uploaded: uploadedCount, pct: 100 });
      } catch (err: any) {
        setNotice({
          type: 'error',
          message: `Error al subir ${file.name}: ${err.message}`,
        });
      }
    }

    await new Promise((r) => setTimeout(r, 400));
    setUploading(false);
    setUploadStats(null);
    if (uploadedCount > 0) {
      setNotice({
        type: 'warning',
        message: `${uploadedCount} mod(s) subido(s) exitosamente. Es necesario reiniciar el servidor para que los cambios se apliquen en Minecraft.`,
      });
    }
    loadMods(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const filteredMods = mods.filter((mod) => {
    const q = search.toLowerCase();
    const matchesSearch =
      (mod.name && mod.name.toLowerCase().includes(q)) ||
      (mod.filename && mod.filename.toLowerCase().includes(q));
    if (filter === 'enabled') return matchesSearch && mod.isEnabled;
    if (filter === 'disabled') return matchesSearch && !mod.isEnabled;
    return matchesSearch;
  });

  const enabledCount = mods.filter((m) => m.isEnabled).length;
  const disabledCount = mods.filter((m) => !m.isEnabled).length;

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 text-xs">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Cargando lista de mods...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <RareModsIcon size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white tracking-wide">Gestor de Mods</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-mono">
                {mods.length} mods
              </span>
            </div>
            <p className="text-xs text-slate-400">Carpeta server/mods/ con soporte de activación y .disabled</p>
          </div>
        </div>

        {/* Upload Button with RareUI GlassShimmerButton */}
        <GlassShimmerButton
          variant="emerald"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Subir Mods (.jar)</span>
        </GlassShimmerButton>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jar,.disabled"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Pending changes notice banner with Framer Motion entrance */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className={`glass-panel rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              notice.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : notice.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            }`}
          >
            <div className="flex items-start sm:items-center gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 mt-0.5 sm:mt-0 ${
                  notice.type === 'warning'
                    ? 'bg-amber-500/20 text-amber-400'
                    : notice.type === 'error'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}
              >
                {notice.type === 'warning' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : notice.type === 'error' ? (
                  <XCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div className="text-xs">
                <p className="font-semibold">{notice.message}</p>
                {notice.type === 'warning' && (
                  <p className="text-[11px] text-amber-300/70 mt-0.5 font-mono">
                    Los mods modificados o agregados requieren un reinicio completo del proceso del servidor para que NeoForge/Minecraft los aplique.
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {notice.type === 'warning' && (
                <GlassShimmerButton
                  variant="amber"
                  size="sm"
                  onClick={handleQuickRestart}
                  disabled={restarting}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${restarting ? 'animate-spin' : ''}`} />
                  <span>{restarting ? 'Reiniciando...' : 'Reiniciar Servidor'}</span>
                </GlassShimmerButton>
              )}
              <motion.button
                onClick={() => setNotice(null)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
            : 'border-slate-800 bg-dark-950/60 hover:border-slate-700 hover:bg-dark-900/60'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="w-10 h-10 mx-auto rounded-xl bg-slate-800/80 flex items-center justify-center text-emerald-400 mb-2 shadow-inner">
          <UploadCloud className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-white">
          Arrastra y suelta tus archivos <span className="font-mono text-emerald-400">.jar</span> aquí
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          O haz clic para seleccionar múltiples mods desde tu ordenador
        </p>
      </div>

      {/* Upload Progress bars if any */}
      {uploading && uploadStats && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-3">
          <span className="text-xs font-semibold text-emerald-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Subiendo archivos a server/mods/...</span>
            </div>
            <span className="text-slate-300 font-mono text-[11px]">
              {uploadStats.uploaded} de {uploadStats.total} mods cargados
            </span>
          </span>
          <div className="space-y-1">
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden relative">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300" 
                style={{ width: `${Math.max(5, (uploadStats.uploaded / uploadStats.total) * 100)}%` }} 
              />
            </div>
          </div>
        </div>
      )}

      {/* Filters with RareUI AnimatedTabs and search bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <AnimatedTabs
          tabs={[
            { id: 'all', label: 'Todos', badge: mods.length },
            { id: 'enabled', label: 'Activos', badge: enabledCount, icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> },
            { id: 'disabled', label: 'Inactivos', badge: disabledCount, icon: <XCircle className="w-3.5 h-3.5 text-rose-400" /> },
          ]}
          activeTab={filter}
          onChange={(id) => setFilter(id as any)}
          layoutId="mods-filter-tabs"
        />

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar por nombre..."
            className="w-full pl-9 pr-3 py-2 bg-dark-950 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>
      </div>

      {/* Mods List / Table */}
      <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-dark-950 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="p-3.5">Estado</th>
                <th className="p-3.5">Archivo / Mod</th>
                <th className="p-3.5">Tamaño</th>
                <th className="p-3.5">Modificación</th>
                <th className="p-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredMods.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No se encontraron mods que coincidan con la búsqueda
                  </td>
                </tr>
              ) : (
                filteredMods.map((mod) => {
                  const fileKey = mod.filename || mod.name;
                  const errorModNames = errorModName ? errorModName.split(',').map(n => n.trim()) : [];
                  const isErrorMod = errorModNames.some(name => 
                    mod.name.toLowerCase() === name || 
                    mod.filename.toLowerCase() === `${name}.jar` ||
                    mod.filename.toLowerCase().startsWith(`${name}-`) ||
                    mod.filename.toLowerCase().startsWith(`${name} `)
                  );
                  const isWarning = isErrorMod && telemetry?.crashDiagnostic?.severity === 'warning';
                  
                  return (
                    <tr key={fileKey} className={`transition-colors group ${
                      isErrorMod 
                        ? (isWarning ? 'bg-amber-500/10 hover:bg-amber-500/20' : 'bg-rose-500/10 hover:bg-rose-500/20') 
                        : 'hover:bg-slate-800/30'
                    }`}>
                      <td className="p-3.5">
                        {/* Toggle switch */}
                        <button
                          onClick={() => handleToggleMod(mod)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            mod.isEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                          }`}
                          title={mod.isEnabled ? 'Mod activo (.jar)' : 'Mod inactivo (.jar.disabled)'}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              mod.isEnabled ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`p-1.5 rounded-lg ${
                              isErrorMod
                                ? (isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400')
                                : mod.isEnabled
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-slate-800 text-slate-500'
                            }`}
                          >
                            <FileCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <span
                              className={`font-semibold text-xs flex items-center gap-2 ${
                                isErrorMod
                                  ? (isWarning ? 'text-amber-400' : 'text-rose-400')
                                  : mod.isEnabled
                                  ? 'text-white'
                                  : 'text-slate-400 line-through'
                              }`}
                            >
                              {mod.name}
                              {isErrorMod && (
                                <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] ${
                                  isWarning ? 'bg-amber-500/20 text-amber-300' : 'bg-rose-500/20 text-rose-300'
                                }`}>
                                  {isWarning ? 'Advertencia' : 'Error Detectado'}
                                </span>
                              )}
                            </span>
                            {mod.filename && mod.filename !== mod.name && (
                              <span className="text-[11px] font-mono text-slate-500 block">
                                {mod.filename}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 font-mono text-slate-400 text-[11px]">
                        {formatFileSize(mod.size)}
                      </td>

                      <td className="p-3.5 font-mono text-slate-500 text-[11px]">
                        {mod.modified}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <motion.button
                            onClick={() => {
                              setModToRename(mod);
                              setNewFilename(fileKey);
                            }}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                            title="Renombrar archivo"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </motion.button>

                          <motion.button
                            onClick={() => setModToDelete(mod)}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="Eliminar mod"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rename Modal */}
      <Modal
        isOpen={Boolean(modToRename)}
        onClose={() => setModToRename(null)}
        title="Renombrar Archivo de Mod"
      >
        <form onSubmit={handleRename} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Nombre del archivo</label>
            <input
              type="text"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              className="w-full px-3.5 py-2 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModToRename(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
            >
              Guardar Nuevo Nombre
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(modToDelete)}
        onClose={() => setModToDelete(null)}
        title="Eliminar Mod de Disco"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-300">
            ¿Estás seguro de que deseas eliminar permanentemente{' '}
            <strong className="text-rose-400 font-mono">{modToDelete?.filename || modToDelete?.name}</strong>? Esta acción no se puede deshacer.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setModToDelete(null)}
              className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Mod</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
