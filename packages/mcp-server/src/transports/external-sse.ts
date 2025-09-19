import { randomUUID } from "node:crypto";
import type { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { JSONRPCMessageSchema } from "@modelcontextprotocol/sdk/types.js";
import type { JSONRPCMessage, MessageExtraInfo } from "@modelcontextprotocol/sdk/types.js";
import { safeStringify } from "@voltagent/internal";

export interface SseBridge {
  send(message: {
    data: string;
    event?: string;
    id?: string;
    retry?: number;
  }): Promise<void>;
  close(): Promise<void>;
  onAbort?(listener: () => void | Promise<void>): void;
}

export class ExternalSseTransport implements Transport {
  public readonly sessionId: string = randomUUID();
  private closed = false;

  onclose?: () => void;
  onerror?: (error: Error) => void;
  onmessage?: (message: JSONRPCMessage, extra?: MessageExtraInfo) => void;

  constructor(
    private readonly bridge: SseBridge,
    private readonly messagePath: string,
  ) {}

  async start(): Promise<void> {
    const data = `${this.messagePath}?sessionId=${this.sessionId}`;
    await this.bridge.send({ event: "endpoint", data });

    this.bridge.onAbort?.(() => {
      if (!this.closed) {
        void this.close();
      }
    });
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (this.closed) {
      throw new Error("SSE transport is closed");
    }

    await this.bridge.send({
      event: "message",
      data: safeStringify(message),
    });
  }

  async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;

    try {
      await this.bridge.close();
    } finally {
      this.onclose?.();
    }
  }

  async dispatch(body: unknown, headers: Record<string, string>): Promise<void> {
    try {
      const payload = typeof body === "string" ? JSON.parse(body) : body;
      const message = JSONRPCMessageSchema.parse(payload);

      this.onmessage?.(message, {
        requestInfo: {
          headers,
        },
      });
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onerror?.(err);
      throw err;
    }
  }
}
