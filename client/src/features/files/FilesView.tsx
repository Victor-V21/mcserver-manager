import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { FileItem } from '../../lib/types';
import { RareFilesIcon } from '../../components/rareui/RareIcons';
import { RetroPixelButton } from '../../components/rareui/RetroPixelButton';
import {
  Folder,
  FileText,
  FileCode,
  FileArchive,
  Upload,
  FolderPlus,
  RefreshCw,
  Trash2,
  Edit3,
  ChevronRight,
  ArrowUp,
  Save,
  X,
  AlertTriangle,
} from 'lucide-react';

export const FilesView: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string | null>(null);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor Modal State
  const [editingFile, setEditingFile] = useState<{ path: string; name: string; content: string } | null>(null);
  const [savingFile, setSavingFile] = useState(false);

  // New Folder Modal State
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  // Rename Modal State
  const [renamingItem, setRenamingItem] = useState<{ path: string; oldName: string; newName: string } | null>(null);

  // Delete Confirmation State
  const [deletingItem, setDeletingItem] = useState<FileItem | null>(null);

  useEffect(() => {
    loadDirectory(currentPath);
  }, [currentPath]);

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getFiles(path);
      setCurrentPath(res.currentPath);
      setParentPath(res.parentPath);
      setItems(res.items);
    } catch (err: any) {
      setError(err.message || 'Error al listar directorio');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenFile = async (item: FileItem) => {
    if (item.isDirectory) {
      setCurrentPath(item.relativePath);
      return;
    }

    const editableExtensions = ['txt', 'properties', 'json', 'log', 'sh', 'toml', 'yml', 'yaml', 'cfg'];
    if (editableExtensions.includes(item.extension) || item.size < 500 * 1024) {
      try {
        const res = await api.getFileContent(item.relativePath);
        setEditingFile({ path: item.relativePath, name: item.name, content: res.content });
      } catch (err: any) {
        alert(err.message || 'No se pudo abrir el archivo');
      }
    } else {
      alert(`El archivo ${item.name} es un archivo binario o excede el tamaño máximo permitido para edición.`);
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    setSavingFile(true);
    try {
      await api.saveFileContent(editingFile.path, editingFile.content);
      setEditingFile(null);
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Error al guardar archivo');
    } finally {
      setSavingFile(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      await api.createDirectory(currentPath, newFolderName.trim());
      setShowNewFolderModal(false);
      setNewFolderName('');
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Error al crear carpeta');
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingItem || !renamingItem.newName.trim()) return;
    try {
      await api.renameItem(renamingItem.path, renamingItem.newName.trim());
      setRenamingItem(null);
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Error al renombrar');
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await api.deleteItem(deletingItem.relativePath);
      setDeletingItem(null);
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Error al eliminar');
    }
  };

  const handleUploadFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      await api.uploadFiles(currentPath, Array.from(files));
      loadDirectory(currentPath);
    } catch (err: any) {
      alert(err.message || 'Error al subir archivos');
    } finally {
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '-';
    const units = ['B', 'KB', 'MB', 'GB'];
    let val = bytes;
    let unitIdx = 0;
    while (val >= 1024 && unitIdx < units.length - 1) {
      val /= 1024;
      unitIdx++;
    }
    return `${val.toFixed(1)} ${units[unitIdx]}`;
  };

  const getFileIcon = (item: FileItem) => {
    if (item.isDirectory) return <Folder className="w-5 h-5 text-amber-400 shrink-0" />;
    switch (item.extension) {
      case 'jar':
        return <FileArchive className="w-5 h-5 text-emerald-400 shrink-0" />;
      case 'sh':
      case 'bat':
      case 'json':
      case 'properties':
      case 'toml':
      case 'yml':
        return <FileCode className="w-5 h-5 text-cyan-400 shrink-0" />;
      case 'log':
      case 'txt':
        return <FileText className="w-5 h-5 text-slate-300 shrink-0" />;
      default:
        return <FileText className="w-5 h-5 text-slate-400 shrink-0" />;
    }
  };

  const breadcrumbParts = currentPath ? currentPath.split('/').filter(Boolean) : [];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <RareFilesIcon size={24} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Explorador de Archivos</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                Raíz del Servidor
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Navega, inspecciona, edita y administra los archivos y directorios de tu servidor
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors">
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Subir Archivo</span>
            <input type="file" multiple className="hidden" onChange={handleUploadFiles} />
          </label>

          <button
            onClick={() => setShowNewFolderModal(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>Nueva Carpeta</span>
          </button>

          <button
            onClick={() => loadDirectory(currentPath)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Breadcrumbs Navigation */}
      <div className="glass-panel rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto py-1">
          <button
            onClick={() => setCurrentPath('')}
            className={`px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors ${
              currentPath === '' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            raiz (server_root)
          </button>

          {breadcrumbParts.map((part, index) => {
            const pathUpToPart = breadcrumbParts.slice(0, index + 1).join('/');
            const isLast = index === breadcrumbParts.length - 1;
            return (
              <React.Fragment key={pathUpToPart}>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <button
                  onClick={() => setCurrentPath(pathUpToPart)}
                  className={`px-2 py-1 rounded-lg hover:bg-slate-800 transition-colors ${
                    isLast ? 'text-emerald-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  {part}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        {parentPath !== null && (
          <button
            onClick={() => setCurrentPath(parentPath)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 text-[11px] shrink-0"
            title="Subir un nivel"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Subir nivel</span>
          </button>
        )}
      </div>

      {/* Files and Folders List */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
            <span className="text-xs font-mono">Cargando directorio...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-amber-400 flex flex-col items-center gap-2">
            <AlertTriangle className="w-6 h-6" />
            <span className="text-xs font-semibold">{error}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-mono text-xs">
            Esta carpeta está vacía.
          </div>
        ) : (
          <div className="divide-y divide-slate-800/80">
            {items.map((item) => (
              <div
                key={item.relativePath}
                className="p-3.5 sm:px-5 flex items-center justify-between gap-4 hover:bg-slate-800/40 transition-colors group"
              >
                <div
                  onClick={() => handleOpenFile(item)}
                  className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                >
                  {getFileIcon(item)}
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-emerald-300 transition-colors truncate block font-mono">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono block sm:hidden">
                      {item.isDirectory ? 'Carpeta' : formatFileSize(item.size)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
                  <span className="hidden sm:inline w-20 text-right">
                    {item.isDirectory ? '-' : formatFileSize(item.size)}
                  </span>
                  <span className="hidden md:inline w-36 text-right text-[11px] text-slate-500">
                    {new Date(item.modified).toLocaleDateString()} {new Date(item.modified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {!item.isDirectory && (
                      <button
                        onClick={() => handleOpenFile(item)}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition-colors"
                        title="Ver / Editar"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setRenamingItem({ path: item.relativePath, oldName: item.name, newName: item.name })}
                      className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors"
                      title="Renombrar"
                    >
                      <span className="text-xs font-semibold px-1">Aa</span>
                    </button>

                    <button
                      onClick={() => setDeletingItem(item)}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-sm font-bold text-white font-mono">{editingFile.name}</h3>
                  <span className="text-[10px] text-slate-400 font-mono">{editingFile.path}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RetroPixelButton
                  onClick={handleSaveFile}
                  disabled={savingFile}
                  variant="emerald"
                  size="sm"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {savingFile ? 'GUARDANDO...' : 'GUARDAR'}
                </RetroPixelButton>
                <button
                  onClick={() => setEditingFile(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 bg-dark-950 overflow-hidden">
              <textarea
                value={editingFile.content}
                onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
                className="w-full h-[60vh] bg-transparent text-emerald-300 font-mono text-xs sm:text-sm p-2 outline-none resize-none leading-relaxed selection:bg-emerald-500/30"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-800 p-5 space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-cyan-400" />
              Nueva Carpeta
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nombre de la carpeta..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-950 border border-slate-700 text-xs text-white font-mono outline-none focus:border-emerald-500"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewFolderModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {renamingItem && (
        <div className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-800 p-5 space-y-4 animate-fadeIn">
            <h3 className="text-sm font-bold text-white font-mono">Renombrar Elemento</h3>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                type="text"
                value={renamingItem.newName}
                onChange={(e) => setRenamingItem({ ...renamingItem, newName: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-dark-950 border border-slate-700 text-xs text-white font-mono outline-none focus:border-emerald-500"
                autoFocus
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenamingItem(null)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  Guardar Nombre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-dark-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-red-500/30 p-5 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-sm font-bold text-white">¿Eliminar {deletingItem.isDirectory ? 'carpeta' : 'archivo'}?</h3>
            </div>
            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente <strong>{deletingItem.name}</strong>? Esta acción no se puede deshacer.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
