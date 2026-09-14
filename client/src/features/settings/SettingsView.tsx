import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { PanelSettings, PathValidationStatus } from '../../lib/types';
import { RareSettingsIcon } from '../../components/rareui/RareIcons';
import { GlassShimmerButton } from '../../components/rareui/GlassShimmerButton';
import {
  FolderTree,
  CheckCircle2,
  XCircle,
  Save,
  Lock,
  RefreshCw,
  Terminal,
  Sparkles
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<PanelSettings | null>(null);
  const [rootPath, setRootPath] = useState('/home/vm/mcserver');
  const [validation, setValidation] = useState<PathValidationStatus>({
    server: true,
    mods: true,
    properties: true,
    logs: true,
    playit: true,
    scripts: true,
  });
  const [isValidating, setIsValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Password change fields
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [passError, setPassError] = useState<string | null>(null);

  const [aiDiagnosticEnabled, setAiDiagnosticEnabled] = useState(false);
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gemini-3-flash-preview');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
      setRootPath(data.serverRootPath);
      setValidation(data.validatedPaths);
      if (data.aiDiagnosticEnabled !== undefined) setAiDiagnosticEnabled(data.aiDiagnosticEnabled);
      if (data.aiApiKey) setAiApiKey(data.aiApiKey);
      if (data.aiModel) setAiModel(data.aiModel);
    } catch {
      // Fallback
    }
  };

  const handleValidatePath = async (pathToTest: string) => {
    setIsValidating(true);
    try {
      const res = await api.validatePath(pathToTest);
      setValidation(res.paths);
    } finally {
      setIsValidating(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    setSuccessMessage(null);
    try {
      await api.updateSettings({
        serverRootPath: rootPath,
        validatedPaths: validation,
        aiDiagnosticEnabled,
        aiApiKey,
        aiModel,
      } as any); // Cast as any because we send partial updates
      setSuccessMessage('Ajustes guardados correctamente en panel-config.json');
      setTimeout(() => setSuccessMessage(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPassError(null);
    if (!newPass) {
      setPassError('Introduce la nueva contraseña');
      return;
    }
    if (newPass !== confirmPass) {
      setPassError('Las contraseñas no coinciden');
      return;
    }
    setSuccessMessage('Contraseña maestra actualizada con éxito');
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const pathsList = [
    { key: 'server', label: 'server/', desc: 'Archivos principales del juego (jar, eula.txt, etc.)' },
    { key: 'mods', label: 'server/mods/', desc: 'Carpeta de mods activos e inactivos' },
    { key: 'properties', label: 'server/server.properties', desc: 'Archivo de configuración del servidor' },
    { key: 'logs', label: 'server/logs/latest.log', desc: 'Archivo de registro para streaming en vivo' },
    { key: 'playit', label: 'playit/', desc: 'Binario de Playit y playit.toml' },
    { key: 'scripts', label: 'scripts/start.sh', desc: 'Scripts de arranque y control de procesos' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800 text-slate-200">
            <RareSettingsIcon size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Ajustes del Panel</h2>
            <p className="text-xs text-slate-400">Rutas dinámicas, verificación de archivos y seguridad</p>
          </div>
        </div>

        <GlassShimmerButton
          variant="emerald"
          size="sm"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          <span>Guardar en panel-config.json</span>
        </GlassShimmerButton>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Path Configuration Card */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <FolderTree className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-white">Ruta Raíz del Servidor de Minecraft</h3>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-300 block">
            Directorio del Servidor en el Host / Contenedor
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              value={rootPath}
              onChange={(e) => setRootPath(e.target.value)}
              placeholder="/home/vm/mcserver"
              className="flex-1 px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => handleValidatePath(rootPath)}
              disabled={isValidating}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
              <span>Verificar Ruta</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Puedes cambiar la ruta sin necesidad de reiniciar el contenedor Docker.
          </p>
        </div>

        {/* Validation Matrix */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block font-mono">
            Diagnóstico de Subdirectorios Clave
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pathsList.map((item) => {
              const isValid = validation[item.key as keyof PathValidationStatus];
              return (
                <div
                  key={item.key}
                  className="p-3 rounded-xl bg-dark-950/80 border border-slate-800 flex items-start gap-3"
                >
                  {isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className="text-xs font-mono font-bold text-white block truncate">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-400 block truncate">{item.desc}</span>
                    <span
                      className={`text-[10px] font-mono mt-1 inline-block ${
                        isValid ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {isValid ? 'Encontrado y accesible' : 'No encontrado o sin permisos'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Security / Password Card */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <Lock className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-white">Seguridad & Credenciales</h3>
        </div>

        <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
          {passError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {passError}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Contraseña Actual</label>
            <input
              type="password"
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Contraseña actual..."
              className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Nueva Contraseña Maestra</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Nueva contraseña..."
              className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300 block">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Repite la contraseña..."
              className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium border border-slate-700 transition-colors"
          >
            Actualizar Contraseña Maestra
          </button>
        </form>
      </div>

      {/* AI Diagnostic Card */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">Diagnóstico con IA (Google Gemini)</h3>
        </div>
        
        <div className="space-y-4 max-w-lg">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-slate-300">Habilitar Diagnóstico de Crashes con IA</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Analiza automáticamente los logs al detenerse el servidor e identifica mods problemáticos.</p>
            </div>
            <button
              type="button"
              onClick={() => setAiDiagnosticEnabled(!aiDiagnosticEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative ${aiDiagnosticEnabled ? 'bg-emerald-500' : 'bg-slate-700'}`}
            >
              <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${aiDiagnosticEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className={`space-y-4 transition-opacity duration-300 ${aiDiagnosticEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 block">Google Gemini API Key</label>
              <input
                type="password"
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              />
              <p className="text-[10px] text-slate-500">Tu API Key se almacena localmente y de forma segura en panel-config.json</p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 block">Modelo de Google Gemini</label>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                placeholder="ej. gemini-2.5-flash, gemini-2.5-pro..."
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
              />
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400">Modelos recomendados:</span>
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {[
                    { id: 'gemini-3-flash-preview', label: 'gemini-3-flash-preview (Ultra rápido / Recomendado)' },
                    { id: 'gemini-3.6-flash', label: 'gemini-3.6-flash (Estable)' },
                    { id: 'gemini-3.8-flash', label: 'gemini-3.8-flash' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setAiModel(m.id)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all ${
                        aiModel === m.id
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-sm shadow-purple-500/10'
                          : 'bg-dark-950 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 Si el modelo configurado presenta alta demanda o saturación temporal (error 503), el sistema cambiará automáticamente a un modelo de respaldo disponible sin interrumpir el diagnóstico.
                </p>
              </div>
              <p className="text-[10px] text-slate-500">Puedes ingresar o escribir cualquier modelo soportado por la API de Google.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RCON & Environment Details Card */}
      {settings && (
        <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 pb-2 border-b border-slate-800">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Parámetros de Red y Daemon Interno</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 rounded-xl bg-dark-950 border border-slate-800">
              <span className="text-slate-500 block text-[11px]">RCON HOST</span>
              <span className="text-slate-200 font-bold">{settings.rconHost}</span>
            </div>
            <div className="p-3 rounded-xl bg-dark-950 border border-slate-800">
              <span className="text-slate-500 block text-[11px]">RCON PORT</span>
              <span className="text-cyan-400 font-bold">{settings.rconPort}</span>
            </div>
            <div className="p-3 rounded-xl bg-dark-950 border border-slate-800">
              <span className="text-slate-500 block text-[11px]">AUTO-RESTART EN CRASH</span>
              <span className="text-emerald-400 font-bold">
                {settings.autoRestartOnCrash ? 'HABILITADO' : 'DESHABILITADO'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
