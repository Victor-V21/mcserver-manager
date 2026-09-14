import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import axios from 'axios';
import { ConfigService } from './config.service';
import { SUBDIRS } from '../config/constants';

export interface OpEntry {
  uuid: string;
  name: string;
  level: number;
  bypassesPlayerLimit: boolean;
}

export interface WhitelistEntry {
  uuid: string;
  name: string;
}

export interface BanEntry {
  uuid?: string;
  name?: string;
  ip?: string;
  created: string;
  source: string;
  expires: string;
  reason: string;
}

export class PlayersService {
  private static instance: PlayersService;
  private configService: ConfigService;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): PlayersService {
    if (!PlayersService.instance) {
      PlayersService.instance = new PlayersService();
    }
    return PlayersService.instance;
  }

  private readJsonFile<T>(relativePath: string, defaultValue: T): T {
    const filePath = this.configService.resolvePath(relativePath);
    if (!fs.existsSync(filePath)) {
      return defaultValue;
    }
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.warn(`Error reading ${relativePath}:`, err);
      return defaultValue;
    }
  }

  private writeJsonFile<T>(relativePath: string, data: T): void {
    const filePath = this.configService.resolvePath(relativePath);
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, `${filePath}.bak`);
      } catch (err) {
        console.warn(`Failed to create backup of ${relativePath}:`, err);
      }
    }

    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  public async resolvePlayerUuid(username: string): Promise<{ uuid: string; name: string }> {
    try {
      const res = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`, {
        timeout: 3000,
      });
      if (res.data && res.data.id) {
        // Format Mojang hex UUID into standard 8-4-4-4-12 UUID format
        const id = res.data.id;
        const formatted = `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
        return { uuid: formatted, name: res.data.name || username };
      }
    } catch (err) {
      // Mojang API failed or rate-limited; fallback to offline player UUID
    }

    // Generate offline UUID (v3 MD5 of "OfflinePlayer:" + username)
    const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`).digest();
    // set version to 3 and variant to RFC 4122
    hash[6] = (hash[6] & 0x0f) | 0x30;
    hash[8] = (hash[8] & 0x3f) | 0x80;
    const hex = hash.toString('hex');
    const offlineUuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
    return { uuid: offlineUuid, name: username };
  }

  // --- OPS ---
  public getOps(): OpEntry[] {
    return this.readJsonFile<OpEntry[]>(SUBDIRS.OPS, []);
  }

  public async addOp(name: string, level: number = 4): Promise<OpEntry> {
    const resolved = await this.resolvePlayerUuid(name);
    const ops = this.getOps();
    const existingIdx = ops.findIndex((o) => o.uuid === resolved.uuid || o.name.toLowerCase() === name.toLowerCase());

    const entry: OpEntry = {
      uuid: resolved.uuid,
      name: resolved.name,
      level: Math.max(1, Math.min(4, level)),
      bypassesPlayerLimit: false,
    };

    if (existingIdx !== -1) {
      ops[existingIdx] = entry;
    } else {
      ops.push(entry);
    }

    this.writeJsonFile(SUBDIRS.OPS, ops);
    return entry;
  }

  public removeOp(uuidOrName: string): boolean {
    const ops = this.getOps();
    const filtered = ops.filter((o) => o.uuid !== uuidOrName && o.name.toLowerCase() !== uuidOrName.toLowerCase());
    if (filtered.length !== ops.length) {
      this.writeJsonFile(SUBDIRS.OPS, filtered);
      return true;
    }
    return false;
  }

  // --- WHITELIST ---
  public getWhitelist(): WhitelistEntry[] {
    return this.readJsonFile<WhitelistEntry[]>(SUBDIRS.WHITELIST, []);
  }

  public async addWhitelist(name: string): Promise<WhitelistEntry> {
    const resolved = await this.resolvePlayerUuid(name);
    const whitelist = this.getWhitelist();
    const existing = whitelist.find((w) => w.uuid === resolved.uuid || w.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      return existing;
    }

    const entry: WhitelistEntry = {
      uuid: resolved.uuid,
      name: resolved.name,
    };
    whitelist.push(entry);
    this.writeJsonFile(SUBDIRS.WHITELIST, whitelist);
    return entry;
  }

  public removeWhitelist(uuidOrName: string): boolean {
    const whitelist = this.getWhitelist();
    const filtered = whitelist.filter((w) => w.uuid !== uuidOrName && w.name.toLowerCase() !== uuidOrName.toLowerCase());
    if (filtered.length !== whitelist.length) {
      this.writeJsonFile(SUBDIRS.WHITELIST, filtered);
      return true;
    }
    return false;
  }

  // --- BANS ---
  public getBannedPlayers(): BanEntry[] {
    return this.readJsonFile<BanEntry[]>(SUBDIRS.BANNED_PLAYERS, []);
  }

  public async addBan(name: string, reason: string = 'Banned by operator'): Promise<BanEntry> {
    const resolved = await this.resolvePlayerUuid(name);
    const bans = this.getBannedPlayers();
    const entry: BanEntry = {
      uuid: resolved.uuid,
      name: resolved.name,
      created: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' +0000',
      source: 'Server Operator',
      expires: 'forever',
      reason,
    };

    const existingIdx = bans.findIndex((b) => b.uuid === resolved.uuid);
    if (existingIdx !== -1) {
      bans[existingIdx] = entry;
    } else {
      bans.push(entry);
    }

    this.writeJsonFile(SUBDIRS.BANNED_PLAYERS, bans);
    return entry;
  }

  public removeBan(uuidOrName: string): boolean {
    const bans = this.getBannedPlayers();
    const filtered = bans.filter((b) => b.uuid !== uuidOrName && b.name?.toLowerCase() !== uuidOrName.toLowerCase());
    if (filtered.length !== bans.length) {
      this.writeJsonFile(SUBDIRS.BANNED_PLAYERS, filtered);
      return true;
    }
    return false;
  }

  public getBannedIps(): BanEntry[] {
    return this.readJsonFile<BanEntry[]>(SUBDIRS.BANNED_IPS, []);
  }

  public addBanIp(ip: string, reason: string = 'Banned by operator'): BanEntry {
    const bans = this.getBannedIps();
    const entry: BanEntry = {
      ip,
      created: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' +0000',
      source: 'Server Operator',
      expires: 'forever',
      reason,
    };
    const existingIdx = bans.findIndex((b) => b.ip === ip);
    if (existingIdx !== -1) {
      bans[existingIdx] = entry;
    } else {
      bans.push(entry);
    }
    this.writeJsonFile(SUBDIRS.BANNED_IPS, bans);
    return entry;
  }

  public removeBanIp(ip: string): boolean {
    const bans = this.getBannedIps();
    const filtered = bans.filter((b) => b.ip !== ip);
    if (filtered.length !== bans.length) {
      this.writeJsonFile(SUBDIRS.BANNED_IPS, filtered);
      return true;
    }
    return false;
  }
}
