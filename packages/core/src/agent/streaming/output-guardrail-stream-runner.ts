import { type Span, SpanStatusCode } from "@opentelemetry/api";
import { safeStringify } from "@voltagent/internal/utils";
import { NodeType } from "../../utils/node-utils";
import type { Agent } from "../agent";
import { createVoltAgentError } from "../errors";
import {
  type NormalizedOutputGuardrail,
  type OutputGuardrailMetadata,
  STREAM_GUARDRAIL_SPANS_KEY,
  runOutputGuardrails,
} from "../guardrail";
import type { VoltAgentTextStreamPart } from "../subagent/types";
import type {
  AgentEvalOperationType,
  OperationContext,
  OutputGuardrailStreamArgs,
  OutputGuardrailStreamHandler,
} from "../types";

type GuardrailStreamState = {
  span: Span | null;
  parts: VoltAgentTextStreamPart[];
  state: Record<string, any>;
  chunkCount: number;
  filteredCount: number;
  modifiedCount: number;
  ended: boolean;
};

type RunnerOptions = {
  guardrails: NormalizedOutputGuardrail[];
  agent: Agent;
  operationContext: OperationContext;
  operation: AgentEvalOperationType;
};

const isTextDelta = (part: VoltAgentTextStreamPart): boolean => part.type === "text-delta";

const extractChunkText = (part: VoltAgentTextStreamPart): string => {
  if (!isTextDelta(part)) {
    return "";
  }
  const delta = (part as { delta?: string }).delta;
  if (typeof delta === "string") {
    return delta;
  }
  const text = (part as { text?: string }).text;
  return typeof text === "string" ? text : "";
};

const clonePart = (part: VoltAgentTextStreamPart): VoltAgentTextStreamPart => {
  return { ...part };
};

export class OutputGuardrailStreamRunner {
  private readonly guardrails: NormalizedOutputGuardrail[];
  private readonly agent: Agent;
  private readonly operationContext: OperationContext;
  private readonly operation: AgentEvalOperationType;
  private readonly guardrailStates: GuardrailStreamState[];

  private sanitizedText = "";
  private originalText = "";
  private finalizedText: string | null = null;
  private finalized = false;
  private finalizingPromise: Promise<void> | null = null;
  private abortedError: Error | null = null;

  constructor(options: RunnerOptions) {
    this.guardrails = options.guardrails;
    this.agent = options.agent;
    this.operationContext = options.operationContext;
    this.operation = options.operation;
    this.guardrailStates = options.guardrails.map((guardrail, index) => {
      const span = this.createGuardrailSpan(guardrail, index);
      this.registerStreamSpan(index, span);
      return {
        span,
        parts: [],
        state: Object.create(null),
        chunkCount: 0,
        filteredCount: 0,
        modifiedCount: 0,
        ended: false,
      };
    });
  }

