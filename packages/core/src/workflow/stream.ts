import type { DangerouslyAllowAny } from "@voltagent/internal/types";
import type { VoltAgentTextStreamPart } from "../agent/subagent/types";
import type { UserContext } from "../agent/types";
import type { WorkflowStreamEvent, WorkflowStreamWriter } from "./types";

/**
 * Controller for managing workflow stream execution
 */
export class WorkflowStreamController {
  private eventQueue: WorkflowStreamEvent[] = [];
  private eventEmitter: EventTarget;
  private abortController: AbortController;
  private isClosed = false;

  constructor() {
    this.eventEmitter = new EventTarget();
    this.abortController = new AbortController();
  }

  /**
   * Emit an event to the stream
   */
  emit(event: WorkflowStreamEvent): void {
    if (this.isClosed) return;

    this.eventQueue.push(event);
    this.eventEmitter.dispatchEvent(new CustomEvent("event", { detail: event }));
  }

  /**
   * Get async iterator for stream events
   */
  async *getStream(): AsyncIterableIterator<WorkflowStreamEvent> {
    const processedIndices = new Set<number>();

    while (!this.isClosed || this.eventQueue.length > 0) {
      // Process any queued events
      for (let i = 0; i < this.eventQueue.length; i++) {
        if (!processedIndices.has(i)) {
          processedIndices.add(i);
          yield this.eventQueue[i];
        }
      }

      if (this.isClosed) break;

      // Wait for next event
      await new Promise<void>((resolve) => {
        const handler = () => {
          resolve();
        };
        this.eventEmitter.addEventListener("event", handler, { once: true });

        // Also listen for abort
        if (this.abortController.signal.aborted) {
          this.eventEmitter.removeEventListener("event", handler);
          resolve();
        }
      });
    }
  }

  /**
   * Close the stream
   */
  close(): void {
    this.isClosed = true;
    this.eventEmitter.dispatchEvent(new Event("close"));
  }

  /**
   * Abort the stream
   */
  abort(): void {
    this.abortController.abort();
    this.close();
  }

  /**
   * Get abort signal
   */
  get signal(): AbortSignal {
    return this.abortController.signal;
  }
}

/**
 * No-op implementation of WorkflowStreamWriter for non-streaming execution
 * This writer silently discards all events, used when .run() is called
 */
export class NoOpWorkflowStreamWriter implements WorkflowStreamWriter {
  write(_event: Partial<WorkflowStreamEvent> & { type: string }): void {
    // Do nothing - events are discarded when not streaming
  }

  async pipeFrom(
    _fullStream: AsyncIterable<VoltAgentTextStreamPart<any>>,
    _options?: {
      prefix?: string;
      agentId?: string;
      filter?: (part: any) => boolean;
    },
  ): Promise<void> {
    // Do nothing - just consume the stream without emitting events
    for await (const _ of _fullStream) {
      // Consume but discard
    }
  }
}

/**
 * Implementation of WorkflowStreamWriter
 */
export class WorkflowStreamWriterImpl implements WorkflowStreamWriter {
  constructor(
    private controller: WorkflowStreamController,
    private executionId: string,
    private stepId: string,
    private stepName: string,
    private stepIndex: number,
    private context?: UserContext,
  ) {}

  /**
   * Write a custom event to the stream
   */
  write(event: Partial<WorkflowStreamEvent> & { type: string }): void {
    this.controller.emit({
      type: event.type,
      executionId: this.executionId,
      from: event.from || this.stepName || this.stepId,
      input: event.input,
      output: event.output,
      status: event.status || "running",
      context: event.context || this.context,
      timestamp: event.timestamp || new Date().toISOString(),
      stepIndex: event.stepIndex ?? this.stepIndex,
      metadata: event.metadata,
      error: event.error,
    });
  }

