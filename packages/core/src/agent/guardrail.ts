import { type Span, SpanStatusCode } from "@opentelemetry/api";
import { safeStringify } from "@voltagent/internal/utils";
import { convertToModelMessages } from "ai";
import type { UIMessage } from "ai";
import { extractText } from "../utils/message-helpers";
import { NodeType } from "../utils/node-utils";
import type { Agent } from "./agent";
import { createVoltAgentError } from "./errors";
import type { BaseMessage } from "./providers/base/types";
import type {
  AgentEvalOperationType,
  GuardrailAction,
  GuardrailDefinition,
  GuardrailFunction,
  GuardrailSeverity,
  InputGuardrail,
  InputGuardrailArgs,
  InputGuardrailResult,
  OperationContext,
  OutputGuardrail,
  OutputGuardrailArgs,
  OutputGuardrailDefinition,
  OutputGuardrailFunction,
  OutputGuardrailResult,
  OutputGuardrailStreamHandler,
} from "./types";

export type GuardrailDirection = "input" | "output";

export interface NormalizedGuardrail<TArgs, TResult> {
  id?: string;
  name: string;
  description?: string;
  tags?: string[];
  severity?: GuardrailSeverity;
  metadata?: Record<string, unknown>;
  handler: GuardrailFunction<TArgs, TResult>;
}

type EmptyGuardrailExtras = Record<never, never>;

type CreateGuardrailDefinition<
  TArgs,
  TResult,
  TExtra extends Record<PropertyKey, unknown> = EmptyGuardrailExtras,
> = Omit<GuardrailDefinition<TArgs, TResult>, keyof TExtra | "handler"> &
  TExtra & {
    handler: GuardrailFunction<TArgs, TResult>;
  };

export type CreateInputGuardrailOptions = CreateGuardrailDefinition<
  InputGuardrailArgs,
  InputGuardrailResult
>;

export type CreateOutputGuardrailOptions<TOutput = unknown> = CreateGuardrailDefinition<
  OutputGuardrailArgs<TOutput>,
  OutputGuardrailResult<TOutput>,
  { streamHandler?: OutputGuardrailStreamHandler }
>;

export function createInputGuardrail(options: CreateInputGuardrailOptions): InputGuardrail {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    tags: options.tags,
    severity: options.severity,
    metadata: options.metadata,
    handler: options.handler,
  };
}

export function createOutputGuardrail<TOutput = unknown>(
  options: CreateOutputGuardrailOptions<TOutput>,
): OutputGuardrail<TOutput> {
  const handler = options.handler as OutputGuardrailFunction<TOutput>;
  handler.guardrailStreamHandler = options.streamHandler;
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    tags: options.tags,
    severity: options.severity,
    metadata: options.metadata,
    handler,
    streamHandler: options.streamHandler,
  };
}

export type NormalizedInputGuardrail = NormalizedGuardrail<
  InputGuardrailArgs,
  InputGuardrailResult
>;

export type NormalizedOutputGuardrail = NormalizedGuardrail<
  OutputGuardrailArgs<any>,
  OutputGuardrailResult<any>
> & {
  streamHandler?: OutputGuardrailStreamHandler;
};

export const STREAM_GUARDRAIL_SPANS_KEY = Symbol("voltagent.streamGuardrailSpans");

export type OutputGuardrailMetadata = {
  usage?: unknown;
  finishReason?: string | null;
  warnings?: unknown[] | null;
};

export function getDefaultGuardrailName(direction: GuardrailDirection, index: number): string {
  const label = direction === "input" ? "Input" : "Output";
  return `${label} Guardrail #${index + 1}`;
}

