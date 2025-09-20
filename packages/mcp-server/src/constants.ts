import { randomUUID } from "node:crypto";
import type { ElicitRequest, ElicitResult } from "@modelcontextprotocol/sdk/types.js";
import type { OperationContext } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";

export type ElicitationRequestHandler = (request: ElicitRequest["params"]) => Promise<ElicitResult>;

function createNoopLogger(): Logger {
  const noop: Logger = {
    trace: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    child: () => noop,
  };
  return noop;
}

export function createStubOperationContext(handler: ElicitationRequestHandler): OperationContext {
  const noopLogger = createNoopLogger();
  const contextMap = new Map<string | symbol, unknown>();
  const systemContext = new Map<string | symbol, unknown>();

  const noopSpan = {
    addEvent: () => {},
    setAttribute: () => {},
    setAttributes: () => {},
    setStatus: () => {},
    recordException: () => {},
    end: () => {},
  };

  const noopTraceContext = {
    createChildSpan: () => noopSpan,
    createChildSpanWithParent: () => noopSpan,
    withSpan: async <T>(_: unknown, fn: () => T | Promise<T>) => fn(),
    getRootSpan: () => noopSpan,
    setInput: () => {},
    setOutput: () => {},
    setInstructions: () => {},
    setModelAttributes: () => {},
    setUsage: () => {},
    end: () => {},
    endChildSpan: () => {},
    setError: () => {},
    setAttributes: () => {},
    setMetadata: () => {},
  } as unknown as OperationContext["traceContext"];

  const operationContext: OperationContext = {
    operationId: `mcp-${randomUUID()}`,
    context: contextMap,
    systemContext,
    isActive: true,
    logger: noopLogger,
    conversationSteps: [],
    abortController: new AbortController(),
    traceContext: noopTraceContext,
    startTime: new Date(),
    elicitation: (request: unknown) => handler(request as ElicitRequest["params"]),
  };

  return operationContext;
}