  async processPart(part: VoltAgentTextStreamPart): Promise<VoltAgentTextStreamPart | null> {
    this.ensureNotAborted();

    let currentPart: VoltAgentTextStreamPart | null = part;
    const originalText = extractChunkText(part);
    if (originalText) {
      this.originalText += originalText;
    }

    for (let index = 0; index < this.guardrails.length; index++) {
      if (!currentPart) {
        break;
      }

      const guardrail = this.guardrails[index];
      const handler = guardrail.streamHandler as OutputGuardrailStreamHandler | undefined;
      const state = this.guardrailStates[index];
      const span = state.span;

      if (!handler) {
        state.parts.push(clonePart(currentPart));
        continue;
      }

      state.chunkCount += 1;
      const beforeText = extractChunkText(currentPart);
      const args: OutputGuardrailStreamArgs = {
        part: currentPart,
        streamParts: state.parts,
        state: state.state,
        abort: (reason?: string) => this.abort(guardrail, index, reason),
        agent: this.agent,
        context: this.operationContext,
        operation: this.operation,
      };

      let processed: VoltAgentTextStreamPart | null | undefined;
      try {
        processed = await handler(args);
      } catch (error) {
        this.recordGuardrailError(state, guardrail, error);
        throw error;
      }

      if (processed === undefined || processed === null) {
        state.filteredCount += 1;
        this.addSpanEvent(span, "guardrail.stream.filter", {
          "guardrail.chunk.index": state.chunkCount,
          "guardrail.chunk.type": currentPart.type,
        });
        currentPart = null;
        break;
      }

      const afterText = extractChunkText(processed);
      if (afterText !== beforeText) {
        state.modifiedCount += 1;
      }

      state.parts.push(clonePart(processed));

      this.addSpanEvent(span, "guardrail.stream.process", {
        "guardrail.chunk.index": state.chunkCount,
        "guardrail.chunk.type": processed.type,
        ...(afterText ? { "guardrail.chunk.text": afterText } : {}),
        ...(afterText !== beforeText
          ? { "guardrail.chunk.action": "modify" }
          : { "guardrail.chunk.action": "pass" }),
      });

      currentPart = processed;
    }

    if (currentPart && isTextDelta(currentPart)) {
      const sanitizedChunk = extractChunkText(currentPart);
      if (sanitizedChunk) {
        this.sanitizedText += sanitizedChunk;
      }
    } else if (originalText && !currentPart && this.guardrails.length === 0) {
      // No streaming guardrail modified the chunk but chunk removed somewhere else.
      this.sanitizedText += originalText;
    }

    return currentPart;
  }

  async finalize(metadata: OutputGuardrailMetadata): Promise<void> {
    if (this.abortedError) {
      throw this.abortedError;
    }

    if (this.finalizingPromise) {
      await this.finalizingPromise;
      return;
    }

    this.finalizingPromise = this.performFinalize(metadata);
    await this.finalizingPromise;
    this.finalizingPromise = null;
  }

  getSanitizedText(): string {
    return this.finalizedText ?? this.sanitizedText;
  }

  private async performFinalize(metadata: OutputGuardrailMetadata): Promise<void> {
    if (this.finalized) {
      return;
    }

    this.finalized = true;

    try {
      const currentText = this.sanitizedText;
      if (!this.guardrails.length) {
        this.finalizedText = currentText;
        this.endGuardrailSpans(SpanStatusCode.OK);
        return;
      }

      this.endGuardrailSpans(SpanStatusCode.OK, false);
      const finalText = await runOutputGuardrails<string>({
        output: currentText,
        operationContext: this.operationContext,
        guardrails: this.guardrails,
        operation: this.operation,
        agent: this.agent,
        metadata,
        originalOutputOverride: this.originalText || currentText,
      });

      this.finalizedText = finalText;
      this.sanitizedText = finalText;
    } catch (error) {
      this.recordFinalizeError(error);
      throw error;
    }
  }

  private ensureNotAborted(): void {
    if (this.abortedError) {
      throw this.abortedError;
    }
  }

  private abort(guardrail: NormalizedOutputGuardrail, index: number, reason?: string): never {
    const message =
      reason ?? `Stream aborted by guardrail "${guardrail.name}" (${guardrail.id ?? index + 1})`;
    const error = createVoltAgentError(message, { code: "GUARDRAIL_OUTPUT_BLOCKED" });
    this.abortedError = error;

    const state = this.guardrailStates[index];
    if (state.span && !state.ended) {
      state.span.setStatus({ code: SpanStatusCode.ERROR, message });
      state.span.addEvent("guardrail.stream.abort", {
        "guardrail.reason": message,
      });
      state.span.end();
      state.ended = true;
    }

    this.operationContext.isActive = false;
    this.operationContext.traceContext.end("error", error);

    throw error;
  }

