import type { Logger } from "@voltagent/internal";
import type { UIMessage } from "ai";

import type { MemoryManager } from "../memory/manager/memory-manager";
import type { ConversationBuffer } from "./conversation-buffer";
import type { OperationContext } from "./types";

interface QueueEntry {
  timer?: NodeJS.Timeout;
  pendingPromise: Promise<void>;
  buffers: Map<ConversationBuffer, QueueBuffer>;
}

interface QueueBuffer {
  context: OperationContext;
  retainedAt?: number;
}

export interface MemoryPersistQueueOptions {
  debounceMs?: number;
  logger?: Logger;
  /** Maximum number of failed buffers retained for retry across this memory manager. */
  maxRetryBuffers?: number;
  /** How long a failed buffer remains eligible for retry. */
  retryRetentionMs?: number;
}

export type MemoryPersistQueueMemoryManager = Pick<MemoryManager, "saveMessage">;

export const AGENT_METADATA_CONTEXT_KEY = Symbol("agentMetadata");
export const SUBAGENT_TOOL_CALL_METADATA_KEY = Symbol("subAgentToolCallMetadata");

export interface AgentMetadataContextValue {
  agentId: string;
  agentName: string;
}

/**
 * Debounced persistence manager responsible for writing buffered messages to memory.
 */
