import type { ModelMessage } from "@ai-sdk/provider-utils";
import type { Logger } from "@voltagent/internal";
import type { UIMessage, UIMessagePart } from "ai";

import { randomUUID } from "../utils/id";
import { convertModelMessagesToUIMessages } from "../utils/message-converter";

type MessageSource = "user" | "system" | "memory" | "response";

interface PendingMessage {
  id: string;
  message: UIMessage;
}

const extractOpenAIItemId = (metadata: unknown): string => {
  if (!metadata || typeof metadata !== "object") {
    return "";
  }

  const openai = (metadata as { openai?: unknown }).openai;
  if (!openai || typeof openai !== "object") {
    return "";
  }

  const openaiRecord = openai as Record<string, unknown>;
  const itemId = typeof openaiRecord.itemId === "string" ? openaiRecord.itemId.trim() : "";
  if (itemId) {
    return itemId;
  }

  const traceId =
    typeof openaiRecord.reasoning_trace_id === "string"
      ? openaiRecord.reasoning_trace_id.trim()
      : "";
  if (traceId) {
    return traceId;
  }

  const reasoning = openaiRecord.reasoning;
  if (reasoning && typeof reasoning === "object") {
    const reasoningId =
      typeof (reasoning as Record<string, unknown>).id === "string"
        ? ((reasoning as Record<string, unknown>).id as string).trim()
        : "";
    if (reasoningId) {
      return reasoningId;
    }
  }

  return "";
};

/**
 * Lightweight buffer that merges tool call/result pairs while keeping VoltAgent's UIMessage format intact.
 */
export class ConversationBuffer {
  private messages: UIMessage[] = [];
  private pendingMessageIds = new Set<string>();
  private toolPartIndex = new Map<string, { messageIndex: number; partIndex: number }>();
  private activeAssistantMessageId?: string;

  constructor(
    initialMessages?: UIMessage[],
    private readonly logger?: Logger,
  ) {
    if (initialMessages?.length) {
      for (const message of initialMessages) {
        this.appendExistingMessage(message);
      }
    }
  }

  addModelMessages(
    modelMessages: ReadonlyArray<ModelMessage>,
    source: MessageSource = "response",
  ): void {
    if (!modelMessages.length) return;

    for (const modelMessage of modelMessages) {
      const uiMessages = convertModelMessagesToUIMessages([modelMessage]);
      if (!uiMessages.length) continue;

      for (const uiMessage of uiMessages) {
        const message = this.cloneMessage(uiMessage);

        const rawId = (modelMessage as Partial<{ id: unknown }>).id;
        if (typeof rawId === "string" && rawId.trim()) {
          message.id = rawId;
        }

        switch (modelMessage.role) {
          case "assistant":
            this.handleAssistantMessage(message, source);
            break;
          case "tool":
            this.mergeAssistantMessage(message, { requireExisting: true });
            break;
          default:
            this.appendNewMessage(message, source);
            break;
        }
      }
    }
  }

  ingestUIMessages(messages: ReadonlyArray<UIMessage>, markAsSaved = true): void {
    if (!messages.length) return;

    for (const message of messages) {
      this.appendExistingMessage(message, { markAsSaved });
    }
  }

  drainPendingMessages(): UIMessage[] {
    if (this.pendingMessageIds.size === 0) {
      return [];
    }

    const drained: PendingMessage[] = [];

    this.messages.forEach((message) => {
      if (this.pendingMessageIds.has(message.id)) {
        drained.push({ id: message.id, message: this.cloneMessage(message) });
      }
    });

    this.pendingMessageIds.clear();

    if (drained.length > 0) {
      const drainedIds = new Set(drained.map((item) => item.id));
      if (this.activeAssistantMessageId && drainedIds.has(this.activeAssistantMessageId)) {
        this.activeAssistantMessageId = undefined;
      }
    }

    if (drained.length > 0) {
      this.log("drain-pending", { count: drained.length, ids: drained.map((item) => item.id) });
    }

    return drained.map((item) => item.message);
  }

  getAllMessages(): UIMessage[] {
    return this.messages.map((message) => this.cloneMessage(message));
  }