export function normalizeGuardrailDefinition<TArgs, TResult>(
  guardrail: GuardrailDefinition<TArgs, TResult> | GuardrailFunction<TArgs, TResult>,
  direction: GuardrailDirection,
  index: number,
): NormalizedGuardrail<TArgs, TResult> {
  const defaultName = getDefaultGuardrailName(direction, index);

  if (typeof guardrail === "function") {
    const handler = guardrail as GuardrailFunction<TArgs, TResult>;
    return {
      id: handler.guardrailId,
      name: handler.guardrailName || handler.name || defaultName,
      description: handler.guardrailDescription,
      tags: handler.guardrailTags,
      severity: handler.guardrailSeverity,
      metadata: undefined,
      handler,
    };
  }

  if (typeof guardrail !== "object" || !guardrail) {
    throw new Error(`Invalid ${direction} guardrail configuration at index ${index}`);
  }

  const descriptor = guardrail as GuardrailDefinition<TArgs, TResult>;
  return {
    id: descriptor.id,
    name: descriptor.name || defaultName,
    description: descriptor.description,
    tags: descriptor.tags,
    severity: descriptor.severity,
    metadata: descriptor.metadata,
    handler: descriptor.handler,
  };
}

export function normalizeInputGuardrailList(
  guardrails: InputGuardrail[],
  startIndex = 0,
): NormalizedInputGuardrail[] {
  return guardrails.map((guardrail, index) =>
    normalizeGuardrailDefinition<InputGuardrailArgs, InputGuardrailResult>(
      guardrail,
      "input",
      startIndex + index,
    ),
  );
}

export function normalizeOutputGuardrailList(
  guardrails: OutputGuardrail<any>[],
  startIndex = 0,
): NormalizedOutputGuardrail[] {
  return guardrails.map((guardrail, index) => {
    const normalized = normalizeGuardrailDefinition<
      OutputGuardrailArgs<any>,
      OutputGuardrailResult<any>
    >(guardrail, "output", startIndex + index) as NormalizedOutputGuardrail;

    const streamHandler =
      typeof guardrail === "function"
        ? (guardrail as OutputGuardrailFunction<any>).guardrailStreamHandler
        : (guardrail as OutputGuardrailDefinition<any>).streamHandler;

    if (streamHandler) {
      normalized.streamHandler = streamHandler;
    }

    return normalized;
  });
}

export function serializeGuardrailValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return safeStringify(value);
}

export function extractInputTextForGuardrail(value: string | UIMessage[] | BaseMessage[]): string {
  if (typeof value === "string") {
    return value;
  }

  if (!Array.isArray(value) || value.length === 0) {
    return "";
  }

  const first = value[0] as Record<string, unknown>;
  let modelMessages: BaseMessage[];

  if (first && typeof first === "object" && "content" in first && "role" in first) {
    modelMessages = value as BaseMessage[];
  } else {
    try {
      modelMessages = convertToModelMessages(value as UIMessage[]);
    } catch {
      return "";
    }
  }

  return modelMessages
    .map((message) => {
      try {
        return extractText(message.content as any);
      } catch {
        return "";
      }
    })
    .filter((text) => typeof text === "string" && text.trim().length > 0)
    .join("\n")
    .trim();
}

export function extractOutputTextForGuardrail(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    try {
      return extractInputTextForGuardrail(value as any);
    } catch {
      return undefined;
    }
  }

  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }

  if (typeof value === "object") {
    try {
      return safeStringify(value);
    } catch {
      return undefined;
    }
  }

  try {
    return String(value);
  } catch {
    return undefined;
  }
}

