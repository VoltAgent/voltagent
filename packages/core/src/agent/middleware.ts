import { SpanStatusCode } from "@opentelemetry/api";
import { safeStringify } from "@voltagent/internal/utils";
import type { UIMessage } from "ai";
import { NodeType } from "../utils/node-utils";
import type { Agent } from "./agent";
import type { MiddlewareAbortOptions } from "./errors";
import { createMiddlewareAbortError } from "./errors";
import type { BaseMessage } from "./providers/base/types";
import type {
  AgentEvalOperationType,
  InputMiddleware,
  InputMiddlewareArgs,
  InputMiddlewareResult,
  MiddlewareDefinition,
  MiddlewareDirection,
  MiddlewareFunction,
  MiddlewareFunctionMetadata,
  OperationContext,
  OutputMiddleware,
  OutputMiddlewareArgs,
  OutputMiddlewareResult,
} from "./types";

export interface NormalizedMiddleware<TArgs, TResult> {
  id?: string;
  name: string;
  description?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
  handler: MiddlewareFunction<TArgs, TResult>;
}

export type NormalizedInputMiddleware = NormalizedMiddleware<
  InputMiddlewareArgs,
  InputMiddlewareResult
>;
export type NormalizedOutputMiddleware<TOutput = unknown> = NormalizedMiddleware<
  OutputMiddlewareArgs<TOutput>,
  OutputMiddlewareResult<TOutput>
>;

type EmptyMiddlewareExtras = Record<never, never>;

type CreateMiddlewareDefinition<
  TArgs,
  TResult,
  TExtra extends Record<PropertyKey, unknown> = EmptyMiddlewareExtras,
> = Omit<MiddlewareDefinition<TArgs, TResult>, keyof TExtra | "handler"> &
  TExtra & {
    handler: MiddlewareFunction<TArgs, TResult>;
  };

export type CreateInputMiddlewareOptions = CreateMiddlewareDefinition<
  InputMiddlewareArgs,
  InputMiddlewareResult
>;

export type CreateOutputMiddlewareOptions<TOutput = unknown> = CreateMiddlewareDefinition<
  OutputMiddlewareArgs<TOutput>,
  OutputMiddlewareResult<TOutput>
>;

export function createInputMiddleware(options: CreateInputMiddlewareOptions): InputMiddleware {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    tags: options.tags,
    metadata: options.metadata,
    handler: options.handler,
  };
}

export function createOutputMiddleware<TOutput = unknown>(
  options: CreateOutputMiddlewareOptions<TOutput>,
): OutputMiddleware<TOutput> {
  return {
    id: options.id,
    name: options.name,
    description: options.description,
    tags: options.tags,
    metadata: options.metadata,
    handler: options.handler,
  };
}

export function getDefaultMiddlewareName(direction: MiddlewareDirection, index: number): string {
  const label = direction === "input" ? "Input" : "Output";
  return `${label} Middleware #${index + 1}`;
}

export function normalizeMiddlewareDefinition<TArgs, TResult>(
  middleware: MiddlewareDefinition<TArgs, TResult> | MiddlewareFunction<TArgs, TResult>,
  direction: MiddlewareDirection,
  index: number,
): NormalizedMiddleware<TArgs, TResult> {
  const defaultName = getDefaultMiddlewareName(direction, index);

  if (typeof middleware === "function") {
    const handler = middleware as MiddlewareFunction<TArgs, TResult> & MiddlewareFunctionMetadata;
    return {
      id: handler.middlewareId,
      name: handler.middlewareName || handler.name || defaultName,
      description: handler.middlewareDescription,
      tags: handler.middlewareTags,
      metadata: undefined,
      handler,
    };
  }

  if (typeof middleware !== "object" || !middleware) {
    throw new Error(`Invalid ${direction} middleware configuration at index ${index}`);
  }

  const descriptor = middleware as MiddlewareDefinition<TArgs, TResult>;
  return {
    id: descriptor.id,
    name: descriptor.name || defaultName,
    description: descriptor.description,
    tags: descriptor.tags,
    metadata: descriptor.metadata,
    handler: descriptor.handler,
  };
}

export function normalizeInputMiddlewareList(
  middlewares: InputMiddleware[],
  startIndex = 0,
): NormalizedInputMiddleware[] {
  return middlewares.map((middleware, index) =>
    normalizeMiddlewareDefinition<InputMiddlewareArgs, InputMiddlewareResult>(
      middleware,
      "input",
      startIndex + index,
    ),
  );
}

export function normalizeOutputMiddlewareList<TOutput = unknown>(
  middlewares: OutputMiddleware<TOutput>[],
  startIndex = 0,
): NormalizedOutputMiddleware<TOutput>[] {
  return middlewares.map((middleware, index) =>
    normalizeMiddlewareDefinition<OutputMiddlewareArgs<TOutput>, OutputMiddlewareResult<TOutput>>(
      middleware,
      "output",
      startIndex + index,
    ),
  ) as NormalizedOutputMiddleware<TOutput>[];
}

function serializeMiddlewareValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return safeStringify(value);
}