  addMetadataToLastAssistantMessage(
    metadata: Record<string, unknown>,
    options?: { requirePending?: boolean },
  ): boolean {
    if (!metadata || Object.keys(metadata).length === 0) {
      return false;
    }

    let lastAssistantIndex = this.findLastAssistantIndex({
      pendingOnly: options?.requirePending,
    });
    if (lastAssistantIndex === -1) {
      if (options?.requirePending) {
        return false;
      }
      lastAssistantIndex = this.findLastAssistantIndex();
    }
    if (lastAssistantIndex === -1) {
      return false;
    }

    const target = this.messages[lastAssistantIndex];
    const existing =
      typeof target.metadata === "object" && target.metadata !== null ? target.metadata : {};
    target.metadata = {
      ...(existing as Record<string, unknown>),
      ...metadata,
    } as UIMessage["metadata"];
    this.pendingMessageIds.add(target.id);
    return true;
  }

  private appendExistingMessage(
    message: UIMessage,
    options: { markAsSaved?: boolean } = { markAsSaved: true },
  ): void {
    const hydrated = this.cloneMessage(message);
    this.ensureMessageId(hydrated);
    this.messages.push(hydrated);
    this.registerToolParts(this.messages.length - 1);

    if (!options.markAsSaved) {
      this.pendingMessageIds.add(hydrated.id);
    }

    this.log("append-existing", {
      messageId: hydrated.id,
      role: hydrated.role,
      markAsSaved: options.markAsSaved !== false,
    });
  }

  private mergeAssistantMessage(
    message: UIMessage,
    options: { requireExisting?: boolean } = {},
  ): void {
    const { requireExisting = false } = options;
    const lastAssistantIndex = this.findLastAssistantIndex();

    if (lastAssistantIndex === -1) {
      if (requireExisting) return;

      this.appendNewMessage(message, "response");
      return;
    }

    const target = this.messages[lastAssistantIndex];

    if (message.metadata) {
      target.metadata = {
        ...(target.metadata || {}),
        ...message.metadata,
      } as UIMessage["metadata"];
    }

    const targetCounts = this.buildSignatureCounts(target.parts);
    const incomingConsumed = new Map<string, number>();
    let modified = false;

    const structuredCloneImpl = (globalThis as any).structuredClone as
      | (<T>(value: T) => T)
      | undefined;

    const cloneValue = <T>(value: T): T => {
      if (typeof structuredCloneImpl === "function") {
        return structuredCloneImpl(value);
      }
      return JSON.parse(JSON.stringify(value)) as T;
    };

    const clonePart = <T extends UIMessagePart<any, any>>(part: T): T => cloneValue(part);

    const lastAssistantMessageIndex = lastAssistantIndex;

    for (const part of message.parts) {
      const toolMergeResult = this.tryMergeToolPart(
        target,
        lastAssistantMessageIndex,
        part,
        targetCounts,
        clonePart,
      );
      if (toolMergeResult !== "none") {
        modified = true;
        continue;
      }

      if (part.type === "step-start") {
        continue;
      }

      const signature = this.getPartSignature(part);
      const consumed = (incomingConsumed.get(signature) ?? 0) + 1;
      incomingConsumed.set(signature, consumed);

      const currentCount = targetCounts.get(signature) ?? 0;

      if (currentCount >= consumed) {
        const updated = this.updateExistingPartWithLatestData(
          target,
          signature,
          consumed - 1,
          part,
          cloneValue,
        );
        if (updated) {
          modified = true;
        }
        continue;
      }

      if (part.type === "text") {
        const inserted = this.ensureStepStartBeforeText(target, targetCounts);
        if (inserted) {
          modified = true;
        }
      }

      const clonedPart = clonePart(part);
      target.parts.push(clonedPart);
      this.incrementSignatureCount(targetCounts, signature);
      modified = true;
    }

    if (modified) {
      this.pendingMessageIds.add(target.id);
      this.registerToolParts(lastAssistantIndex);
    }
  }

