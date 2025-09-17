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
    _fullStream: AsyncIterable<any>,
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
  async pipeFrom(
    fullStream: AsyncIterable<any>,
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

      // Convert StreamPart to WorkflowStreamEvent with proper field mapping
      this.write({
        type: `${prefix}${part.type}`,
        from: options?.agentId || part.subAgentId || part.subAgentName || this.stepName,
        // Use proper WorkflowStreamEvent fields
        input: part.type === "tool-call" ? part.args : undefined,
        output:
          part.type === "text-delta"
            ? part.textDelta
            : part.type === "tool-result"
              ? part.result
              : undefined,
        metadata: {
          originalType: part.type,
          // Only include relevant metadata per type
          ...(part.type === "tool-call" && {
            toolName: part.toolName,
            toolCallId: part.toolCallId,
          }),
          ...(part.type === "tool-result" && {
            toolName: part.toolName,
            toolCallId: part.toolCallId,
          }),
          ...(part.type === "finish" && {
            finishReason: part.finishReason,
            usage: part.usage,
          }),
          ...(part.type === "error" && { error: part.error }),
        },
      });
    }
  }
}