  /**
   * Pipe events from an agent's fullStream to the workflow stream
   */
  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: workflow stream merging handles multiple event types
  async pipeFrom(
    fullStream: AsyncIterable<VoltAgentTextStreamPart<any>>,
    options?: {
      prefix?: string;
      agentId?: string;
      filter?: (part: any) => boolean;
    },
  ): Promise<void> {
    const prefix = options?.prefix || "";

    for await (const part of fullStream) {
      // Apply filter if provided
      if (options?.filter && !options.filter(part)) {
        continue;
      }

      const type: WorkflowStreamEvent["type"] =
        `${prefix}${part.type}` as WorkflowStreamEvent["type"];
      // Convert StreamPart to WorkflowStreamEvent with proper field mapping
      const metadata: Record<string, DangerouslyAllowAny> = {
        originalType: part.type,
      };

      if ("id" in part && part.id !== undefined) {
        metadata.partId = part.id;
      }

      if ("providerMetadata" in part && part.providerMetadata !== undefined) {
        metadata.providerMetadata = part.providerMetadata;
      }

      if (part.subAgentId) {
        metadata.subAgentId = part.subAgentId;
      }

      if (part.subAgentName) {
        metadata.subAgentName = part.subAgentName;
      }

      if (part.executingAgentId) {
        metadata.executingAgentId = part.executingAgentId;
      }

      if (part.executingAgentName) {
        metadata.executingAgentName = part.executingAgentName;
      }

      if (part.parentAgentId) {
        metadata.parentAgentId = part.parentAgentId;
      }

      if (part.parentAgentName) {
        metadata.parentAgentName = part.parentAgentName;
      }

      if (part.agentPath) {
        metadata.agentPath = part.agentPath;
      }

      let input: DangerouslyAllowAny | undefined;
      let output: DangerouslyAllowAny | undefined;
      let status: WorkflowStreamEvent["status"] | undefined;
      let error: DangerouslyAllowAny | undefined;

      switch (part.type) {
        case "text-delta": {
          const delta =
            part.text ?? ("delta" in part ? (part as { delta?: string }).delta : undefined);
          if (delta !== undefined) {
            output = delta;
          }
          break;
        }
        case "tool-call": {
          metadata.toolName = part.toolName;
          metadata.toolCallId = part.toolCallId;

          if (part.providerExecuted !== undefined) {
            metadata.providerExecuted = part.providerExecuted;
          }

          if (part.dynamic !== undefined) {
            metadata.dynamic = part.dynamic;
          }

          if ("invalid" in part && part.invalid !== undefined) {
            metadata.invalid = part.invalid;
          }

          if ("error" in part && part.error !== undefined) {
            metadata.toolCallError = part.error;
          }

          input = part.input;
          break;
        }
        case "tool-result": {
          metadata.toolName = part.toolName;
          metadata.toolCallId = part.toolCallId;

          if (part.providerExecuted !== undefined) {
            metadata.providerExecuted = part.providerExecuted;
          }

          if (part.dynamic !== undefined) {
            metadata.dynamic = part.dynamic;
          }

          if ("preliminary" in part && part.preliminary !== undefined) {
            metadata.preliminary = part.preliminary;
          }

          input = part.input;
          output = part.output;
          break;
        }
        case "tool-error": {
          metadata.toolName = part.toolName;
          metadata.toolCallId = part.toolCallId;

          if (part.providerExecuted !== undefined) {
            metadata.providerExecuted = part.providerExecuted;
          }

          if (part.dynamic !== undefined) {
            metadata.dynamic = part.dynamic;
          }

          input = part.input;
          error = part.error;
          status = "error";
          break;
        }
        case "finish": {
          metadata.finishReason = part.finishReason;
          metadata.usage = part.totalUsage;
          status = "success";
          break;
        }
        case "error": {
          error = part.error;
          metadata.error = part.error;
          status = "error";
          break;
        }
        case "reasoning-delta": {
          metadata.reasoningText = part.text;
          break;
        }
        case "tool-input-start": {
          metadata.toolName = part.toolName;
          if (part.providerExecuted !== undefined) {
            metadata.providerExecuted = part.providerExecuted;
          }
          if (part.dynamic !== undefined) {
            metadata.dynamic = part.dynamic;
          }
          break;
        }
        case "tool-input-delta": {
          metadata.toolInputDelta = part.delta;
          break;
        }
        case "start-step": {
          metadata.request = part.request;
          metadata.warnings = part.warnings;
          break;
        }
        case "finish-step": {
          metadata.response = part.response;
          metadata.usage = part.usage;
          metadata.finishReason = part.finishReason;
          break;
        }
        case "source": {
          metadata.source = part;
          break;
        }
        case "file": {
          metadata.file = part.file;
          break;
        }
        case "raw": {
          metadata.rawValue = part.rawValue;
          break;
        }
        case "abort": {
          metadata.aborted = true;
          status = "error";
          break;
        }
        default: {
          // Other event types don't need special handling
          break;
        }
      }

      this.write({
        type,
        from: options?.agentId || part.subAgentId || part.subAgentName || this.stepName,
        input,
        output,
        status,
        error,
        metadata,
      });
    }
  }
}