export class MemoryPersistQueue {
  private static readonly entriesByManager = new WeakMap<
    MemoryPersistQueueMemoryManager,
    Map<string, QueueEntry>
  >();
  private readonly debounceMs: number;
  private readonly logger?: Logger;
  private readonly maxRetryBuffers: number;
  private readonly retryRetentionMs: number;
  private readonly entries: Map<string, QueueEntry>;
  private retentionCleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly memoryManager: MemoryPersistQueueMemoryManager,
    options: MemoryPersistQueueOptions = {},
  ) {
    this.debounceMs = options.debounceMs ?? 200;
    this.logger = options.logger;
    this.maxRetryBuffers = Math.max(0, options.maxRetryBuffers ?? 32);
    this.retryRetentionMs = Math.max(0, options.retryRetentionMs ?? 5 * 60_000);
    let entries = MemoryPersistQueue.entriesByManager.get(memoryManager);
    if (!entries) {
      entries = new Map();
      MemoryPersistQueue.entriesByManager.set(memoryManager, entries);
    }
    this.entries = entries;
  }

  scheduleSave(buffer: ConversationBuffer, oc: OperationContext): void {
    if (!oc.conversationId || !oc.userId) {
      return;
    }

    const key = this.getKey(oc);
    const entry = this.getOrCreateEntry(key);
    const existing = entry.buffers.get(buffer);
    entry.buffers.set(buffer, {
      context: oc,
      retainedAt: existing?.retainedAt,
    });
    this.pruneRetainedBuffers();
    this.scheduleRetentionCleanup();

    if (entry.timer) {
      clearTimeout(entry.timer);
    }

    entry.timer = setTimeout(() => {
      entry.timer = undefined;
      void this.enqueuePersist(key, () => this.persistAll(key)).catch(() => {});
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
    const existing = entry.buffers.get(buffer);
    entry.buffers.set(buffer, {
      context: oc,
      retainedAt: existing?.retainedAt,
    });
    this.pruneRetainedBuffers();
    this.scheduleRetentionCleanup();

    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = undefined;
    }

    const flushPayload = {
      conversationId: oc.conversationId,
      userId: oc.userId,
    };
    this.logger?.debug?.("Flushing conversation persistence queue", flushPayload);

    await this.enqueuePersist(key, () => this.persistAll(key));
  }

  private async persistAll(key: string): Promise<void> {
    const entry = this.entries.get(key);
    if (!entry) return;

    this.pruneRetainedBuffers();
    let firstError: unknown;

    for (const [buffer, queued] of [...entry.buffers]) {
      try {
        await this.persist(buffer, queued.context);
        if (buffer.getPendingMessages().length === 0) {
          entry.buffers.delete(buffer);
        }
      } catch (error) {
        queued.retainedAt ??= Date.now();
        firstError ??= error;
      }
    }

    this.pruneRetainedBuffers();
    this.scheduleRetentionCleanup();
    if (firstError) throw firstError;
  }

  private async persist(buffer: ConversationBuffer, oc: OperationContext): Promise<void> {
    if (!oc.userId || !oc.conversationId) {
      return;
    }

    const pending = buffer.getPendingMessages();
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
      ids: pending.map(({ message }) => message.id),
    };
    this.logger?.debug?.("[MemoryPersistQueue] persisting", payload);

    const agentMetadata = oc.systemContext.get(AGENT_METADATA_CONTEXT_KEY) as
      | AgentMetadataContextValue
      | undefined;
    const shouldApplySubAgentMetadata = Boolean(agentMetadata && oc.parentAgentId);
    const toolCallMetadata = oc.systemContext.get(SUBAGENT_TOOL_CALL_METADATA_KEY) as
      | Map<string, AgentMetadataContextValue>
      | undefined;

    for (const { message, version } of pending) {
      try {
        const messageWithMetadata = this.applySubAgentMetadata(message, {
          defaultMetadata: shouldApplySubAgentMetadata ? agentMetadata : undefined,
          toolCallMetadata,
        });
        await this.memoryManager.saveMessage(
          oc,
          messageWithMetadata,
          oc.userId,
          oc.conversationId,
          {
            throwOnError: true,
          },
        );
        buffer.markMessagePersisted(message.id, version);
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
        if (current === entry && !current.timer && current.buffers.size === 0) {
          this.entries.delete(key);
        }
      });

    return entry.pendingPromise;
  }

  private getOrCreateEntry(key: string): QueueEntry {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { pendingPromise: Promise.resolve(), buffers: new Map() };
      this.entries.set(key, entry);
    }
    return entry;
  }

  private pruneRetainedBuffers(): void {
    const now = Date.now();
    const retained: Array<{
      buffer: ConversationBuffer;
      entry: QueueEntry;
      retainedAt: number;
    }> = [];

    for (const entry of this.entries.values()) {
      for (const [buffer, queued] of entry.buffers) {
        if (queued.retainedAt === undefined) continue;

        if (!queued.context.isActive && now - queued.retainedAt >= this.retryRetentionMs) {
          entry.buffers.delete(buffer);
          this.logger?.warn?.("Dropping expired conversation persistence retry", {
            retainedForMs: now - queued.retainedAt,
          });
          continue;
        }

        if (!queued.context.isActive) {
          retained.push({ buffer, entry, retainedAt: queued.retainedAt });
        }
      }
    }

    retained.sort((a, b) => a.retainedAt - b.retainedAt);
    while (retained.length > this.maxRetryBuffers) {
      const oldest = retained.shift();
      if (!oldest) break;
      const queued = oldest.entry.buffers.get(oldest.buffer);
      if (queued?.retainedAt !== oldest.retainedAt) continue;
      oldest.entry.buffers.delete(oldest.buffer);
      this.logger?.warn?.("Dropping conversation persistence retry limit exceeded", {
        maxRetryBuffers: this.maxRetryBuffers,
      });
    }

    for (const [key, entry] of this.entries) {
      if (!entry.timer && entry.buffers.size === 0) {
        this.entries.delete(key);
      }
    }
  }

  private scheduleRetentionCleanup(): void {
    if (!this.hasRetainedBuffers()) {
      if (this.retentionCleanupTimer) {
        clearTimeout(this.retentionCleanupTimer);
        this.retentionCleanupTimer = undefined;
      }
      return;
    }
    if (this.retentionCleanupTimer) return;

    const delay = Math.max(1, this.retryRetentionMs);
    this.retentionCleanupTimer = setTimeout(() => {
      this.retentionCleanupTimer = undefined;
      this.pruneRetainedBuffers();
      this.scheduleRetentionCleanup();
    }, delay);
    this.retentionCleanupTimer.unref?.();
  }

  private hasRetainedBuffers(): boolean {
    for (const entry of this.entries.values()) {
      for (const queued of entry.buffers.values()) {
        if (queued.retainedAt !== undefined) return true;
      }
    }
    return false;
  }

  private getKey(oc: OperationContext): string {
    return `${oc.userId?.length ?? 0}:${oc.userId ?? ""}:${oc.conversationId ?? ""}`;
  }

  private applySubAgentMetadata(
    message: UIMessage,
    opts: {
      defaultMetadata?: AgentMetadataContextValue;
      toolCallMetadata?: Map<string, AgentMetadataContextValue>;
    },
  ): UIMessage {
    let metadata =
      typeof message.metadata === "object" && message.metadata !== null
        ? { ...(message.metadata as Record<string, any>) }
        : undefined;

    const attachMetadata = (value?: AgentMetadataContextValue) => {
      if (!value) return;
      if (!metadata) metadata = {};
      if (!metadata.subAgentId) {
        metadata.subAgentId = value.agentId;
      }
      if (!metadata.subAgentName) {
        metadata.subAgentName = value.agentName;
      }
    };

    const partMetadata =
      opts.toolCallMetadata && this.getMetadataFromMessageParts(message, opts.toolCallMetadata);
    if (partMetadata) {
      attachMetadata(partMetadata);
    }

    if (!metadata?.subAgentId && opts.defaultMetadata) {
      attachMetadata(opts.defaultMetadata);
    }

    if (!metadata) {
      return message;
    }

    return {
      ...message,
      metadata,
    };
  }

  private getMetadataFromMessageParts(
    message: UIMessage,
    toolCallMetadata: Map<string, AgentMetadataContextValue>,
  ): AgentMetadataContextValue | undefined {
    for (const part of message.parts) {
      const type = (part as { type?: string }).type;
      if (!type) continue;

      if (type === "data-subagent-stream") {
        const data = (part as { data?: Record<string, any> }).data;
        if (data?.subAgentId && data?.subAgentName) {
          return { agentId: data.subAgentId, agentName: data.subAgentName };
        }
        continue;
      }

      if (type.startsWith("tool-")) {
        const toolCallId = (part as { toolCallId?: string }).toolCallId;
        if (toolCallId && toolCallMetadata.has(toolCallId)) {
          return toolCallMetadata.get(toolCallId);
        }
      }
    }
    return undefined;
  }
}
