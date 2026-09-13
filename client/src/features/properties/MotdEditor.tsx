import React from 'react';
import { Palette, Sparkles } from 'lucide-react';

interface MotdEditorProps {
  value: string;
  onChange: (val: string) => void;
}

const COLOR_CODES: Array<{ code: string; name: string; hex: string; isFormat?: boolean }> = [
  { code: '§0', name: 'Black', hex: '#000000' },
  { code: '§1', name: 'Dark Blue', hex: '#0000AA' },
  { code: '§2', name: 'Dark Green', hex: '#00AA00' },
  { code: '§3', name: 'Dark Aqua', hex: '#00AAAA' },
  { code: '§4', name: 'Dark Red', hex: '#AA0000' },
  { code: '§5', name: 'Dark Purple', hex: '#AA00AA' },
  { code: '§6', name: 'Gold', hex: '#FFAA00' },
  { code: '§7', name: 'Gray', hex: '#AAAAAA' },
  { code: '§8', name: 'Dark Gray', hex: '#555555' },
  { code: '§9', name: 'Blue', hex: '#5555FF' },
  { code: '§a', name: 'Green', hex: '#55FF55' },
  { code: '§b', name: 'Aqua', hex: '#55FFFF' },
  { code: '§c', name: 'Red', hex: '#FF5555' },
  { code: '§d', name: 'Light Purple', hex: '#FF55FF' },
  { code: '§e', name: 'Yellow', hex: '#FFFF55' },
  { code: '§f', name: 'White', hex: '#FFFFFF' },
  { code: '§l', name: 'Bold', hex: '#FFFFFF', isFormat: true },
  { code: '§o', name: 'Italic', hex: '#FFFFFF', isFormat: true },
  { code: '§r', name: 'Reset', hex: '#FFFFFF', isFormat: true },
];

export const MotdEditor: React.FC<MotdEditorProps> = ({ value, onChange }) => {
  const insertCode = (code: string) => {
    onChange(value + code);
  };

  // Convert Minecraft formatting codes (§ or &) into HTML spans
  const parseMinecraftFormatting = (text: string) => {
    if (!text) return null;

    // Normalize & to §
    const normalized = text.replace(/&([0-9a-fk-or])/gi, '§$1');
    const parts = normalized.split(/(§[0-9a-fk-or])/gi);

    let currentColor = '#FFFFFF';
    let isBold = false;
    let isItalic = false;

    return parts.map((part, idx) => {
      if (part.startsWith('§')) {
        const char = part[1].toLowerCase();
        const found = COLOR_CODES.find((c) => c.code.toLowerCase() === `§${char}`);
        if (found) {
          if (found.code === '§r') {
            currentColor = '#FFFFFF';
            isBold = false;
            isItalic = false;
          } else if (found.code === '§l') {
            isBold = true;
          } else if (found.code === '§o') {
            isItalic = true;
          } else {
            currentColor = found.hex;
          }
        }
        return null;
      }

      return (
        <span
          key={idx}
          style={{
            color: currentColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
          }}
        >
          {part}
        </span>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Visual Live Preview in authentic Minecraft multiplayer server list style */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Previsualización en la Lista de Servidores de Minecraft</span>
        </label>
        
        <div className="p-4 rounded-xl bg-black/90 border border-slate-700/80 shadow-2xl flex items-start gap-3 select-none">
          {/* Default Server Icon */}
          <div className="w-12 h-12 rounded bg-slate-800 border border-slate-600 flex items-center justify-center shrink-0 shadow">
            <span className="text-xl">⛏️</span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white font-mono tracking-wide">
                Minecraft Server (NeoForge)
              </span>
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400">
                <span>4/20</span>
                <span className="text-xs">📶</span>
              </div>
            </div>

            {/* Rendered MOTD */}
            <div className="mt-1 text-xs mc-font whitespace-pre-line leading-relaxed min-h-[38px] bg-slate-950/60 p-2 rounded border border-slate-800/80">
              {parseMinecraftFormatting(value) || <span className="text-slate-500 italic">Sin MOTD configurado</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Color code palette buttons */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-cyan-400" />
            <span>Códigos de Color y Formato (§)</span>
          </span>
          <span className="text-[11px] text-slate-400">Haz clic para insertar</span>
        </div>

        <div className="flex flex-wrap gap-1.5 p-2.5 rounded-xl bg-dark-950 border border-slate-800">
          {COLOR_CODES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => insertCode(c.code)}
              className="px-2 py-1 rounded-md text-[11px] font-mono border border-slate-700 hover:border-slate-500 transition-all flex items-center gap-1.5 bg-slate-900"
              title={`${c.name} (${c.code})`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block border border-slate-600 shrink-0"
                style={{ backgroundColor: c.hex }}
              />
              <span className="text-slate-300 font-semibold">{c.code}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Input textarea */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-300 block">Texto del MOTD</label>
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="§a§l★ NeoForge Server ★\n§b¡Entra y juega con nosotros!"
          className="w-full px-3.5 py-2.5 bg-dark-950 border border-slate-700 rounded-xl text-xs sm:text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors resize-y"
        />
        <p className="text-[11px] text-slate-400">
          Puedes usar <code className="text-emerald-400 font-mono">§</code> o <code className="text-emerald-400 font-mono">&</code> seguidos del código para colorear el texto. Usa saltos de línea para la segunda fila.
        </p>
      </div>
    </div>
  );
};