  private handleAssistantMessage(message: UIMessage, source: MessageSource): void {
    const lastIndex = this.findLastAssistantIndex();
    const lastMessage = lastIndex >= 0 ? this.messages[lastIndex] : undefined;

    if (!lastMessage) {
      this.appendNewMessage(message, source);
      return;
    }

    if (source === "response") {
      const isActiveTarget =
        this.activeAssistantMessageId !== undefined &&
        this.activeAssistantMessageId === lastMessage.id;
      const isActiveIncoming =
        this.activeAssistantMessageId !== undefined && this.activeAssistantMessageId === message.id;

      if (isActiveTarget || isActiveIncoming || this.pendingMessageIds.has(lastMessage.id)) {
        this.mergeAssistantMessage(message);
        this.activeAssistantMessageId = lastMessage.id;
        return;
      }

      this.appendNewMessage(message, source);
      return;
    }

    if (message.id && lastMessage.id && message.id !== lastMessage.id) {
      this.appendNewMessage(message, source);
      return;
    }

    this.mergeAssistantMessage(message);
  }

  private appendNewMessage(message: UIMessage, source: MessageSource): void {
    const cloned = this.cloneMessage(message);
    this.ensureMessageId(cloned);
    this.messages.push(cloned);
    this.pendingMessageIds.add(cloned.id);
    this.registerToolParts(this.messages.length - 1);
    this.log("append-message", { messageId: cloned.id, role: cloned.role, source });

    if (source === "memory") {
      this.pendingMessageIds.delete(cloned.id);
    }

    if (source === "response") {
      this.activeAssistantMessageId = cloned.id;
    }
  }

  private registerToolParts(messageIndex: number): void {
    const message = this.messages[messageIndex];
    for (let index = 0; index < message.parts.length; index++) {
      const part = message.parts[index] as any;
      if (typeof part?.type === "string" && part.type.startsWith("tool-") && part.toolCallId) {
        this.toolPartIndex.set(part.toolCallId, {
          messageIndex,
          partIndex: index,
        });
      }
    }
  }