  private recordGuardrailError(
    state: GuardrailStreamState,
    guardrail: NormalizedOutputGuardrail,
    error: unknown,
  ): void {
    if (!state.span || state.ended) {
      return;
    }
    const normalizedError =
      error instanceof Error ? error : new Error(`Guardrail stream error: ${String(error)}`);
    state.span.recordException(normalizedError);
    state.span.setStatus({
      code: SpanStatusCode.ERROR,
      message:
        normalizedError instanceof Error
          ? normalizedError.message
          : `Guardrail stream handler error (${guardrail.name})`,
    });
    state.span.end();
    state.ended = true;
  }

  private recordFinalizeError(error: unknown): void {
    for (const state of this.guardrailStates) {
      if (!state.span || state.ended) {
        continue;
      }
      const normalizedError =
        error instanceof Error ? error : new Error(`Guardrail finalize error: ${String(error)}`);
      state.span.recordException(normalizedError);
      state.span.setStatus({
        code: SpanStatusCode.ERROR,
        message: normalizedError.message,
      });
      state.span.end();
      state.ended = true;
    }
  }

  private endGuardrailSpans(status: SpanStatusCode, endSpan = true): void {
    for (const [index, state] of this.guardrailStates.entries()) {
      if (!state.span || state.ended) {
        continue;
      }
      state.span.setAttribute("guardrail.stream.chunks", state.chunkCount);
      state.span.setAttribute("guardrail.stream.modified", state.modifiedCount);
      state.span.setAttribute("guardrail.stream.filtered", state.filteredCount);
      state.span.setStatus({ code: status });
      if (endSpan) {
        state.span.end();
        state.ended = true;
      }

      // Update operation context logger for visibility in VoltOps
      this.operationContext.logger.debug("Guardrail stream finalized", {
        guardrail: this.guardrails[index].name,
        chunks: state.chunkCount,
        modified: state.modifiedCount,
        filtered: state.filteredCount,
      });
    }
  }

  private createGuardrailSpan(guardrail: NormalizedOutputGuardrail, index: number): Span | null {
    const handler = guardrail.streamHandler;
    if (!this.operationContext.traceContext || !handler) {
      return null;
    }

    const span = this.operationContext.traceContext.createChildSpan(
      `guardrail.output.stream.${guardrail.id ?? index + 1}`,
      "guardrail",
      {
        label: guardrail.name,
        attributes: {
          "entity.type": NodeType.GUARDRAIL,
          "guardrail.direction": "output",
          "guardrail.mode": "stream",
          "guardrail.operation": this.operation,
          "guardrail.index": index,
          ...(guardrail.id ? { "guardrail.id": guardrail.id } : {}),
          "guardrail.name": guardrail.name,
          ...(guardrail.description ? { "guardrail.description": guardrail.description } : {}),
          ...(guardrail.severity ? { "guardrail.severity": guardrail.severity } : {}),
          ...(guardrail.tags && guardrail.tags.length > 0
            ? { "guardrail.tags": safeStringify(guardrail.tags) }
            : {}),
          ...(guardrail.metadata
            ? { "guardrail.metadata": safeStringify(guardrail.metadata) }
            : {}),
        },
      },
    );

    this.addSpanEvent(span, "guardrail.stream.start", {
      "guardrail.stream.handler": true,
    });

    return span;
  }

  private registerStreamSpan(index: number, span: Span | null): void {
    if (!span) {
      return;
    }

    const guardrail = this.guardrails[index];
    const guardrailKey = guardrail.id ?? index;

    let map = this.operationContext.context.get(STREAM_GUARDRAIL_SPANS_KEY) as
      | Map<string | number, Span>
      | undefined;

    if (!map) {
      map = new Map<string | number, Span>();
      this.operationContext.context.set(STREAM_GUARDRAIL_SPANS_KEY, map);
    }

    map.set(guardrailKey, span);
  }

  private addSpanEvent(span: Span | null, name: string, attributes?: Record<string, any>): void {
    span?.addEvent(name, attributes);
  }
}
