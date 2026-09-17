import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { MotdEditor } from './MotdEditor';
import { AnimatedTabs } from '../../components/rareui/AnimatedTab';
import { RarePropertiesIcon } from '../../components/rareui/RareIcons';
import {
  Save,
  RotateCcw,
  Sparkles,
  Globe,
  Wifi,
  ShieldCheck,
  Code,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const PropertiesView: React.FC = () => {
  const [properties, setProperties] = useState<Record<string, any>>({});
  const [initialProperties, setInitialProperties] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<'world' | 'network' | 'rules' | 'motd' | 'raw'>('world');
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadProperties();
  }, []);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const data = await api.getProperties();
      setProperties(data);
      setInitialProperties(data);

      // Format raw text
      const raw = Object.entries(data)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      setRawText(raw);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al cargar server.properties' });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (key: string, value: any) => {
    setProperties((prev) => ({
      ...prev,
      [key]: value,
      ...(key === 'online-mode' && value === false ? { 'enforce-secure-profile': false } : {}),
    }));
  };

  const handleRawChange = (text: string) => {
    setRawText(text);
    // Parse raw text into properties object
    const lines = text.split('\n');
    const newProps: Record<string, any> = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const k = trimmed.substring(0, eqIdx).trim();
        const v = trimmed.substring(eqIdx + 1).trim();
        if (v === 'true') newProps[k] = true;
        else if (v === 'false') newProps[k] = false;
        else if (!isNaN(Number(v)) && v !== '') newProps[k] = Number(v);
        else newProps[k] = v;
      }
    }
    setProperties(newProps);
  };

  const handleSave = async () => {
    setSaving(true);
    setNotification(null);
    try {
      const res = await api.saveProperties(properties);
      setInitialProperties({ ...properties });
      // Update raw text as well
      const raw = Object.entries(properties)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n');
      setRawText(raw);
      setNotification({
        type: 'success',
        message: res.message || '¡server.properties guardado con éxito! Reinicia el servidor para aplicar cambios.',
      });
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al guardar la configuración' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setProperties({ ...initialProperties });
    const raw = Object.entries(initialProperties)
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    setRawText(raw);
    setNotification(null);
  };

  const tabs = [
    { id: 'world', label: 'Mundo y Juego', icon: Globe },
    { id: 'network', label: 'Red y Rendimiento', icon: Wifi },
    { id: 'rules', label: 'Reglas y Seguridad', icon: ShieldCheck },
    { id: 'motd', label: 'Editor de MOTD', icon: Sparkles },
    { id: 'raw', label: 'Modo Avanzado (Raw)', icon: Code },
  ];

  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center text-slate-400 text-xs">
        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p>Cargando server.properties...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header & Save Button */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <RarePropertiesIcon size={22} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-wide">Configuración del Servidor</h2>
            <p className="text-xs text-slate-400">Edición reactiva y atómica de server.properties</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleReset}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar</span>
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Guardar Cambios</span>
          </button>
        </div>
      </div>

      {/* Alert banner if exists */}
      {notification && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 border animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <div className="text-xs">
            <span className="font-semibold block">{notification.message}</span>
            {notification.type === 'success' && (
              <span className="text-slate-400 text-[11px] mt-0.5 block">
                Los cambios se han escrito atómicamente en disco con backup .bak creado.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Category Tabs with RareUI AnimatedTabs */}
      <AnimatedTabs
        tabs={tabs.map((t) => ({ id: t.id, label: t.label, icon: <t.icon className="w-4 h-4" /> }))}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as any)}
        layoutId="properties-tabs"
      />

      {properties['online-mode'] === false && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Modo no premium habilitado</p>
            <p className="text-amber-100/70 mt-0.5">El servidor no validará cuentas con los servicios oficiales. Usa una whitelist y no compartas la dirección del panel.</p>
          </div>
        </div>
      )}

      {/* Tab Panels */}
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-slate-800">
        {/* TAB 1: World & Gameplay */}
        {activeTab === 'world' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Modo de Juego Predeterminado</label>
              <select
                value={properties['gamemode'] || 'survival'}
                onChange={(e) => handleFieldChange('gamemode', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="survival">Supervivencia (Survival)</option>
                <option value="creative">Creativo (Creative)</option>
                <option value="adventure">Aventura (Adventure)</option>
                <option value="spectator">Espectador (Spectator)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Dificultad</label>
              <select
                value={properties['difficulty'] || 'normal'}
                onChange={(e) => handleFieldChange('difficulty', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="peaceful">Pacífico (Peaceful)</option>
                <option value="easy">Fácil (Easy)</option>
                <option value="normal">Normal</option>
                <option value="hard">Difícil (Hard)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Nombre del Nivel / Mundo</label>
              <input
                type="text"
                value={properties['level-name'] || 'world'}
                onChange={(e) => handleFieldChange('level-name', e.target.value)}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Semilla del Mundo (level-seed)</label>
              <input
                type="text"
                value={properties['level-seed'] || ''}
                onChange={(e) => handleFieldChange('level-seed', e.target.value)}
                placeholder="Dejar vacío para aleatoria"
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Modo Hardcore</span>
                <span className="text-[11px] text-slate-400 block">Muerte permanente y dificultad bloqueada en difícil</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['hardcore'])}
                onChange={(e) => handleFieldChange('hardcore', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Generar Estructuras</span>
                <span className="text-[11px] text-slate-400 block">Aldeas, fortalezas, templos y dungeons</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['generate-structures'] !== false)}
                onChange={(e) => handleFieldChange('generate-structures', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-slate-800 border-slate-700"
              />
            </div>
          </div>
        )}

        {/* TAB 2: Network & Performance */}
        {activeTab === 'network' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Puerto del Servidor (server-port)</label>
              <input
                type="number"
                value={properties['server-port'] || 25565}
                onChange={(e) => handleFieldChange('server-port', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Máximo de Jugadores (max-players)</label>
              <input
                type="number"
                value={properties['max-players'] || 20}
                onChange={(e) => handleFieldChange('max-players', Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Distancia de Renderizado (view-distance: {properties['view-distance'] || 10} chunks)</label>
              <input
                type="range"
                min="4"
                max="32"
                value={properties['view-distance'] || 10}
                onChange={(e) => handleFieldChange('view-distance', Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Distancia de Simulación (simulation-distance: {properties['simulation-distance'] || 10} chunks)</label>
              <input
                type="range"
                min="4"
                max="16"
                value={properties['simulation-distance'] || 10}
                onChange={(e) => handleFieldChange('simulation-distance', Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Combate Jugador vs Jugador (PvP)</span>
                <span className="text-[11px] text-slate-400 block">Permitir daño directo entre jugadores</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['pvp'] !== false)}
                onChange={(e) => handleFieldChange('pvp', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Permitir Vuelo (allow-flight)</span>
                <span className="text-[11px] text-slate-400 block">Evita kicks por velocidad excesiva con elytra/mods</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['allow-flight'])}
                onChange={(e) => handleFieldChange('allow-flight', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>
          </div>
        )}

        {/* TAB 3: Rules & Security */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Modo Online (online-mode)</span>
                <span className="text-[11px] text-slate-400 block">Verifica cuentas contra servidores oficiales de Mojang</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['online-mode'] !== false)}
                onChange={(e) => handleFieldChange('online-mode', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Lista Blanca (white-list)</span>
                <span className="text-[11px] text-slate-400 block">Solo jugadores en whitelist.json pueden ingresar</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['white-list'])}
                onChange={(e) => handleFieldChange('white-list', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Habilitar Nether (allow-nether)</span>
                <span className="text-[11px] text-slate-400 block">Permite teletransporte y generación del inframundo</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['allow-nether'] !== false)}
                onChange={(e) => handleFieldChange('allow-nether', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-dark-950 border border-slate-800">
              <div>
                <span className="text-xs font-semibold text-white block">Bloques de Comandos (enable-command-block)</span>
                <span className="text-[11px] text-slate-400 block">Permite ejecución automática de comandos en el mundo</span>
              </div>
              <input
                type="checkbox"
                checked={Boolean(properties['enable-command-block'])}
                onChange={(e) => handleFieldChange('enable-command-block', e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500"
              />
            </div>
          </div>
        )}

        {/* TAB 4: MOTD Editor */}
        {activeTab === 'motd' && (
          <MotdEditor
            value={properties['motd'] || ''}
            onChange={(newMotd) => handleFieldChange('motd', newMotd)}
          />
        )}

        {/* TAB 5: Raw Editor */}
        {activeTab === 'raw' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Edición directa del archivo plano</span>
              <span className="font-mono text-emerald-400">server.properties</span>
            </div>
            <textarea
              rows={18}
              value={rawText}
              onChange={(e) => handleRawChange(e.target.value)}
              className="w-full p-4 bg-dark-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 leading-relaxed focus:outline-none focus:border-emerald-500 shadow-inner"
              spellCheck={false}
            />
          </div>
        )}
      </div>
    </div>
  );
};
