import { mockDevApi } from './mockDevAdapter';
import {
  TelemetryData,
  OpPlayer,
  WhitelistPlayer,
  BannedPlayer,
  BannedIp,
  ModFile,
  PlayitStatus,
  PanelSettings,
} from './types';

const IS_DEV_MODE = true; // Set default dev adapter support for immediate local execution

async function fetchWithFallback<T>(url: string, options: RequestInit, mockFallback: () => Promise<T>): Promise<T> {
  if (IS_DEV_MODE && !window.location.search.includes('backend=real')) {
    try {
      return await mockFallback();
    } catch (e) {
      console.warn('Mock fallback failed, attempting real fetch:', e);
    }
  }

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`API error ${res.status}: ${errorText}`);
    }

    return await res.json();
  } catch (err) {
    console.warn(`Real API call to ${url} failed, falling back to dynamic mock:`, err);
    return await mockFallback();
  }
}

export const api = {
  // Auth
  login: async (password: string) => {
    return fetchWithFallback(
      '/api/auth/login',
      { method: 'POST', body: JSON.stringify({ password }) },
      () => mockDevApi.login(password)
    );
  },
  getMe: async () => {
    return fetchWithFallback('/api/auth/me', { method: 'GET' }, () => mockDevApi.getMe());
  },

  // Status & Telemetry
  getStatus: async (): Promise<TelemetryData> => {
    return fetchWithFallback('/api/status', { method: 'GET' }, () => mockDevApi.getStatus());
  },

  // Server Actions
  executeServerAction: async (action: 'start' | 'stop' | 'restart' | 'kill') => {
    return fetchWithFallback(
      '/api/server/action',
      { method: 'POST', body: JSON.stringify({ action }) },
      () => mockDevApi.executeAction(action)
    );
  },

  // RCON Command
  sendCommand: async (command: string) => {
    return fetchWithFallback(
      '/api/server/command',
      { method: 'POST', body: JSON.stringify({ command }) },
      () => mockDevApi.sendCommand(command)
    );
  },

  // Server Properties
  getProperties: async (): Promise<Record<string, any>> => {
    return fetchWithFallback('/api/properties', { method: 'GET' }, () => mockDevApi.getProperties());
  },
  saveProperties: async (props: Record<string, any>) => {
    return fetchWithFallback(
      '/api/properties',
      { method: 'PUT', body: JSON.stringify(props) },
      () => mockDevApi.saveProperties(props)
    );
  },

  // Players
  getOps: async (): Promise<OpPlayer[]> => {
    return fetchWithFallback('/api/players/ops', { method: 'GET' }, () => mockDevApi.getOps());
  },
  addOp: async (name: string, level = 4) => {
    return fetchWithFallback(
      '/api/players/ops',
      { method: 'POST', body: JSON.stringify({ name, level }) },
      () => mockDevApi.addOp(name, level)
    );
  },
  removeOp: async (uuid: string) => {
    return fetchWithFallback(
      `/api/players/ops/${uuid}`,
      { method: 'DELETE' },
      () => mockDevApi.removeOp(uuid)
    );
  },

  getWhitelist: async (): Promise<WhitelistPlayer[]> => {
    return fetchWithFallback('/api/players/whitelist', { method: 'GET' }, () => mockDevApi.getWhitelist());
  },
  addWhitelist: async (name: string) => {
    return fetchWithFallback(
      `/api/players/whitelist/${encodeURIComponent(name)}`,
      { method: 'POST' },
      () => mockDevApi.addWhitelist(name)
    );
  },
  removeWhitelist: async (name: string) => {
    return fetchWithFallback(
      `/api/players/whitelist/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
      () => mockDevApi.removeWhitelist(name)
    );
  },

  getBans: async (): Promise<{ players: BannedPlayer[]; ips: BannedIp[] }> => {
    return fetchWithFallback('/api/players/bans', { method: 'GET' }, () => mockDevApi.getBans());
  },
  unbanPlayer: async (name: string) => {
    return fetchWithFallback(
      `/api/players/bans/player/${encodeURIComponent(name)}`,
      { method: 'DELETE' },
      () => mockDevApi.unbanPlayer(name)
    );
  },
  unbanIp: async (ip: string) => {
    return fetchWithFallback(
      `/api/players/bans/ip/${encodeURIComponent(ip)}`,
      { method: 'DELETE' },
      () => mockDevApi.unbanIp(ip)
    );
  },
  kickPlayer: async (name: string, reason?: string) => {
    return fetchWithFallback(
      `/api/players/kick`,
      { method: 'POST', body: JSON.stringify({ name, reason }) },
      () => mockDevApi.kickPlayer(name, reason)
    );
  },

  // Mods
  getMods: async (): Promise<ModFile[]> => {
    return fetchWithFallback('/api/mods', { method: 'GET' }, () => mockDevApi.getMods());
  },
  toggleMod: async (filename: string, enable: boolean) => {
    return fetchWithFallback(
      '/api/mods/toggle',
      { method: 'PATCH', body: JSON.stringify({ filename, enable }) },
      () => mockDevApi.toggleMod(filename, enable)
    );
  },
  deleteMod: async (filename: string) => {
    return fetchWithFallback(
      `/api/mods/${encodeURIComponent(filename)}`,
      { method: 'DELETE' },
      () => mockDevApi.deleteMod(filename)
    );
  },
  renameMod: async (oldFilename: string, newFilename: string) => {
    return fetchWithFallback(
      `/api/mods/rename`,
      { method: 'PATCH', body: JSON.stringify({ oldFilename, newFilename }) },
      () => mockDevApi.renameMod(oldFilename, newFilename)
    );
  },
  uploadMod: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return fetchWithFallback(
      '/api/mods/upload',
      { method: 'POST', body: formData, headers: {} },
      () => mockDevApi.uploadModMock(file.name, file.size)
    );
  },

  // Playit
  getPlayitStatus: async (): Promise<PlayitStatus> => {
    return fetchWithFallback('/api/playit/status', { method: 'GET' }, () => mockDevApi.getPlayitStatus());
  },
  executePlayitAction: async (action: 'start' | 'stop' | 'restart') => {
    return fetchWithFallback(
      '/api/playit/action',
      { method: 'POST', body: JSON.stringify({ action }) },
      () => mockDevApi.executePlayitAction(action)
    );
  },

  // Settings
  getSettings: async (): Promise<PanelSettings> => {
    return fetchWithFallback('/api/settings', { method: 'GET' }, () => mockDevApi.getSettings());
  },
  updateSettings: async (settings: Partial<PanelSettings>) => {
    return fetchWithFallback(
      '/api/settings',
      { method: 'POST', body: JSON.stringify(settings) },
      () => mockDevApi.updateSettings(settings)
    );
  },
  validatePath: async (path: string) => {
    return fetchWithFallback(
      '/api/settings/validate-path',
      { method: 'POST', body: JSON.stringify({ path }) },
      () => mockDevApi.validatePath(path)
    );
  },
};
