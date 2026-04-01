import type { SseBridge } from "@voltagent/mcp-server";

/**
 * Elysia SSE bridge for MCP protocol
 * Adapts Elysia's streaming API to the MCP SseBridge interface
 */
export class ElysiaSseBridge implements SseBridge {
  private abortController: AbortController;
  private abortListeners: Array<() => void | Promise<void>> = [];

  constructor(
    private readonly sendEvent: (data: string, options?: { event?: string; id?: string }) => void,
    private readonly closeStream: () => void,
    signal?: AbortSignal,
  ) {
    this.abortController = new AbortController();

    // Forward external abort signal if provided
    if (signal) {
      if (signal.aborted) {
        this.abortController.abort();
      } else {
        signal.addEventListener("abort", () => {
          this.abortController.abort();
          this.triggerAbortListeners();
        });
      }
    }
  }

  async send(message: {
    data: string;
    event?: string;
    id?: string;
    retry?: number;
  }): Promise<void> {
    this.sendEvent(message.data, {
      event: message.event,
      id: message.id,
    });
  }

  async close(): Promise<void> {
    this.abortController.abort();
    this.closeStream();
  }

  onAbort(listener: () => void | Promise<void>): void {
    this.abortListeners.push(listener);

    // If already aborted, call immediately
    if (this.abortController.signal.aborted) {
      Promise.resolve(listener()).catch((error) => {
        console.error("Error in abort listener:", error);
      });
    }
  }

  private async triggerAbortListeners(): Promise<void> {
    for (const listener of this.abortListeners) {
      try {
        await listener();
      } catch (error) {
        console.error("Error in abort listener:", error);
      }
    }
  }
}
