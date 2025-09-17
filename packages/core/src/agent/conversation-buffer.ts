import crypto from "node:crypto";
import type { ModelMessage } from "@ai-sdk/provider-utils";
import type { Logger } from "@voltagent/internal";
import type { UIMessage, UIMessagePart } from "ai";

import { convertModelMessagesToUIMessages } from "../utils/message-converter";

type MessageSource = "user" | "system" | "memory" | "response";

interface PendingMessage {
  id: string;
  message: UIMessage;
}

/**
 * Lightweight buffer that merges tool call/result pairs while keeping VoltAgent's UIMessage format intact.
 */
export class ConversationBuffer {
  private messages: UIMessage[] = [];
  private pendingMessageIds = new Set<string>();
  private toolPartIndex = new Map<string, { messageIndex: number; partIndex: number }>();
  private partSignatureIndex = new Map<string, Set<string>>();
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

  private appendExistingMessage(
    message: UIMessage,
    options: { markAsSaved?: boolean } = { markAsSaved: true },
  ): void {
    const hydrated = this.cloneMessage(message);
    this.ensureMessageId(hydrated);
    this.messages.push(hydrated);
    this.registerToolParts(this.messages.length - 1);
    this.registerPartSignatures(this.messages.length - 1);

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
    const signatures = this.ensureSignatureSet(target.id);
    const originalLength = target.parts.length;

    if (message.metadata) {
      target.metadata = {
        ...(target.metadata || {}),
        ...message.metadata,
      } as UIMessage["metadata"];
    }

    message.parts.forEach((part) =>
      this.mergeAssistantPart(target, lastAssistantIndex, part, signatures),
    );

    if (target.parts.length !== originalLength) {
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

  private mergeAssistantPart(
    target: UIMessage,
    messageIndex: number,
    part: UIMessagePart<any, any>,
    signatures: Set<string>,
  ): void {
    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      const toolCallId = (part as any).toolCallId as string | undefined;
      if (!toolCallId) {
        this.appendPartIfNew(target, part, signatures);
        return;
      }

      const existing = this.toolPartIndex.get(toolCallId);
      if (existing && this.messages[existing.messageIndex]) {
        const existingMessage = this.messages[existing.messageIndex];
        const existingPart = existingMessage.parts[existing.partIndex] as any;

        if (existingPart) {
          existingPart.state = (part as any).state ?? existingPart.state;
          if ("input" in part) existingPart.input = (part as any).input;
          if ("output" in part) existingPart.output = (part as any).output;
          if ((part as any).providerExecuted !== undefined) {
            existingPart.providerExecuted = (part as any).providerExecuted;
          }
          if ((part as any).callProviderMetadata) {
            existingPart.callProviderMetadata = (part as any).callProviderMetadata;
          }
          this.pendingMessageIds.add(existingMessage.id);
          signatures.add(this.getPartSignature(existingPart));
          return;
        }
      }

      this.appendPartIfNew(target, part, signatures);
      this.toolPartIndex.set(toolCallId, {
        messageIndex,
        partIndex: target.parts.length - 1,
      });
      return;
    }

    if (part.type === "step-start") {
      const prev = target.parts.at(-1);
      if (!prev || prev.type === "step-start") {
        return;
      }
      this.appendPartIfNew(target, part, signatures);
      return;
    }

    if (part.type === "text") {
      const prev = target.parts.at(-1) as UIMessagePart<any, any> | undefined;
      if (prev?.type === "text") {
        const sameText = prev.text === part.text;
        const sameMetadata =
          JSON.stringify((prev as any).providerMetadata ?? null) ===
          JSON.stringify((part as any).providerMetadata ?? null);
        if (sameText && sameMetadata) {
          this.log("skip-duplicate-text", { messageId: target.id, text: part.text });
          return;
        }
      }
      if (
        prev &&
        typeof prev.type === "string" &&
        prev.type.startsWith("tool-") &&
        typeof (prev as any).state === "string" &&
        (prev as any).state === "output-available"
      ) {
        this.appendPartIfNew(target, { type: "step-start" } as any, signatures);
        this.log("insert-step-start", {
          messageId: target.id,
          toolCallId: (prev as any).toolCallId,
        });
      }
    }

    this.appendPartIfNew(target, part, signatures);
  }

  private appendPartIfNew(
    message: UIMessage,
    part: UIMessagePart<any, any>,
    signatures: Set<string>,
  ): void {
    const signature = this.getPartSignature(part);
    if (signatures.has(signature)) {
      this.log("skip-duplicate-part", {
        messageId: message.id,
        partType: (part as any).type,
      });
      return;
    }

    message.parts.push(part);
    signatures.add(signature);
    this.log("append-part", {
      messageId: message.id,
      partType: (part as any).type,
      toolCallId: (part as any).toolCallId,
    });
  }

  private appendNewMessage(message: UIMessage, source: MessageSource): void {
    const cloned = this.cloneMessage(message);
    this.ensureMessageId(cloned);
    this.messages.push(cloned);
    this.pendingMessageIds.add(cloned.id);
    this.registerToolParts(this.messages.length - 1);
    this.registerPartSignatures(this.messages.length - 1);
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

  private registerPartSignatures(messageIndex: number): void {
    const message = this.messages[messageIndex];
    const signatureSet = this.ensureSignatureSet(message.id);
    signatureSet.clear();
    for (const part of message.parts) {
      signatureSet.add(this.getPartSignature(part));
    }
  }

  private ensureSignatureSet(messageId: string): Set<string> {
    let set = this.partSignatureIndex.get(messageId);
    if (!set) {
      set = new Set<string>();
      this.partSignatureIndex.set(messageId, set);
    }
    return set;
  }

  private findLastAssistantIndex(): number {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].role === "assistant") {
        return i;
      }
    }
    return -1;
  }

  private ensureMessageId(message: UIMessage): void {
    if (!message.id) {
      message.id = crypto.randomUUID();
    }
  }

  private cloneMessage(message: UIMessage): UIMessage {
    return {
      ...message,
      parts: message.parts.map((part) => ({ ...part })),
      metadata: message.metadata ? { ...message.metadata } : undefined,
    } as UIMessage;
  }

  private getPartSignature(part: UIMessagePart<any, any>): string {
    switch (part.type) {
      case "text":
        return `text:${part.text}:${JSON.stringify((part as any).providerMetadata ?? null)}`;
      case "reasoning":
        return `reasoning:${part.text}`;
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
