export type ServerState = 'online' | 'offline' | 'starting' | 'stopping' | 'crashed';

export interface Player {
  uuid: string;
  name: string;
  ping?: number;
  isOp?: boolean;
  connectedAt?: string;
}

export interface TelemetryData {
  isRunning: boolean;
  state: ServerState;
  pid: number | null;
  uptime: number; // in seconds
  cpu: {
    host: number; // percentage 0-100
    java: number; // percentage 0-100
  };
  ram: {
    used: number; // in MB
    total: number; // system total in MB
    maxAllocated: number; // Xmx in MB
  };
  disk: {
    used: number; // in GB
    total: number; // in GB
    free: number; // in GB
  };
  tps: {
    current: number;
    history: number[];
  };
  players: {
    online: number;
    max: number;
    list: Player[];
  };
  version: string;
}

export interface OpPlayer {
  uuid: string;
  name: string;
  level: number; // 1 to 4
  bypassesPlayerLimit: boolean;
}

export interface WhitelistPlayer {
  uuid: string;
  name: string;
}

export interface BannedPlayer {
  uuid: string;
  name: string;
  created: string;
  source: string;
  expires: string;
  reason: string;
}

export interface BannedIp {
  ip: string;
  created: string;
  source: string;
  expires: string;
  reason: string;
}

export interface ModFile {
  filename: string;
  name: string;
  size: number;
  modified: string;
  isEnabled: boolean;
}

export interface PlayitTunnel {
  id: string;
  name: string;
  proto: 'tcp' | 'udp';
  publicAddress: string;
  assignedDomain: string;
  publicPort: number;
  localPort: number;
}

export interface PlayitStatus {
  isRunning: boolean;
  pid: number | null;
  agentId?: string;
  tunnels: PlayitTunnel[];
  logs: string[];
}

export interface PathValidationStatus {
  server: boolean;
  mods: boolean;
  properties: boolean;
  logs: boolean;
  playit: boolean;
  scripts: boolean;
}

export interface PanelSettings {
  serverRootPath: string;
  validatedPaths: PathValidationStatus;
  autoRestartOnCrash: boolean;
  rconPort: number;
  rconHost: string;
  maxMemoryAllocated: string;
}

export interface UserSession {
  username: string;
  isAuthenticated: boolean;
}

// Version & Loader Types
export type ServerEngineType = 'neoforge' | 'vanilla';

export interface MinecraftRelease {
  id: string;
  type: 'release' | 'snapshot';
  releaseTime: string;
}

export interface LoaderRelease {
  version: string;
  mcVersion: string;
  isRecommended?: boolean;
}

export interface InstalledVersionInfo {
  isInstalled: boolean;
  serverType: ServerEngineType;
  mcVersion: string | null;
  loaderVersion: string | null;
  javaVersion: string | null;
  jarFile: string | null;
  eulaAccepted: boolean;
  installedAt?: string;
}

export interface InstallVersionPayload {
  serverType: ServerEngineType;
  mcVersion: string;
  loaderVersion?: string;
  javaVersion: string;
  acceptEula: boolean;
  ramInitial: string;
  ramMax: string;
}

// File Explorer Types
export interface FileItem {
  name: string;
  relativePath: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  extension: string;
}

export interface FilesResponse {
  currentPath: string;
  parentPath: string | null;
  items: FileItem[];
}

// Local Discovered NeoForge Version Item
export interface LocalNeoForgeItem {
  version: string;
  isInstalled: boolean;
  isActive: boolean;
  hasUnixArgs?: boolean;
  hasInstallerJar?: boolean;
  jarFileName?: string;
  source: string;
  modified?: string;
}