export async function runInputMiddlewares(
  input: string | UIMessage[] | BaseMessage[],
  oc: OperationContext,
  middlewares: NormalizedInputMiddleware[],
  operation: AgentEvalOperationType,
  agent: Agent,
  retryCount: number,
): Promise<string | UIMessage[] | BaseMessage[]> {
  if (!middlewares.length) {
    return input;
  }

  const originalInput = input;
  let currentInput = input;

  for (let index = 0; index < middlewares.length; index++) {
    const middleware = middlewares[index];
    const span = oc.traceContext.createChildSpan(
      `middleware.input.${middleware.id ?? index + 1}`,
      "middleware",
      {
        label: middleware.name,
        attributes: {
          "middleware.type": NodeType.MIDDLEWARE,
          "middleware.direction": "input",
          "middleware.operation": operation,
          "middleware.index": index,
          ...(middleware.id ? { "middleware.id": middleware.id } : {}),
          "middleware.name": middleware.name,
          ...(middleware.description ? { "middleware.description": middleware.description } : {}),
          ...(middleware.tags && middleware.tags.length > 0
            ? { "middleware.tags": safeStringify(middleware.tags) }
            : {}),
          ...(middleware.metadata
            ? { "middleware.metadata": safeStringify(middleware.metadata) }
            : {}),
          "middleware.retry_count": retryCount,
          "middleware.input.original": serializeMiddlewareValue(originalInput),
          "middleware.input.current": serializeMiddlewareValue(currentInput),
        },
      },
    );

    try {
      const abort = <TMetadata = unknown>(
        reason?: string,
        options?: MiddlewareAbortOptions<TMetadata>,
      ): never => {
        const message = reason ?? `Middleware aborted: ${middleware.name}`;
        throw createMiddlewareAbortError(message, options, middleware.id);
      };

      const result = await oc.traceContext.withSpan(span, () =>
        middleware.handler({
          input: currentInput,
          originalInput,
          agent,
          context: oc,
          operation,
          retryCount,
          abort,
        }),
      );

      if (result !== undefined) {
        currentInput = result as typeof currentInput;
      }

      span.setAttribute("middleware.input.after", serializeMiddlewareValue(currentInput));
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Middleware error" });
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

export async function runOutputMiddlewares<TOutput>(
  output: TOutput,
  oc: OperationContext,
  middlewares: NormalizedOutputMiddleware<TOutput>[],
  operation: AgentEvalOperationType,
  agent: Agent,
  retryCount: number,
  metadata?: { usage?: unknown; finishReason?: string | null; warnings?: unknown[] | null },
): Promise<TOutput> {
  if (!middlewares.length) {
    return output;
  }

  const originalOutput = output;
  let currentOutput = output;

  for (let index = 0; index < middlewares.length; index++) {
    const middleware = middlewares[index];
    const span = oc.traceContext.createChildSpan(
      `middleware.output.${middleware.id ?? index + 1}`,
      "middleware",
      {
        label: middleware.name,
        attributes: {
          "middleware.type": NodeType.MIDDLEWARE,
          "middleware.direction": "output",
          "middleware.operation": operation,
          "middleware.index": index,
          ...(middleware.id ? { "middleware.id": middleware.id } : {}),
          "middleware.name": middleware.name,
          ...(middleware.description ? { "middleware.description": middleware.description } : {}),
          ...(middleware.tags && middleware.tags.length > 0
            ? { "middleware.tags": safeStringify(middleware.tags) }
            : {}),
          ...(middleware.metadata
            ? { "middleware.metadata": safeStringify(middleware.metadata) }
            : {}),
          "middleware.retry_count": retryCount,
          "middleware.output.original": serializeMiddlewareValue(originalOutput),
          "middleware.output.current": serializeMiddlewareValue(currentOutput),
        },
      },
    );

    if (metadata?.usage !== undefined) {
      span.setAttribute("middleware.usage", safeStringify(metadata.usage));
    }
    if (metadata?.finishReason !== undefined && metadata.finishReason !== null) {
      span.setAttribute("middleware.finish_reason", metadata.finishReason);
    }
    if (metadata?.warnings && metadata.warnings.length > 0) {
      span.setAttribute("middleware.warnings", safeStringify(metadata.warnings));
    }

    try {
      const abort = <TMetadata = unknown>(
        reason?: string,
        options?: MiddlewareAbortOptions<TMetadata>,
      ): never => {
        const message = reason ?? `Middleware aborted: ${middleware.name}`;
        throw createMiddlewareAbortError(message, options, middleware.id);
      };

      const result = await oc.traceContext.withSpan(span, () =>
        middleware.handler({
          output: currentOutput,
          originalOutput,
          agent,
          context: oc,
          operation,
          retryCount,
          usage: metadata?.usage as any,
          finishReason: metadata?.finishReason ?? null,
          warnings: metadata?.warnings ?? null,
          abort,
        } as OutputMiddlewareArgs<TOutput>),
      );

      if (result !== undefined) {
        currentOutput = result as TOutput;
      }

      span.setAttribute("middleware.output.after", serializeMiddlewareValue(currentOutput));
      span.setStatus({ code: SpanStatusCode.OK });
      span.end();
    } catch (error) {
      if (error instanceof Error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      } else {
        span.setStatus({ code: SpanStatusCode.ERROR, message: "Middleware error" });
      }
      span.end();
      throw error;
    }
  }

  return currentOutput;
}
