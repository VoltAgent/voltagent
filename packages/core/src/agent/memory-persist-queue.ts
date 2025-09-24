import type { Logger } from "@voltagent/internal";

import type { MemoryManager } from "../memory/manager/memory-manager";
import type { ConversationBuffer } from "./conversation-buffer";
import type { OperationContext } from "./types";

interface QueueEntry {
  timer?: NodeJS.Timeout;
  pendingPromise: Promise<void>;
}

export interface MemoryPersistQueueOptions {
  debounceMs?: number;
  logger?: Logger;
}

/**
 * Debounced persistence manager responsible for writing buffered messages to memory.
 */
export class MemoryPersistQueue {
  private readonly debounceMs: number;
  private readonly logger?: Logger;
  private readonly entries = new Map<string, QueueEntry>();

  constructor(
    private readonly memoryManager: MemoryManager,
    options: MemoryPersistQueueOptions = {},
  ) {
    this.debounceMs = options.debounceMs ?? 200;
    this.logger = options.logger;
  }

  scheduleSave(buffer: ConversationBuffer, oc: OperationContext): void {
    if (!oc.conversationId || !oc.userId) {
      return;
    }

    const key = this.getKey(oc);
    const entry = this.getOrCreateEntry(key);

    if (entry.timer) {
      clearTimeout(entry.timer);
    }

    entry.timer = setTimeout(() => {
      entry.timer = undefined;
      this.enqueuePersist(key, () => this.persist(buffer, oc));
    }, this.debounceMs);

    const logPayload = {
      conversationId: oc.conversationId,
      userId: oc.userId,
    };
    this.logger?.debug?.("[MemoryPersistQueue] schedule", logPayload);
  }

  async flush(buffer: ConversationBuffer, oc: OperationContext): Promise<void> {
    if (!oc.conversationId || !oc.userId) return;

    const key = this.getKey(oc);
    const entry = this.getOrCreateEntry(key);

    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = undefined;
    }

    const flushPayload = {
      conversationId: oc.conversationId,
      userId: oc.userId,
    };
    this.logger?.debug?.("Flushing conversation persistence queue", flushPayload);

    await this.enqueuePersist(key, () => this.persist(buffer, oc));
  }

  private async persist(buffer: ConversationBuffer, oc: OperationContext): Promise<void> {
    if (!oc.userId || !oc.conversationId) {
      return;
    }

    const pending = buffer.drainPendingMessages();
    if (pending.length === 0) {
      const payload = {
        conversationId: oc.conversationId,
        userId: oc.userId,
      };
      this.logger?.debug?.("[MemoryPersistQueue] nothing-to-persist", payload);
      return;
    }

    const payload = {
      conversationId: oc.conversationId,
      userId: oc.userId,
      count: pending.length,
      ids: pending.map((msg) => msg.id),
    };
    this.logger?.debug?.("[MemoryPersistQueue] persisting", payload);

    for (const message of pending) {
      try {
        await this.memoryManager.saveMessage(oc, message, oc.userId, oc.conversationId);
      } catch (error) {
        this.logger?.error?.("Failed to save message", {
          conversationId: oc.conversationId,
          userId: oc.userId,
          error,
        });
        throw error;
      }
    }
  }

  private enqueuePersist(key: string, task: () => Promise<void>): Promise<void> {
    const entry = this.getOrCreateEntry(key);

    entry.pendingPromise = entry.pendingPromise
      .catch(() => {})
      .then(async () => {
        await task();
      })
      .catch((error) => {
        this.logger?.error?.("Failed to persist conversation messages", { error });
        throw error;
      })
      .finally(() => {
        const current = this.entries.get(key);
        if (current === entry && !current?.timer) {
          this.entries.delete(key);
        }
      });

    return entry.pendingPromise;
  }

  private getOrCreateEntry(key: string): QueueEntry {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { pendingPromise: Promise.resolve() };
      this.entries.set(key, entry);
    }
    return entry;
  }

  private getKey(oc: OperationContext): string {
    return `${oc.userId ?? "unknown"}:${oc.conversationId ?? "unknown"}`;
  }
}
