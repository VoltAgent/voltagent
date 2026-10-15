import { safeStringify } from "@voltagent/internal";

export type EntityKind = "agent" | "workflow";
export interface ToolInfo {
  name: string;
  description?: string;
  parameters?: unknown;
}
export interface WorkflowStep {
  id?: string;
  name?: string;
  type: string;
  agentId?: string;
  subSteps?: WorkflowStep[];
  nestedStep?: WorkflowStep;
  inputSchema?: Record<string, unknown>;
  resumeSchema?: Record<string, unknown>;
}
export interface Entity {
  id: string;
  name: string;
  description?: string;
  purpose?: string;
  instructions?: string;
  model?: string;
  status?: string;
  tools?: ToolInfo[];
  subAgents?: Entity[];
  memory?: Record<string, unknown>;
  steps?: WorkflowStep[];
  inputSchema?: Record<string, unknown>;
  resultSchema?: unknown;
  resumeSchema?: Record<string, unknown>;
  retriever?: unknown;
  inputGuardrails?: unknown[];
  outputGuardrails?: unknown[];
  node_id?: string;
  guardrails?: {
    input?: Array<{ id?: string; name: string; node_id?: string }>;
    output?: Array<{ id?: string; name: string; node_id?: string }>;
  };
}
export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  attributes: Record<string, unknown>;
  status: { code: number; message?: string };
  events?: unknown[];
  links?: Array<{ traceId: string; spanId?: string; attributes?: Record<string, unknown> }>;
}
export interface Trace {
  traceId: string;
  spans: Span[];
  spanCount: number;
}
export interface RunTarget {
  conversationId?: string;
  userId?: string;
  executionId?: string;
  stepId?: string;
}
export interface WorkflowState {
  status: string;
  output?: unknown;
  metadata?: { errorMessage?: string; [key: string]: unknown };
  input?: unknown;
  workflowState?: unknown;
  events?: StreamEvent[];
  suspension?: {
    stepIndex?: number;
    checkpoint?: {
      stepData?: Record<string, { input?: unknown; output?: unknown }>;
      workflowState?: unknown;
      stepExecutionState?: unknown;
    };
  };
}
export interface StreamEvent {
  type: string;
  executionId?: string;
  from?: string;
  status?: string;
  data?: unknown;
  [key: string]: unknown;
}

export function jsonInput(value: unknown): string {
  return safeStringify(value, { indentation: 2 });
}

/** Chat transports surface non-2xx response bodies as Error.message. */
export function readableError(message: string): string {
  // SDK validation errors often wrap the schema's issue array in a prose prefix.
  const start = message.indexOf("[");
  if (start > 0 && /validation|invalid|error message/i.test(message.slice(0, start))) {
    const issues = message.slice(start).trim();
    const formatted = readableError(issues);
    if (formatted !== issues) return formatted;
  }
  try {
    const value: unknown = JSON.parse(message);
    if (value && typeof value === "object") {
      if ("message" in value && typeof value.message === "string") return value.message;
      if ("error" in value && typeof value.error === "string") return value.error;
      if (
        Array.isArray(value) &&
        value.length &&
        value.every((issue) => issue && typeof issue.message === "string")
      )
        return value
          .map(
            (issue) =>
              `${Array.isArray(issue.path) && issue.path.length ? `${issue.path.join(".")}: ` : ""}${issue.message}`,
          )
          .join("\n");
    }
  } catch {
    /* A plain error message needs no decoding. */
  }
  return message;
}

export function pretty(value: unknown): string {
  if (value === undefined) return "—";
  if (typeof value === "string") {
    try {
      return safeStringify(JSON.parse(value), { indentation: 2 });
    } catch {
      return value;
    }
  }
  return safeStringify(value, { indentation: 2 });
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : safeStringify(body),
    signal,
  });
  const payload = (await response.json()) as { success?: boolean; data?: T; error?: string };
  if (!response.ok || payload.success === false)
    throw new ApiError(payload.error || `Request failed (${response.status})`, response.status);
  return payload.data as T;
}

/** Parse SSE across arbitrary chunk boundaries, including CRLF and multiline data. */
export async function consumeSSE(
  response: Response,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  if (!response.ok)
    throw new Error((await response.text()) || `Request failed (${response.status})`);
  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("The API did not return an event stream");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const dispatch = (frame: string) => {
    const data = frame
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).replace(/^ /, ""))
      .join("\n");
    if (!data || data === "[DONE]") return;
    const event = JSON.parse(data) as StreamEvent;
    onEvent(event);
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      let match = /\r?\n\r?\n/.exec(buffer);
      while (match?.index !== undefined) {
        dispatch(buffer.slice(0, match.index));
        buffer = buffer.slice(match.index + match[0].length);
        match = /\r?\n\r?\n/.exec(buffer);
      }
      if (done) {
        if (buffer.trim()) dispatch(buffer);
        break;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

export function parseObject(value: string, name: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value || "{}");
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error(`${name} must be a JSON object`);
  return parsed as Record<string, unknown>;
}