export async function runInputGuardrails(
  input: string | UIMessage[] | BaseMessage[],
  oc: OperationContext,
  guardrails: NormalizedInputGuardrail[],
  operation: AgentEvalOperationType,
  agent: Agent,
): Promise<string | UIMessage[] | BaseMessage[]> {
  if (!guardrails.length) {
    return input;
  }

  const originalInput = input;
  let currentInput = input;
  const originalInputText = extractInputTextForGuardrail(originalInput);
  let currentInputText = originalInputText;

  for (let index = 0; index < guardrails.length; index++) {
    const guardrail = guardrails[index];
    const span = oc.traceContext.createChildSpan(
      `guardrail.input.${guardrail.id ?? index + 1}`,
      "guardrail",
      {
        label: guardrail.name,
        attributes: {
          // entity.type and entity.id are inherited from parent via commonAttributes
          "guardrail.type": NodeType.GUARDRAIL,
          "guardrail.direction": "input",
          "guardrail.operation": operation,
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
          "guardrail.input.original": serializeGuardrailValue(originalInput),
          "guardrail.input.current": serializeGuardrailValue(currentInput),
        },
      },
    );

    try {
      const decision = await oc.traceContext.withSpan(span, () =>
        guardrail.handler({
          input: currentInput,
          inputText: currentInputText,
          originalInput,
          originalInputText,
          agent,
          context: oc,
          operation,
        }),
      );

      const resolvedDecision: InputGuardrailResult = decision ?? { pass: true };
      const pass = resolvedDecision.pass !== false;
      const action: GuardrailAction = resolvedDecision.action
        ? resolvedDecision.action
        : pass
          ? "allow"
          : "block";

      span.setAttribute("guardrail.pass", pass);
      span.setAttribute("guardrail.action", action);
      if (resolvedDecision.message) {
        span.setAttribute("guardrail.message", resolvedDecision.message);
      }
      if (resolvedDecision.metadata) {
        span.setAttribute("guardrail.result.metadata", safeStringify(resolvedDecision.metadata));
      }

      if (!pass || action === "block") {
        const message = resolvedDecision.message ?? "Input blocked by guardrail";
        const guardrailError = createVoltAgentError(message, { code: "GUARDRAIL_INPUT_BLOCKED" });
        span.setStatus({ code: SpanStatusCode.ERROR, message });
        span.end();
        oc.isActive = false;
        oc.traceContext.end("error", guardrailError);
        throw guardrailError;
      }

      if (action === "modify" && resolvedDecision.modifiedInput !== undefined) {
        currentInput = resolvedDecision.modifiedInput;
        currentInputText = extractInputTextForGuardrail(currentInput);
      }

      span.setAttribute("guardrail.input.after", serializeGuardrailValue(currentInput));
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      oc.logger.debug("Input guardrail evaluated", {
        guardrail: guardrail.name,
        action,
        modified: action === "modify",
      });
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Guardrail error" });
      }
      span.end();
      throw error;
    }
  }

  if (currentInput !== originalInput) {
    oc.traceContext.setInput(currentInput);
  }

  return currentInput;
}

