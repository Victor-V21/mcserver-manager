import { Rcon } from 'rcon-client';
import { PropertiesService } from './properties.service';

export class RconService {
  private static instance: RconService;
  private client: Rcon | null = null;
  private propertiesService: PropertiesService;
  private isConnecting: boolean = false;

  private constructor() {
    this.propertiesService = PropertiesService.getInstance();
  }

  public static getInstance(): RconService {
    if (!RconService.instance) {
      RconService.instance = new RconService();
    }
    return RconService.instance;
  }

  public isConnected(): boolean {
    return this.client !== null && this.client.authenticated;
  }

  public async connect(): Promise<boolean> {
    if (this.isConnected()) return true;
    if (this.isConnecting) return false;

    this.isConnecting = true;
    try {
      const { properties } = this.propertiesService.getProperties();
      const rconEnabled = properties['enable-rcon'] === 'true';
      if (!rconEnabled) {
        this.isConnecting = false;
        return false;
      }

      const port = parseInt(process.env.RCON_PORT || properties['rcon.port'] || '25575', 10);
      const password = process.env.RCON_PASSWORD || properties['rcon.password'] || 'mcmanager_secure_rcon';
      const host = process.env.RCON_HOST || '127.0.0.1';

      this.client = new Rcon({ host, port, password, timeout: 3000 });

      this.client.on('error', (err) => {
        console.warn('RCON client error:', err.message);
        this.client = null;
      });

      this.client.on('end', () => {
        this.client = null;
      });

      await this.client.connect();
      this.isConnecting = false;
      return true;
    } catch (err: any) {
      this.client = null;
      this.isConnecting = false;
      return false;
    }
  }

  public async sendCommand(cmd: string): Promise<string> {
    const connected = await this.connect();
    if (!connected || !this.client) {
      throw new Error('RCON is not connected (server may be offline or starting up)');
    }

    try {
      const cleanCmd = cmd.startsWith('/') ? cmd.slice(1) : cmd;
      const response = await this.client.send(cleanCmd);
      return response;
    } catch (err: any) {
      this.client = null;
      throw new Error(`RCON Command failed: ${err.message}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.end();
      } catch {}
      this.client = null;
    }
  }
}
