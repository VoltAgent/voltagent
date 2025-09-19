import type { SseBridge } from "@voltagent/mcp-server";
import type { SSEStreamingApi } from "hono/streaming";

export class HonoSseBridge implements SseBridge {
  constructor(private readonly stream: SSEStreamingApi) {}

  async send(message: {
    data: string;
    event?: string;
    id?: string;
    retry?: number;
  }): Promise<void> {
    await this.stream.writeSSE(message);
  }

  async close(): Promise<void> {
    await this.stream.close();
  }

  onAbort(listener: () => void | Promise<void>): void {
    this.stream.onAbort?.(listener);
  }
}
