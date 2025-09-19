import type { MCPServer } from "../server";
import type { TransportController, TransportStartOptions } from "./registry";

export class StdioTransport implements TransportController {
  private running = false;

  constructor(private readonly server: MCPServer) {}

  async start(options?: TransportStartOptions): Promise<void> {
    if (this.running) {
      return;
    }

    await this.server.startStdioTransport(options?.contextOverrides ?? {});
    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    await this.server.detachTransport("stdio");
    this.running = false;
  }

  isRunning(): boolean {
    return this.running;
  }

  getName(): string {
    return "stdio";
  }
}
