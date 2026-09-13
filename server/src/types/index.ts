export interface PanelConfig {
  rootPath: string;
  port: number;
  jwtSecret: string;
  passwordHash: string;
  initialSetupDone: boolean;
}

export interface ServerStatusResponse {
  isRunning: boolean;
  pid: number | null;
  status: 'online' | 'offline' | 'starting' | 'stopping';
  cpu: number;
  hostCpu: number;
  ram: {
    used: number;
    total: number;
    percent: number;
  };
  disk: {
    used: number;
    total: number;
    percent: number;
  };
  uptime: number;
  tps: number;
  players: {
    online: number;
    max: number;
    list: PlayerInfo[];
  };
}

export interface PlayerInfo {
  name: string;
  uuid?: string;
  isOp?: boolean;
  opLevel?: number;
  avatarUrl?: string;
}

export interface ModItem {
  name: string;
  size: number;
  modified: string;
  isEnabled: boolean;
}

export interface PlayitStatus {
  isRunning: boolean;
  pid: number | null;
  tunnels: PlayitTunnel[];
  publicAddress?: string;
  logs: string[];
}

export interface PlayitTunnel {
  id: string;
  tunnelType: string;
  publicAddress: string;
  port: number;
}

export interface McVersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: {
    id: string;
    type: 'release' | 'snapshot';
    url: string;
    releaseTime: string;
  }[];
}

export interface InstalledVersionInfo {
  installed: boolean;
  mcVersion?: string;
  loader?: 'neoforge' | 'vanilla';
  loaderVersion?: string;
  javaVersion?: string;
  allocatedRamMin?: string;
  allocatedRamMax?: string;
  eulaAccepted: boolean;
  serverJarFound: boolean;
  runScriptFound: boolean;
}
