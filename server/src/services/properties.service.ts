import fs from 'fs';
import path from 'path';
import { ConfigService } from './config.service';
import { SUBDIRS } from '../config/constants';

export class PropertiesService {
  private static instance: PropertiesService;
  private configService: ConfigService;

  private constructor() {
    this.configService = ConfigService.getInstance();
  }

  public static getInstance(): PropertiesService {
    if (!PropertiesService.instance) {
      PropertiesService.instance = new PropertiesService();
    }
    return PropertiesService.instance;
  }

  private getPropertiesPath(): string {
    return this.configService.resolvePath(SUBDIRS.PROPERTIES);
  }

  /** Create the first server.properties before Minecraft's first boot. */
  public ensurePropertiesFile(): void {
    const filePath = this.getPropertiesPath();
    if (fs.existsSync(filePath)) return;
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(filePath, this.serializeProperties(this.getDefaultProperties()), 'utf8');
  }

  public getProperties(): { properties: Record<string, string | number | boolean>; raw: string } {
    const filePath = this.getPropertiesPath();
    if (!fs.existsSync(filePath)) {
      const defaultProperties = this.getDefaultProperties();
      return {
        properties: defaultProperties,
        raw: this.serializeProperties(defaultProperties),
      };
    }

    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const properties: Record<string, string | number | boolean> = {};

      const lines = raw.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
          continue;
        }
        const eqIdx = line.indexOf('=');
        if (eqIdx !== -1) {
          const key = line.slice(0, eqIdx).trim();
          const value = line.slice(eqIdx + 1).trim();
          properties[key] = this.parseValue(value);
        }
      }

      return { properties, raw };
    } catch (err) {
      console.error('Failed to read server.properties:', err);
      throw new Error('Failed to read server.properties');
    }
  }

  public saveProperties(data: { properties?: Record<string, string | number | boolean>; raw?: string }): void {
    const filePath = this.getPropertiesPath();
    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // 1. Create .bak backup if file exists
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, `${filePath}.bak`);
      } catch (err) {
        console.warn('Could not create server.properties.bak backup:', err);
      }
    }

    let contentToWrite = '';
    const sanitizedProperties = data.properties ? { ...data.properties } : undefined;
    if (sanitizedProperties) {
      for (const key of Object.keys(sanitizedProperties)) {
        if (key === 'enable-rcon' || key === 'broadcast-rcon-to-ops' || key.startsWith('rcon.')) {
          delete sanitizedProperties[key];
        }
      }
      if (sanitizedProperties['online-mode'] === false) sanitizedProperties['enforce-secure-profile'] = false;
    }

    if (data.raw !== undefined && data.raw !== null) {
      contentToWrite = data.raw
        .split(/\r?\n/)
        .filter((line) => !/^\s*(enable-rcon|broadcast-rcon-to-ops|rcon\.)/i.test(line))
        .join('\n');
    } else if (sanitizedProperties) {
      // If we have existing raw, update existing keys in place to keep comments
      if (fs.existsSync(filePath)) {
        const existingRaw = fs.readFileSync(filePath, 'utf-8');
        contentToWrite = this.mergePropertiesIntoRaw(existingRaw, sanitizedProperties);
      } else {
        contentToWrite = this.serializeProperties(sanitizedProperties);
      }
    } else {
      throw new Error('Neither properties nor raw content provided');
    }

    // 2. Atomic write with .tmp
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, contentToWrite, 'utf-8');
    fs.renameSync(tmpPath, filePath);
  }

  private mergePropertiesIntoRaw(raw: string, newProps: Record<string, string | number | boolean>): string {
    const lines = raw.split(/\r?\n/);
    const updatedKeys = new Set<string>();
    const resultLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) {
        resultLines.push(line);
        continue;
      }

      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        if (key in newProps) {
          resultLines.push(`${key}=${newProps[key]}`);
          updatedKeys.add(key);
        } else {
          resultLines.push(line);
        }
      } else {
        resultLines.push(line);
      }
    }

    // Append any newly added keys that weren't in the original file
    for (const [k, v] of Object.entries(newProps)) {
      if (!updatedKeys.has(k)) {
        resultLines.push(`${k}=${v}`);
      }
    }

    return resultLines.join('\n');
  }

  private serializeProperties(props: Record<string, string | number | boolean>): string {
    const lines = [
      '# Minecraft server properties',
      `# Generated by MCServer Manager on ${new Date().toISOString()}`,
    ];
    for (const [k, v] of Object.entries(props)) {
      lines.push(`${k}=${v}`);
    }
    return lines.join('\n') + '\n';
  }

  private parseValue(value: string): string | number | boolean {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (/^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
    return value;
  }

  private getDefaultProperties(): Record<string, string | number | boolean> {
    return {
      'gamemode': 'survival',
      'difficulty': 'easy',
      'hardcore': 'false',
      'level-name': 'world',
      'level-seed': '',
      'motd': 'A NeoForge Minecraft Server powered by MCServer-Manager',
      'server-port': '25565',
      'max-players': '20',
      'view-distance': '10',
      'simulation-distance': '10',
      'pvp': 'true',
      'allow-flight': 'false',
      'spawn-protection': '16',
      'white-list': 'false',
      // Offline mode is intentionally enabled for servers that accept
      // non-premium accounts. Put the panel behind HTTPS and a strong
      // password before exposing it publicly.
      'online-mode': false,
      'enforce-secure-profile': false,
      'enable-command-block': 'true',
      'allow-nether': 'true',
    };
  }
}