  private findLastAssistantIndex(options?: { pendingOnly?: boolean }): number {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === "assistant") {
        if (options?.pendingOnly && !this.pendingMessageIds.has(this.messages[i].id)) {
          continue;
        }
        return i;
      }
    }
    return -1;
  }

  private ensureMessageId(message: UIMessage): void {
    if (!message.id) {
      message.id = randomUUID();
    }
  }

  private cloneMessage(message: UIMessage): UIMessage {
    return {
      ...message,
      parts: message.parts.map((part) => ({ ...part })),
      metadata: message.metadata ? { ...message.metadata } : undefined,
    } as UIMessage;
  }

  private buildSignatureCounts(parts: UIMessagePart<any, any>[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const part of parts) {
      const signature = this.getPartSignature(part);
      counts.set(signature, (counts.get(signature) ?? 0) + 1);
    }
    return counts;
  }

  private incrementSignatureCount(counts: Map<string, number>, signature: string): void {
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
  }

  private ensureStepStartBeforeText(target: UIMessage, targetCounts: Map<string, number>): boolean {
    const prev = target.parts.at(-1) as UIMessagePart<any, any> | undefined;
    if (
      prev &&
      typeof prev.type === "string" &&
      prev.type.startsWith("tool-") &&
      (prev as any).state === "output-available"
    ) {
      const alreadyStepStart = target.parts.at(-1)?.type === "step-start";
      if (!alreadyStepStart) {
        const step = { type: "step-start" } as UIMessagePart<any, any>;
        target.parts.push(step);
        this.incrementSignatureCount(targetCounts, this.getPartSignature(step));
        return true;
      }
    }
    return false;
  }

  private tryMergeToolPart(
    target: UIMessage,
    messageIndex: number,
    part: UIMessagePart<any, any>,
    targetCounts: Map<string, number>,
    clonePart: <T extends UIMessagePart<any, any>>(value: T) => T,
  ): "none" | "updated" | "appended" {
    if (typeof part.type !== "string" || !part.type.startsWith("tool-")) {
      return "none";
    }

    const toolCallId = (part as any).toolCallId as string | undefined;
    if (!toolCallId) {
      return "none";
    }

    const existing = this.toolPartIndex.get(toolCallId);
    if (existing && this.messages[existing.messageIndex]) {
      const existingMessage = this.messages[existing.messageIndex];
      const existingPart = existingMessage.parts[existing.partIndex] as any;

      if (existingPart) {
        existingPart.state = (part as any).state ?? existingPart.state;
        if ("input" in part) {
          const incomingInput = (part as any).input;
          const shouldUpdateInput =
            incomingInput !== undefined &&
            incomingInput !== null &&
            (typeof incomingInput !== "object" || Object.keys(incomingInput).length > 0);

          if (shouldUpdateInput) {
            existingPart.input = incomingInput;
          }
        }
        if ("output" in part) existingPart.output = (part as any).output;
        if ((part as any).providerExecuted !== undefined) {
          existingPart.providerExecuted = (part as any).providerExecuted;
        }
        if ((part as any).isError !== undefined) {
          existingPart.isError = (part as any).isError;
        }
        if ((part as any).errorText !== undefined) {
          existingPart.errorText = (part as any).errorText;
        }
        if ((part as any).callProviderMetadata) {
          existingPart.callProviderMetadata = (part as any).callProviderMetadata;
        }
        if ((part as any).approval !== undefined) {
          existingPart.approval = (part as any).approval;
        }
        return "updated";
      }
    }

    const clonedPart = clonePart(part);
    target.parts.push(clonedPart);
    this.toolPartIndex.set(toolCallId, {
      messageIndex,
      partIndex: target.parts.length - 1,
    });
    this.incrementSignatureCount(targetCounts, this.getPartSignature(clonedPart));
    return "appended";
  }

  private updateExistingPartWithLatestData(
    target: UIMessage,
    signature: string,
    occurrenceIndex: number,
    incomingPart: UIMessagePart<any, any>,
    cloneValue: <T>(value: T) => T,
  ): boolean {
    let updated = false;
    let seen = 0;
    for (const part of target.parts) {
      if (this.getPartSignature(part) !== signature) continue;
      if (seen === occurrenceIndex) {
        if (incomingPart.type === "text" && (incomingPart as any).providerMetadata) {
          const targetPart = part as any;
          targetPart.providerMetadata = {
            ...(targetPart.providerMetadata || {}),
            ...cloneValue((incomingPart as any).providerMetadata),
          };
          updated = true;
        } else if (incomingPart.type === "reasoning") {
          const targetPart = part as any;
          if (typeof incomingPart.text === "string" && incomingPart.text.trim()) {
            targetPart.text = incomingPart.text;
            updated = true;
          }
          if ((incomingPart as any).providerMetadata) {
            targetPart.providerMetadata = {
              ...(targetPart.providerMetadata || {}),
              ...cloneValue((incomingPart as any).providerMetadata),
            };
            updated = true;
          }
        }
        return updated;
      }
      seen += 1;
    }
    return updated;
  }

  private getPartSignature(part: UIMessagePart<any, any>): string {
    switch (part.type) {
      case "text":
        return `text:${part.text}:${JSON.stringify((part as any).providerMetadata ?? null)}`;
      case "reasoning": {
        const reasoningText = typeof (part as any).text === "string" ? (part as any).text : "";
        const reasoningId =
          typeof (part as any).reasoningId === "string" ? (part as any).reasoningId.trim() : "";
        const openaiItemId = extractOpenAIItemId((part as any).providerMetadata);
        return `reasoning:${reasoningText}:${reasoningId}:${openaiItemId}`;
      }
      case "step-start":
        return "step-start";
      default: {
        if (typeof part.type === "string" && part.type.startsWith("tool-")) {
          return `${part.type}:${(part as any).toolCallId}:${(part as any).state}`;
        }
        return `${part.type}:${JSON.stringify(part)}`;
      }
    }
  }

  private log(message: string, data?: Record<string, unknown>): void {
    this.logger?.debug?.(`[ConversationBuffer] ${message}`, data);
  }
}
