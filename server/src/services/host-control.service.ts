import net from 'net';

export type HostControlAction = 'status' | 'start' | 'stop' | 'restart' | 'kill';

export interface HostControlStatus {
  activeState: string;
  subState: string;
  mainPid: number | null;
  uptime: number;
  cpuPercent?: number;
  memoryBytes?: number;
}

interface HostControlResponse {
  ok: boolean;
  error?: string;
  status?: HostControlStatus;
  message?: string;
}

/**
 * Talks to the host-side bridge that is allowed to control one systemd unit.
 * The manager never receives a shell or a systemd/D-Bus socket.
 */
export class HostControlService {
  private readonly external = process.env.MC_CONTROL_MODE === 'external';
  private readonly socketPath = process.env.MC_CONTROL_SOCKET || '/run/mcmanager/control.sock';
  private readonly timeoutMs = Number.parseInt(process.env.MC_CONTROL_TIMEOUT_MS || '5000', 10);

  public isExternal(): boolean {
    return this.external;
  }

  public async getStatus(): Promise<HostControlStatus> {
    const response = await this.request('status');
    if (!response.status) {
      throw new Error(response.error || 'Host bridge returned no service status');
    }
    return response.status;
  }

  public async execute(action: Exclude<HostControlAction, 'status'>): Promise<{ success: boolean; message: string }> {
    const response = await this.request(action);
    return {
      success: response.ok,
      message: response.message || (response.ok ? `Host service action '${action}' completed` : 'Host service action failed'),
    };
  }

  private request(action: HostControlAction): Promise<HostControlResponse> {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ path: this.socketPath });
      let buffer = '';
      let settled = false;

      const finishError = (error: Error) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(error);
      };

      const finishResponse = (response: HostControlResponse) => {
        if (settled) return;
        settled = true;
        socket.end();
        if (response.ok) resolve(response);
        else reject(new Error(response.error || 'Host bridge rejected the request'));
      };

      socket.setTimeout(this.timeoutMs, () => {
        finishError(new Error(`Host control bridge timed out after ${this.timeoutMs}ms`));
      });

      socket.once('connect', () => {
        socket.write(`${JSON.stringify({ action })}\n`);
      });

      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        const newline = buffer.indexOf('\n');
        if (newline === -1) return;

        const line = buffer.slice(0, newline);
        try {
          finishResponse(JSON.parse(line) as HostControlResponse);
        } catch {
          finishError(new Error('Host control bridge returned invalid JSON'));
        }
      });

      socket.once('error', (error) => {
        finishError(new Error(`Host control bridge unavailable at ${this.socketPath}: ${error.message}`));
      });

      socket.once('close', () => {
        if (!settled) finishError(new Error('Host control bridge closed the connection without a response'));
      });
    });
  }
}
