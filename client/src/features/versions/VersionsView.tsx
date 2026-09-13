import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api';
import {
  LocalNeoForgeItem,
  InstalledVersionInfo,
  MinecraftRelease,
} from '../../lib/types';
import { AnimatedTabs } from '../../components/rareui/AnimatedTab';
import { RareVersionsIcon, RareTerminalIcon } from '../../components/rareui/RareIcons';
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Upload,
  Cpu,
  Terminal,
  HardDrive,
  FileBox,
  Check,
  Zap,
  Info,
} from 'lucide-react';

export const VersionsView: React.FC = () => {
  const [engineTab, setEngineTab] = useState<'neoforge' | 'minecraft'>('neoforge');

  // Local NeoForge on disk
  const [localNeoForge, setLocalNeoForge] = useState<{
    versions: LocalNeoForgeItem[];
    activeVersion: string | null;
  }>({ versions: [], activeVersion: null });
  const [loadingLocal, setLoadingLocal] = useState(true);
  const [activatingVersion, setActivatingVersion] = useState<string | null>(null);

  // File Upload State
  const [uploadingJar, setUploadingJar] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minecraft Official Versions & Console
  const [installedInfo, setInstalledInfo] = useState<InstalledVersionInfo | null>(null);
  const [mcReleases, setMcReleases] = useState<MinecraftRelease[]>([]);
  const [loadingMc, setLoadingMc] = useState(false);
  const [selectedVanillaVersion, setSelectedVanillaVersion] = useState('1.21.1');
  const [ramInitial, setRamInitial] = useState('4096M');
  const [ramMax, setRamMax] = useState('8192M');
  const [acceptEula, setAcceptEula] = useState(true);
  const [installingVanilla, setInstallingVanilla] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string | null>(null);
  const [executingCommand, setExecutingCommand] = useState(false);

  useEffect(() => {
    loadLocalNeoForge();
    loadInstalledMetadata();
    loadMojangReleases();
  }, []);

  const loadLocalNeoForge = async () => {
    setLoadingLocal(true);
    try {
      const data = await api.getLocalNeoForgeVersions();
      setLocalNeoForge(data);
    } catch (err: any) {
      console.error('Error loading local NeoForge versions:', err);
    } finally {
      setLoadingLocal(false);
    }
  };

  const loadInstalledMetadata = async () => {
    try {
      const data = await api.getInstalledVersion();
      setInstalledInfo(data);
    } catch {
      setInstalledInfo(null);
    }
  };

  const loadMojangReleases = async () => {
    setLoadingMc(true);
    try {
      const versions = await api.getAvailableMinecraftVersions();
      setMcReleases(versions || []);
      if (versions && versions.length > 0) {
        setSelectedVanillaVersion(versions[0].id);
      }
    } catch (err) {
      console.warn('Could not fetch Mojang versions:', err);
    } finally {
      setLoadingMc(false);
    }
  };

  const handleActivateNeoForge = async (version: string) => {
    setActivatingVersion(version);
    try {
      await api.setActiveNeoForgeVersion(version);
      await loadLocalNeoForge();
      await loadInstalledMetadata();
      setUploadMessage({
        type: 'success',
        text: `¡Versión NeoForge ${version} activada con éxito en scripts/start.sh!`,
      });
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.message || `No se pudo activar la versión ${version}`,
      });
    } finally {
      setActivatingVersion(null);
    }
  };

  const handleJarFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.jar')) {
      alert('Solo se admiten archivos con extensión .jar');
      return;
    }

    setUploadingJar(true);
    setUploadMessage(null);

    try {
      const res = await api.uploadNeoForgeJar(file);
      setUploadMessage({
        type: 'success',
        text: `Archivo ${file.name} subido correctamente. Versión detectada y activada: ${res.version}`,
      });
      await loadLocalNeoForge();
      await loadInstalledMetadata();
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.message || 'Error al subir el archivo .jar de NeoForge',
      });
    } finally {
      setUploadingJar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRunConsoleVersionCommand = async () => {
    setExecutingCommand(true);
    setConsoleOutput(null);
    try {
      await api.sendCommand('version');
      setConsoleOutput('Comando "/version" enviado a la consola del servidor. Revisa los logs en Consola en Vivo.');
    } catch (err: any) {
      setConsoleOutput(`Error al enviar comando: ${err.message || 'Servidor desconectado'}`);
    } finally {
      setExecutingCommand(false);
    }
  };

  const handleInstallVanilla = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptEula) {
      alert('Debes aceptar el EULA de Mojang para instalar.');
      return;
    }

    setInstallingVanilla(true);
    try {
      const res = await api.installServerVersion({
        serverType: 'vanilla',
        mcVersion: selectedVanillaVersion,
        javaVersion: 'Java 21 (JDK 21 LTS)',
        acceptEula,
        ramInitial,
        ramMax,
      });
      setUploadMessage({
        type: 'success',
        text: res.message || `Minecraft Vanilla ${selectedVanillaVersion} iniciado para instalación.`,
      });
      await loadInstalledMetadata();
    } catch (err: any) {
      setUploadMessage({
        type: 'error',
        text: err.message || 'Error al instalar Vanilla Minecraft',
      });
    } finally {
      setInstallingVanilla(false);
    }
  };

  const tabs = [
    { id: 'neoforge', label: 'Motor NeoForge (Local & Archivos .JAR)', icon: <RareVersionsIcon size={16} /> },
    { id: 'minecraft', label: 'Versión de Minecraft (Mojang & Consola)', icon: <Cpu size={16} /> },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header Banner */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <RareVersionsIcon size={26} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
              <span>Gestión de Versiones de NeoForge & Minecraft</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold border border-emerald-500/30">
                Raíz Real del Servidor
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Detecta versiones instaladas en disco, sube archivos .jar de NeoForge y administra la versión activa
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            loadLocalNeoForge();
            loadInstalledMetadata();
          }}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-2 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingLocal ? 'animate-spin' : ''}`} />
          <span>Escanear Raíz</span>
        </button>
      </div>

      {/* Notification Banner */}
      {uploadMessage && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-xs font-medium transition-all ${
            uploadMessage.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {uploadMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{uploadMessage.text}</span>
          </div>
          <button
            onClick={() => setUploadMessage(null)}
            className="text-slate-400 hover:text-white px-2 py-0.5 text-[11px] rounded bg-slate-800/60"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Active Version Overview Card */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800 relative overflow-hidden bg-gradient-to-r from-dark-900 via-dark-900/90 to-dark-950">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center border ${
                localNeoForge.activeVersion || installedInfo?.isInstalled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
            >
              <RareVersionsIcon size={28} />
            </div>

            <div>
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">
                Versión NeoForge Activa en Ejecución
              </span>
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2 mt-0.5">
                {localNeoForge.activeVersion ? (
                  <>
                    <span className="text-emerald-400 font-mono font-black">
                      NeoForge {localNeoForge.activeVersion}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      HABILITADA (Única Activa)
                    </span>
                  </>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1.5 text-sm font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    No hay versión de NeoForge activada todavía en server/
                  </span>
                )}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Objetivo scripts/start.sh:</span>
            <span className="px-2.5 py-1 rounded-lg bg-dark-950 border border-slate-800 text-emerald-400">
              {localNeoForge.activeVersion ? `neoforge/${localNeoForge.activeVersion}` : 'default'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <AnimatedTabs
        tabs={tabs}
        activeTab={engineTab}
        onChange={(id) => setEngineTab(id as 'neoforge' | 'minecraft')}
        layoutId="versions-tab-selector"
      />

      {/* TAB 1: NEOFORGE (DISCO LOCAL & SUBIDA DE JAR) */}
      {engineTab === 'neoforge' && (
        <div className="space-y-6">
          {/* Rule Reminder Info */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-slate-200">
                Regla de Versiones de NeoForge en el Servidor:
              </p>
              <p className="text-slate-400 leading-relaxed">
                En el servidor pueden coexistir múltiples carpetas o instaladores de NeoForge, pero <strong>solo UNA versión está habilitada a la vez</strong>.
                Si subes una nueva versión (por ejemplo <code>21.1.20</code> teniendo antes <code>21.1.12</code>), el sistema <strong>usará automáticamente la versión recién instalada</strong>, o puedes alternar manualmente la que desees activar con un solo clic.
              </p>
            </div>
          </div>

          {/* Subir archivo .jar de NeoForge */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Subir Archivo .JAR de NeoForge</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sube un archivo instalador oficial (ej. <code>neoforge-21.1.20-installer.jar</code>) o jar de servidor para activarlo automáticamente.
                </p>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer ${
                uploadingJar
                  ? 'border-emerald-500 bg-emerald-950/20'
                  : 'border-slate-700/80 hover:border-emerald-500/70 hover:bg-slate-900/40 bg-dark-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".jar"
                className="hidden"
                onChange={handleJarFileSelected}
                disabled={uploadingJar}
              />

              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                {uploadingJar ? (
                  <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                ) : (
                  <FileBox className="w-6 h-6 text-emerald-400" />
                )}
              </div>

              <div className="text-center space-y-1">
                <p className="text-xs font-semibold text-slate-200">
                  {uploadingJar ? 'Subiendo e instalando versión de NeoForge...' : 'Haz clic para seleccionar o arrastra un archivo .jar aquí'}
                </p>
                <p className="text-[11px] text-slate-400 font-mono">
                  Admite archivos .jar de instaladores o ejecutables de servidor NeoForge
                </p>
              </div>

              {!uploadingJar && (
                <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium hover:bg-emerald-500/20">
                  Seleccionar Archivo .jar
                </span>
              )}
            </div>
          </div>

          {/* Versiones de NeoForge detectadas en la raíz del servidor */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-emerald-400" />
                  <span>Versiones de NeoForge Detectadas en la Raíz</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Archivos y librerías encontradas físicamente en <code>server/libraries/net/neoforged/neoforge/</code> o en la raíz
                </p>
              </div>

              <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-dark-950 text-slate-300 border border-slate-800">
                {localNeoForge.versions.length} {localNeoForge.versions.length === 1 ? 'versión' : 'versiones'} en disco
              </span>
            </div>

            {loadingLocal ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                <RefreshCw className="w-6 h-6 animate-spin text-emerald-400" />
                <span className="text-xs font-mono">Escaneando directorio del servidor...</span>
              </div>
            ) : localNeoForge.versions.length === 0 ? (
              <div className="p-8 rounded-xl bg-dark-950/60 border border-slate-800 text-center space-y-2">
                <RareVersionsIcon size={32} className="mx-auto text-slate-600" />
                <p className="text-xs text-slate-300 font-medium">
                  No se encontraron versiones de NeoForge instaladas todavía.
                </p>
                <p className="text-[11px] text-slate-500">
                  Sube un instalador <code>.jar</code> arriba para comenzar o instala una versión.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {localNeoForge.versions.map((ver) => {
                  const isActive = ver.isActive;
                  const isBusy = activatingVersion === ver.version;

                  return (
                    <div
                      key={ver.version}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-4 ${
                        isActive
                          ? 'bg-emerald-950/30 border-emerald-500/50 shadow-lg shadow-emerald-950/40'
                          : 'bg-dark-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-mono">
                              NeoForge {ver.version}
                            </span>
                            {isActive && (
                              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                                <Check className="w-3 h-3 text-emerald-400" />
                                ACTIVA
                              </span>
                            )}
                          </div>

                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-dark-900 border border-slate-800 text-slate-400">
                            {ver.source === 'libraries' ? 'Librería Instalada' : 'Archivo .jar'}
                          </span>
                        </div>

                        <div className="space-y-1 text-[11px] font-mono text-slate-400">
                          {ver.hasUnixArgs && (
                            <div className="flex items-center gap-1.5 text-emerald-400/90">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>unix_args.txt disponible para arranque</span>
                            </div>
                          )}
                          {ver.jarFileName && (
                            <div className="text-slate-400 truncate">
                              Archivo: <span className="text-slate-200">{ver.jarFileName}</span>
                            </div>
                          )}
                          {ver.modified && (
                            <div className="text-slate-500 text-[10px]">
                              Modificado: {new Date(ver.modified).toLocaleString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {isActive ? 'En ejecución por start.sh' : 'Inactiva (Disponible para activar)'}
                        </span>

                        {isActive ? (
                          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-mono font-semibold flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" />
                            <span>En Uso</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleActivateNeoForge(ver.version)}
                            disabled={isBusy}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-950 cursor-pointer disabled:opacity-50"
                          >
                            {isBusy ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Zap className="w-3.5 h-3.5" />
                            )}
                            <span>{isBusy ? 'Activando...' : 'Activar Esta Versión'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MINECRAFT & COMANDOS DE CONSOLA */}
      {engineTab === 'minecraft' && (
        <div className="space-y-6">
          {/* Comprobador de versión por Consola (/version) */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>Consultar Versión en Consola de Minecraft</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ejecuta comandos de consulta directamente en la consola interactiva del servidor en vivo
                </p>
              </div>

              <button
                onClick={handleRunConsoleVersionCommand}
                disabled={executingCommand}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
              >
                {executingCommand ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RareTerminalIcon size={16} />
                )}
                <span>Ejecutar "/version"</span>
              </button>
            </div>

            {consoleOutput && (
              <div className="p-3.5 rounded-xl bg-dark-950 border border-slate-800 font-mono text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{consoleOutput}</span>
              </div>
            )}
          </div>

          {/* Versiones oficiales de Mojang en la Web */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span>Versiones Oficiales de Mojang (Vanilla)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Obtenidas en tiempo real desde la API de Mojang. Puedes instalar una versión Vanilla oficial como alternativa.
                </p>
              </div>

              <span className="text-xs font-mono text-slate-400">
                {loadingMc ? 'Cargando de Mojang...' : `${mcReleases.length} versiones cargadas`}
              </span>
            </div>

            <form onSubmit={handleInstallVanilla} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase">
                    Versión de Minecraft Oficial
                  </label>
                  <select
                    value={selectedVanillaVersion}
                    onChange={(e) => setSelectedVanillaVersion(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700/80 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 font-mono cursor-pointer"
                  >
                    {mcReleases.map((v) => (
                      <option key={v.id} value={v.id}>
                        Minecraft {v.id} ({v.type}) - {v.releaseTime?.substring(0, 10)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 font-mono uppercase">
                    Asignación de Memoria RAM
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={ramInitial}
                      onChange={(e) => setRamInitial(e.target.value)}
                      placeholder="4096M"
                      className="px-3 py-2 bg-dark-950 border border-slate-700/80 rounded-xl text-xs font-mono text-white"
                    />
                    <input
                      type="text"
                      value={ramMax}
                      onChange={(e) => setRamMax(e.target.value)}
                      placeholder="8192M"
                      className="px-3 py-2 bg-dark-950 border border-slate-700/80 rounded-xl text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-dark-950/80 border border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptEula}
                    onChange={(e) => setAcceptEula(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-0 focus:ring-offset-0 bg-dark-900 border-slate-700"
                  />
                  <span>Acepto el Contrato de Licencia de Usuario Final (EULA) de Mojang</span>
                </label>

                <button
                  type="submit"
                  disabled={installingVanilla}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {installingVanilla ? 'Descargando Vanilla...' : `Instalar Vanilla ${selectedVanillaVersion}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
