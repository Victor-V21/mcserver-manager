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

// In-memory state for development mock
let isServerRunning = true;
let serverState: 'online' | 'offline' | 'starting' | 'stopping' | 'crashed' = 'online';
let serverPid: number | null = 24890;
let serverUptime = 38450; // seconds

let playersList = [
  { uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5', name: 'Notch', ping: 24, isOp: true, connectedAt: '2026-09-13 13:45' },
  { uuid: '853c80ef-3c37-49fd-aa49-938b674acd16', name: 'jeb_', ping: 48, isOp: false, connectedAt: '2026-09-13 14:02' },
  { uuid: '616ab5b0-c1c4-4b49-be0c-b26a6e2e2a22', name: 'Steve', ping: 32, isOp: false, connectedAt: '2026-09-13 14:10' },
  { uuid: 'ec561538-f3fd-461d-ac58-6c101a5084c5', name: 'Alex', ping: 55, isOp: false, connectedAt: '2026-09-13 14:15' },
];

let opsData: OpPlayer[] = [
  { uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5', name: 'Notch', level: 4, bypassesPlayerLimit: true },
  { uuid: '853c80ef-3c37-49fd-aa49-938b674acd16', name: 'jeb_', level: 3, bypassesPlayerLimit: false },
];

let whitelistData: WhitelistPlayer[] = [
  { uuid: '069a79f4-44e9-4726-a5be-fca90e38aaf5', name: 'Notch' },
  { uuid: '853c80ef-3c37-49fd-aa49-938b674acd16', name: 'jeb_' },
  { uuid: '616ab5b0-c1c4-4b49-be0c-b26a6e2e2a22', name: 'Steve' },
  { uuid: 'ec561538-f3fd-461d-ac58-6c101a5084c5', name: 'Alex' },
];

let bannedPlayersData: BannedPlayer[] = [
  {
    uuid: '4566e69f-c907-48ee-8d71-d7ba5aa00d20',
    name: 'Griefer99',
    created: '2026-09-10 18:22:00',
    source: 'Server Admin',
    expires: 'forever',
    reason: 'Uso de X-Ray y fly hacks en spawn',
  },
];

let bannedIpsData: BannedIp[] = [
  {
    ip: '192.168.1.199',
    created: '2026-09-10 18:25:00',
    source: 'Console',
    expires: 'forever',
    reason: 'IP vinculada a cuentas bot',
  },
];

let modsData: ModFile[] = [
  { filename: 'jei-1.21.1-forge-19.21.0.jar', name: 'Just Enough Items (JEI)', size: 1450200, modified: '2026-09-11 12:30', isEnabled: true },
  { filename: 'journeymap-1.21.1-neoforge.jar', name: 'JourneyMap Realtime', size: 4890100, modified: '2026-09-11 12:31', isEnabled: true },
  { filename: 'ironchest-1.21.1-15.0.1.jar', name: 'Iron Chests: Restocked', size: 840000, modified: '2026-09-11 12:32', isEnabled: true },
  { filename: 'create-1.21.1-v0.6.jar.disabled', name: 'Create Mod Automation', size: 18900400, modified: '2026-09-12 09:15', isEnabled: false },
  { filename: 'appleskin-forge-mc1.21.1.jar', name: 'AppleSkin Food HUD', size: 420000, modified: '2026-09-11 12:35', isEnabled: true },
  { filename: 'curios-forge-9.0.0.jar', name: 'Curios API', size: 1240000, modified: '2026-09-11 12:35', isEnabled: true },
  { filename: 'biomesoplenty-1.21.1.jar.disabled', name: 'Biomes O Plenty Worldgen', size: 12400000, modified: '2026-09-10 16:40', isEnabled: false },
];

let serverProperties: Record<string, any> = {
  'gamemode': 'survival',
  'difficulty': 'normal',
  'hardcore': false,
  'level-seed': '184920492817402',
  'level-name': 'world_neoforge',
  'generate-structures': true,
  'server-port': 25565,
  'max-players': 20,
  'view-distance': 12,
  'simulation-distance': 10,
  'pvp': true,
  'allow-flight': false,
  'spawn-protection': 16,
  'white-list': false,
  'online-mode': true,
  'enable-command-block': true,
  'allow-nether': true,
  'motd': '§a§l★ NeoForge Server 1.21.1 ★ §r\n§bServidor Oficial - ¡Bienvenido!',
  'enable-rcon': true,
  'rcon.port': 25575,
  'rcon.password': 'supersecretpass',
  'server-ip': '',
  'max-tick-time': 60000,
  'sync-chunk-writes': true,
};

let playitRunning = true;
let playitLogs: string[] = [
  '[playit] 2026-09-13 13:40:01 INFO starting playit-cli v0.15.26',
  '[playit] 2026-09-13 13:40:02 INFO loaded config from /home/vm/mcserver/playit/playit.toml',
  '[playit] 2026-09-13 13:40:03 INFO connected to tunnel server (Miami-01, ping 18ms)',
  '[playit] 2026-09-13 13:40:04 INFO active tunnel: minecraft-survival => play.mcserver.gl.joinmc.link:38491 (local 127.0.0.1:25565 TCP)',
  '[playit] 2026-09-13 13:40:05 INFO tunnel healthy, accepting connections',
];

let settingsData: PanelSettings = {
  serverRootPath: '/home/vm/mcserver',
  validatedPaths: {
    server: true,
    mods: true,
    properties: true,
    logs: true,
    playit: true,
    scripts: true,
  },
  autoRestartOnCrash: true,
  rconPort: 25575,
  rconHost: '127.0.0.1',
  maxMemoryAllocated: '8192M',
};

// Console log generator
export const mockConsoleSubscribers = new Set<(msg: string) => void>();

export function emitMockLog(message: string) {
  mockConsoleSubscribers.forEach((cb) => cb(message));
}

// Periodic background log ticker
setInterval(() => {
  if (!isServerRunning) return;
  const time = new Date().toLocaleTimeString('es-ES', { hour12: false });
  const logVariants = [
    `\x1b[32m[${time} INFO] [minecraft/DedicatedServer]: Time is now 12400 ticks\x1b[0m`,
    `\x1b[36m[${time} INFO] [neoforge/ServerLifecycle]: Autosave completed (world_neoforge)\x1b[0m`,
    `\x1b[32m[${time} INFO] [minecraft/PlayerList]: Players online: ${playersList.length} / 20\x1b[0m`,
    `\x1b[37m[${time} DEBUG] [rcon/Telemetry]: TPS: 20.0, Memory free: 3820 MB\x1b[0m`,
  ];
  const chosen = logVariants[Math.floor(Math.random() * logVariants.length)];
  emitMockLog(chosen);
}, 6000);

export const mockDevApi = {
  // Auth
  login: async (password: string) => {
    await new Promise((r) => setTimeout(r, 400));
    if (password === 'admin' || password === 'minecraft' || password.length > 0) {
      return { success: true, token: 'mock-jwt-token-production-ready' };
    }
    throw new Error('Credenciales inválidas');
  },
  getMe: async () => {
    return { username: 'admin', isAuthenticated: true };
  },

  // Status & Telemetry
  getStatus: async (): Promise<TelemetryData> => {
    // Dynamic subtle fluctuation
    const baseCpu = isServerRunning ? 18 + Math.floor(Math.random() * 12) : 1;
    const javaCpu = isServerRunning ? 24 + Math.floor(Math.random() * 18) : 0;
    const ramUsed = isServerRunning ? 4200 + Math.floor(Math.random() * 450) : 120;
    const currentTps = isServerRunning ? +(19.7 + Math.random() * 0.3).toFixed(1) : 0;

    return {
      isRunning: isServerRunning,
      state: serverState,
      pid: serverPid,
      uptime: isServerRunning ? ++serverUptime : 0,
      cpu: {
        host: baseCpu,
        java: javaCpu,
      },
      ram: {
        used: ramUsed,
        total: 16384,
        maxAllocated: 8192,
      },
      disk: {
        used: 34.8,
        total: 120.0,
        free: 85.2,
      },
      tps: {
        current: currentTps,
        history: [19.8, 19.9, 20.0, 19.7, 20.0, 20.0, 19.9, 20.0, currentTps],
      },
      players: {
        online: isServerRunning ? playersList.length : 0,
        max: Number(serverProperties['max-players']) || 20,
        list: isServerRunning ? [...playersList] : [],
      },
      version: 'NeoForge 1.21.1 (Build 21.1.65)',
    };
  },

  // Server Actions
  executeAction: async (action: 'start' | 'stop' | 'restart' | 'kill') => {
    const time = new Date().toLocaleTimeString('es-ES', { hour12: false });
    if (action === 'start') {
      serverState = 'starting';
      emitMockLog(`\x1b[33m[${time} INFO] [panel/daemon]: Executing /home/vm/mcserver/scripts/start.sh...\x1b[0m`);
      emitMockLog(`\x1b[36m[${time} INFO] [neoforge/ServerLifecycle]: Starting Minecraft server version 1.21.1\x1b[0m`);
      await new Promise((r) => setTimeout(r, 1200));
      isServerRunning = true;
      serverState = 'online';
      serverPid = 24890;
      emitMockLog(`\x1b[32m[${time} INFO] [minecraft/DedicatedServer]: Done! For help, type "help"\x1b[0m`);
      return { success: true, message: 'Servidor iniciado correctamente' };
    }
    if (action === 'stop') {
      serverState = 'stopping';
      emitMockLog(`\x1b[33m[${time} INFO] [panel/rcon]: Sent /stop to server process...\x1b[0m`);
      emitMockLog(`\x1b[33m[${time} INFO] [minecraft/DedicatedServer]: Stopping server and saving chunks...\x1b[0m`);
      await new Promise((r) => setTimeout(r, 1000));
      isServerRunning = false;
      serverState = 'offline';
      serverPid = null;
      emitMockLog(`\x1b[31m[${time} INFO] [panel/daemon]: Server process terminated cleanly (exit code 0)\x1b[0m`);
      return { success: true, message: 'Servidor detenido suavemente' };
    }
    if (action === 'restart') {
      serverState = 'starting';
      emitMockLog(`\x1b[33m[${time} INFO] [panel/daemon]: Restart requested. Stopping process...\x1b[0m`);
      await new Promise((r) => setTimeout(r, 800));
      emitMockLog(`\x1b[36m[${time} INFO] [panel/daemon]: Spawning new Java instance...\x1b[0m`);
      isServerRunning = true;
      serverState = 'online';
      serverPid = 24912;
      emitMockLog(`\x1b[32m[${time} INFO] [minecraft/DedicatedServer]: Server restarted and ready\x1b[0m`);
      return { success: true, message: 'Servidor reiniciado' };
    }
    if (action === 'kill') {
      isServerRunning = false;
      serverState = 'offline';
      serverPid = null;
      emitMockLog(`\x1b[31;1m[${time} ALERT] [panel/daemon]: SIGKILL sent to PID 24890. Process killed.\x1b[0m`);
      return { success: true, message: 'Proceso detenido forzosamente (SIGKILL)' };
    }
    return { success: false, message: 'Acción desconocida' };
  },

  // Command Execution (RCON)
  sendCommand: async (command: string) => {
    const time = new Date().toLocaleTimeString('es-ES', { hour12: false });
    emitMockLog(`\x1b[35m> ${command}\x1b[0m`);

    const clean = command.trim().toLowerCase();
    if (clean === 'list') {
      emitMockLog(
        `\x1b[32m[${time} INFO] There are ${playersList.length} of a max of ${serverProperties['max-players']} players online: ${playersList.map((p) => p.name).join(', ')}\x1b[0m`
      );
    } else if (clean === 'tps' || clean === 'forge tps') {
      emitMockLog(`\x1b[32m[${time} INFO] Dim 0 (Overworld): Mean tick time: 14.2ms. Mean TPS: 20.0\x1b[0m`);
      emitMockLog(`\x1b[32m[${time} INFO] Overall: Mean tick time: 15.1ms. Mean TPS: 20.0\x1b[0m`);
    } else if (clean.startsWith('say ')) {
      const msg = command.substring(4);
      emitMockLog(`\x1b[35m[Server] ${msg}\x1b[0m`);
    } else if (clean === 'save-all') {
      emitMockLog(`\x1b[32m[${time} INFO] Saving the game (all world chunks and player data)...\x1b[0m`);
      emitMockLog(`\x1b[32m[${time} INFO] Saved the game\x1b[0m`);
    } else {
      emitMockLog(`\x1b[32m[${time} INFO] Executed command "${command}" via RCON.\x1b[0m`);
    }
    return { success: true };
  },

  // Properties
  getProperties: async () => {
    return { ...serverProperties };
  },
  saveProperties: async (newProps: Record<string, any>) => {
    serverProperties = { ...newProps };
    return { success: true, message: 'server.properties guardado con éxito. Se recomienda reiniciar.' };
  },

  // Players
  getOps: async () => [...opsData],
  addOp: async (name: string, level = 4) => {
    const uuid = `mock-uuid-${Date.now()}`;
    const newOp: OpPlayer = { uuid, name, level, bypassesPlayerLimit: false };
    opsData.push(newOp);
    return newOp;
  },
  removeOp: async (uuid: string) => {
    opsData = opsData.filter((op) => op.uuid !== uuid);
    return { success: true };
  },

  getWhitelist: async () => [...whitelistData],
  addWhitelist: async (name: string) => {
    const newEntry: WhitelistPlayer = { uuid: `wl-uuid-${Date.now()}`, name };
    whitelistData.push(newEntry);
    return newEntry;
  },
  removeWhitelist: async (name: string) => {
    whitelistData = whitelistData.filter((w) => w.name.toLowerCase() !== name.toLowerCase());
    return { success: true };
  },

  getBans: async () => ({
    players: [...bannedPlayersData],
    ips: [...bannedIpsData],
  }),
  unbanPlayer: async (name: string) => {
    bannedPlayersData = bannedPlayersData.filter((b) => b.name.toLowerCase() !== name.toLowerCase());
    return { success: true };
  },
  unbanIp: async (ip: string) => {
    bannedIpsData = bannedIpsData.filter((b) => b.ip !== ip);
    return { success: true };
  },
  kickPlayer: async (name: string, reason = 'Kicked by administrator') => {
    playersList = playersList.filter((p) => p.name.toLowerCase() !== name.toLowerCase());
    const time = new Date().toLocaleTimeString('es-ES', { hour12: false });
    emitMockLog(`\x1b[33m[${time} INFO] Kicked player ${name}: ${reason}\x1b[0m`);
    return { success: true };
  },

  // Mods
  getMods: async () => [...modsData],
  toggleMod: async (filename: string, enable: boolean) => {
    const mod = modsData.find((m) => m.filename === filename);
    if (mod) {
      mod.isEnabled = enable;
      if (enable && mod.filename.endsWith('.disabled')) {
        mod.filename = mod.filename.replace('.disabled', '');
      } else if (!enable && !mod.filename.endsWith('.disabled')) {
        mod.filename = `${mod.filename}.disabled`;
      }
    }
    return { success: true };
  },
  deleteMod: async (filename: string) => {
    modsData = modsData.filter((m) => m.filename !== filename);
    return { success: true };
  },
  renameMod: async (oldFilename: string, newFilename: string) => {
    const mod = modsData.find((m) => m.filename === oldFilename);
    if (mod) {
      mod.filename = newFilename;
      mod.name = newFilename.replace('.jar', '').replace('.disabled', '');
    }
    return { success: true };
  },
  uploadModMock: async (fileName: string, size: number) => {
    const newMod: ModFile = {
      filename: fileName,
      name: fileName.replace('.jar', ''),
      size: size,
      modified: new Date().toISOString().substring(0, 16).replace('T', ' '),
      isEnabled: true,
    };
    modsData.push(newMod);
    return newMod;
  },

  // Playit
  getPlayitStatus: async (): Promise<PlayitStatus> => {
    return {
      isRunning: playitRunning,
      pid: playitRunning ? 1839 : null,
      agentId: 'playit-agent-77df98a1',
      tunnels: playitRunning
        ? [
            {
              id: 'tun-mc-01',
              name: 'Minecraft Java Server',
              proto: 'tcp',
              publicAddress: '147.185.221.19',
              assignedDomain: 'play.mcserver.gl.joinmc.link',
              publicPort: 38491,
              localPort: 25565,
            },
          ]
        : [],
      logs: [...playitLogs],
    };
  },
  executePlayitAction: async (action: 'start' | 'stop' | 'restart') => {
    if (action === 'start') {
      playitRunning = true;
      playitLogs.push(`[playit] ${new Date().toISOString()} INFO playit-cli started manually`);
      return { success: true, message: 'Túnel Playit iniciado' };
    }
    if (action === 'stop') {
      playitRunning = false;
      playitLogs.push(`[playit] ${new Date().toISOString()} WARN playit-cli process stopped`);
      return { success: true, message: 'Túnel Playit detenido' };
    }
    if (action === 'restart') {
      playitRunning = true;
      playitLogs.push(`[playit] ${new Date().toISOString()} INFO playit-cli restarted`);
      return { success: true, message: 'Túnel Playit reiniciado' };
    }
    return { success: false, message: 'Acción no válida' };
  },

  // Settings
  getSettings: async () => ({ ...settingsData }),
  updateSettings: async (newSettings: Partial<PanelSettings>) => {
    settingsData = { ...settingsData, ...newSettings };
    return { success: true, settings: settingsData };
  },
  validatePath: async (path: string) => {
    const isValid = path.startsWith('/home/vm');
    return {
      exists: isValid,
      paths: {
        server: isValid,
        mods: isValid,
        properties: isValid,
        logs: isValid,
        playit: isValid,
        scripts: isValid,
      },
    };
  },
};
