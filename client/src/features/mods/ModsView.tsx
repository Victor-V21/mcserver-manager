import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';

export const ModsView: React.FC = () => {
  const [mods, setMods] = useState<ModFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modals
  const [modToDelete, setModToDelete] = useState<ModFile | null>(null);
  const [modToRename, setModToRename] = useState<ModFile | null>(null);
  const [newFilename, setNewFilename] = useState('');

  useEffect(() => {
    loadMods();
  }, []);

  const loadMods = async () => {
    setLoading(true);
    try {
      const data = await api.getMods();
      setMods(data);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleMod = async (mod: ModFile) => {
    const nextState = !mod.isEnabled;
    await api.toggleMod(mod.filename, nextState);
    loadMods();
  };

  const handleDelete = async () => {
    if (!modToDelete) return;
    await api.deleteMod(modToDelete.filename);
    setModToDelete(null);
    loadMods();
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modToRename || !newFilename.trim()) return;
    await api.renameMod(modToRename.filename, newFilename.trim());
    setModToRename(null);
    setNewFilename('');
    loadMods();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.jar') && !file.name.endsWith('.jar.disabled')) {
        continue;
      }
      setUploadProgress((prev) => ({ ...prev, [file.name]: 30 }));
      await new Promise((r) => setTimeout(r, 200));
      setUploadProgress((prev) => ({ ...prev, [file.name]: 75 }));
      await api.uploadMod(file);
      setUploadProgress((prev) => ({ ...prev, [file.name]: 100 }));
    }

    await new Promise((r) => setTimeout(r, 400));
    setUploading(false);
    setUploadProgress({});
    loadMods();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const filteredMods = mods.filter((mod) => {
    const matchesSearch =
      mod.name.toLowerCase().includes(search.toLowerCase()) ||
      mod.filename.toLowerCase().includes(search.toLowerCase());
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
      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            <span>Subiendo archivos a server/mods/...</span>
          </span>
          {Object.entries(uploadProgress).map(([fileName, pct]) => (
            <div key={fileName} className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-400">
                <span className="truncate max-w-xs">{fileName}</span>
                <span>{pct}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
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
                filteredMods.map((mod) => (
                  <tr key={mod.filename} className="hover:bg-slate-800/30 transition-colors group">
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
                            mod.isEnabled
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          <FileCheck className="w-4 h-4" />
                        </div>
                        <div>
                          <span
                            className={`font-semibold text-xs block ${
                              mod.isEnabled ? 'text-white' : 'text-slate-400 line-through'
                            }`}
                          >
                            {mod.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 block">
                            {mod.filename}
                          </span>
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
                        <button
                          onClick={() => {
                            setModToRename(mod);
                            setNewFilename(mod.filename);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                          title="Renombrar archivo"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setModToDelete(mod)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar mod"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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
            <strong className="text-rose-400 font-mono">{modToDelete?.filename}</strong>? Esta acción no se puede deshacer.
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