export type RunOutputGuardrailsOptions<TOutput> = {
  output: TOutput;
  operationContext: OperationContext;
  guardrails: NormalizedOutputGuardrail[];
  operation: AgentEvalOperationType;
  agent: Agent;
  metadata?: OutputGuardrailMetadata;
  originalOutputOverride?: TOutput;
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: guardrail pipeline handles multiple branches for streaming + final hooks
export async function runOutputGuardrails<TOutput>({
  output,
  operationContext: oc,
  guardrails,
  operation,
  agent,
  metadata = {},
  originalOutputOverride,
}: RunOutputGuardrailsOptions<TOutput>): Promise<TOutput> {
  if (!guardrails.length) {
    return output;
  }

  const originalOutput = originalOutputOverride ?? output;
  let currentOutput = output;
  const originalOutputText = extractOutputTextForGuardrail(originalOutput);
  let currentOutputText = originalOutputText;
  const streamSpanMap = oc.context.get(STREAM_GUARDRAIL_SPANS_KEY) as
    | Map<string | number, Span>
    | undefined;

  for (let index = 0; index < guardrails.length; index++) {
    const guardrail = guardrails[index];
    const guardrailKey = guardrail.id ?? index;
    let span = streamSpanMap?.get(guardrailKey) ?? null;
    const spanOwned = !span;

    if (!span) {
      span = oc.traceContext.createChildSpan(
        `guardrail.output.${guardrail.id ?? index + 1}`,
        "guardrail",
        {
          label: guardrail.name,
          attributes: {
            // entity.type and entity.id are inherited from parent via commonAttributes
            "guardrail.type": NodeType.GUARDRAIL,
            "guardrail.direction": "output",
            "guardrail.operation": operation,
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
    }

    span?.setAttribute("guardrail.output.original", serializeGuardrailValue(originalOutput));
    span?.setAttribute("guardrail.output.current", serializeGuardrailValue(currentOutput));
    if (metadata.usage !== undefined) {
      span?.setAttribute("guardrail.usage", safeStringify(metadata.usage));
    }
    if (metadata.finishReason !== undefined && metadata.finishReason !== null) {
      span?.setAttribute("guardrail.finish_reason", metadata.finishReason);
    }
    if (metadata.warnings && metadata.warnings.length > 0) {
      span?.setAttribute("guardrail.warnings", safeStringify(metadata.warnings));
    }

    try {
      const decision = (await oc.traceContext.withSpan(span, () =>
        guardrail.handler({
          output: currentOutput,
          outputText: currentOutputText,
          originalOutput,
          originalOutputText,
          agent,
          context: oc,
          operation,
          usage: metadata.usage,
          finishReason: metadata.finishReason ?? null,
          warnings: metadata.warnings ?? null,
        } as OutputGuardrailArgs<TOutput>),
      )) as OutputGuardrailResult<TOutput> | undefined;

      const resolvedDecision: OutputGuardrailResult<TOutput> = decision ?? { pass: true };
      const pass = resolvedDecision.pass !== false;
      const action: GuardrailAction = resolvedDecision.action
        ? resolvedDecision.action
        : pass
          ? "allow"
          : "block";

      span?.setAttribute("guardrail.pass", pass);
      span?.setAttribute("guardrail.action", action);
      if (resolvedDecision.message) {
        span?.setAttribute("guardrail.message", resolvedDecision.message);
      }
      if (resolvedDecision.metadata) {
        span?.setAttribute("guardrail.result.metadata", safeStringify(resolvedDecision.metadata));
      }

      if (!pass || action === "block") {
        const message = resolvedDecision.message ?? "Output blocked by guardrail";
        const guardrailError = createVoltAgentError(message, { code: "GUARDRAIL_OUTPUT_BLOCKED" });
        span?.setStatus({ code: SpanStatusCode.ERROR, message });
        span?.end();
        if (!spanOwned) {
          streamSpanMap?.delete(guardrailKey);
        }
        oc.isActive = false;
        oc.traceContext.end("error", guardrailError);
        throw guardrailError;
      }

      if (action === "modify" && resolvedDecision.modifiedOutput !== undefined) {
        currentOutput = resolvedDecision.modifiedOutput;
        currentOutputText = extractOutputTextForGuardrail(currentOutput);
      }

      span?.setAttribute("guardrail.output.after", serializeGuardrailValue(currentOutput));
      span?.setStatus({ code: SpanStatusCode.OK });
      span?.end();
      if (!spanOwned) {
        streamSpanMap?.delete(guardrailKey);
      }

      oc.logger.debug("Output guardrail evaluated", {
        guardrail: guardrail.name,
        action,
        modified: action === "modify",
      });
    } catch (error) {
      if (span) {
        if (error instanceof Error) {
          span.recordException(error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
        } else {
          span.setStatus({ code: SpanStatusCode.ERROR, message: "Guardrail error" });
        }
        span.end();
        if (!spanOwned) {
          streamSpanMap?.delete(guardrailKey);
        }
      }
      throw error;
    }
  }

  if (streamSpanMap && streamSpanMap.size === 0) {
    oc.context.delete(STREAM_GUARDRAIL_SPANS_KEY);
  }

  oc.traceContext.setOutput(currentOutput);
  return currentOutput;
}
