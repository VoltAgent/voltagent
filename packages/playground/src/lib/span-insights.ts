import { safeStringify } from "@voltagent/internal";
import type { Span, Trace } from "./api";
import { spanIO, spanValue } from "./span-details";
import { spanKind } from "./trace-presentation";

export function parseRecorded(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function record(value: unknown): Record<string, unknown> | undefined {
  const parsed = parseRecorded(value);
  return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    ? (parsed as Record<string, unknown>)
    : undefined;
}

export function recordedNumber(value: unknown): number | undefined {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return undefined;
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export interface InsightField {
  label: string;
  value: unknown;
}
export interface InsightSection {
  title: string;
  fields: InsightField[];
}
type FieldSpec = [label: string, ...keys: string[]];

const sections: Array<[title: string, fields: FieldSpec[]]> = [
  [
    "Model",
    [
      ["Model", "llm.model", "gen_ai.request.model", "ai.model.name", "model.name"],
      ["Provider", "llm.provider", "gen_ai.provider.name"],
      ["Operation", "llm.operation"],
      ["Streaming", "llm.stream"],
      ["Finish reason", "llm.finish_reason", "ai.response.finish_reason", "finish.reason"],
      ["Temperature", "llm.temperature", "ai.model.temperature"],
      ["Max output tokens", "llm.max_output_tokens"],
      ["Top P", "llm.top_p"],
      ["Max steps", "voltagent.max_steps", "ai.model.max_steps"],
      ["Model steps", "voltagent.step_count"],
      ["Step limit reached", "voltagent.stopped_by_max_steps"],
      ["Stop condition", "llm.stop_condition"],
      ["Messages", "llm.messages.count"],
      ["Available tools", "llm.tools.count"],
    ],
  ],
  [
    "Retry & fallback",
    [
      ["Attempt", "llm.attempt", "llm.retry.attempt", "retry.attempt"],
      ["Max retries", "llm.max_retries"],
      ["Model index", "llm.model_index"],
      ["Model ID", "llm.model_id"],
      ["Step retries", "workflow.step.retries"],
      ["Retries used", "workflow.step.retry.count", "workflow.step.retry_count"],
      ["Workflow attempts", "workflow.retry.attempts"],
      ["Retry delay (ms)", "workflow.retry.delay_ms", "workflow.retry.delayMs"],
    ],
  ],
  [
    "Tool",
    [
      ["Name", "tool.name"],
      ["Display name", "tool.display_name"],
      ["Purpose", "tool.purpose", "tool.description"],
      ["Call ID", "tool.call.id"],
      ["Tags", "tool.tags"],
      ["Scopes", "tool.scopes", "tool.scope"],
    ],
  ],
  [
    "Middleware",
    [
      ["Name", "middleware.name"],
      ["Direction", "middleware.direction"],
      ["Operation", "middleware.operation"],
      ["Retry count", "middleware.retry_count"],
      ["ID", "middleware.id"],
      ["Tags", "middleware.tags"],
      ["Metadata", "middleware.metadata"],
    ],
  ],
  [
    "Evaluation",
    [
      ["Scorer", "eval.scorer.name", "eval.scorer.id"],
      ["Status", "eval.scorer.status"],
      ["Score", "eval.scorer.score"],
      ["Threshold", "eval.scorer.threshold"],
      ["Threshold passed", "eval.scorer.threshold_passed"],
      ["Duration (ms)", "eval.scorer.duration_ms"],
      ["Sampling strategy", "eval.scorer.sampling.strategy"],
      ["Sampling rate", "eval.scorer.sampling.rate"],
      ["Sampling applied", "eval.scorer.sampling.applied"],
      ["Error", "eval.scorer.error_message"],
      ["Metadata", "eval.scorer.metadata"],
    ],
  ],
  [
    "Memory",
    [
      ["Operation", "memory.operation"],
      ["Type", "memory.type", "memory.store"],
      ["Statistics", "memory.stats"],
      ["Storage adapter", "memory.storage.adapter", "memory.provider"],
      ["Messages", "memory.message_count"],
      ["Steps saved", "memory.steps_saved"],
      ["Semantic search", "memory.semantic"],
      ["Working memory", "memory.working.enabled", "agent.workingMemory.enabled"],
      ["Scope", "memory.working.scope", "agent.workingMemory.scope"],
      ["Format", "memory.working.format", "agent.workingMemory.format"],
      ["Template available", "memory.working.hasTemplate"],
      ["Schema available", "memory.working.hasSchema"],
      ["Last updated", "agent.workingMemory.lastUpdated", "memory.updated_at", "memory.timestamp"],
    ],
  ],
  [
    "Guardrail",
    [
      ["Name", "guardrail.name"],
      ["Direction", "guardrail.direction"],
      ["Decision", "guardrail.action"],
      ["Severity", "guardrail.severity"],
      ["Message", "guardrail.message"],
      ["Reason", "guardrail.reason"],
      ["Usage", "guardrail.usage"],
      ["Metadata", "guardrail.metadata"],
      ["Decision metadata", "guardrail.result.metadata"],
    ],
  ],
  [
    "Workflow",
    [
      ["Execution ID", "workflow.execution.id", "execution.id"],
      ["State", "workflow.step.state", "workflow.state"],
      ["Step", "workflow.step.name"],
      ["Step ID", "workflow.step.id"],
      ["Step index (zero-based)", "workflow.step.index"],
      ["Skip reason", "workflow.step.skipped_reason"],
      ["Loop iteration (zero-based)", "workflow.step.loop_iteration"],
      ["Item / branch index (zero-based)", "workflow.step.parallel_index"],
      ["Ended early", "workflow.bailed", "workflow.step.bailed", "bailed"],
      ["Type", "workflow.step.type"],
      ["Parallel steps", "workflow.step.parallel_count", "workflow.parallel.count"],
      ["Function", "workflow.step.function"],
      [
        "Suspension reason",
        "workflow.suspension.reason",
        "workflow.suspend.reason",
        "workflow.step.suspension_reason",
      ],
      [
        "Replay from step",
        "workflow.replay.from_step",
        "workflow.replay.source_step_id",
        "workflow.replay.step_id",
      ],
      ["Previous trace", "workflow.previous_trace_id"],
      ["Replay source trace", "workflow.replay.source_trace_id"],
    ],
  ],
  [
    "Workspace",
    [
      ["Workspace", "workspace.name", "workspace.id"],
      ["Scope", "workspace.scope"],
      ["Operation", "workspace.operation"],
      ["Path", "workspace.fs.path"],
      ["Pattern", "workspace.fs.pattern"],
      ["Bytes", "workspace.fs.bytes"],
      ["Occurrences", "workspace.fs.occurrences"],
      ["Query", "workspace.search.query"],
      ["Search mode", "workspace.search.mode"],
      ["Top K", "workspace.search.top_k"],
      ["Results", "workspace.search.results"],
      ["Command", "workspace.sandbox.command"],
      ["Arguments", "workspace.sandbox.args"],
      ["Working directory", "workspace.sandbox.cwd"],
      ["Timeout (ms)", "workspace.sandbox.timeout_ms"],
      ["Exit code", "workspace.sandbox.exit_code"],
      ["Skill", "workspace.skills.name"],
      ["Skill source", "workspace.skills.source"],
    ],
  ],
  [
    "Knowledge & retrieval",
    [
      ["Retriever", "retriever.name"],
      ["Description", "retriever.description"],
      [
        "Knowledge base",
        "rag.knowledge_base_name",
        "rag.knowledge_base.name",
        "knowledge_base_name",
        "knowledgeBaseName",
      ],
      [
        "Knowledge base ID",
        "rag.knowledge_base_id",
        "rag.knowledge_base.id",
        "knowledge_base_id",
        "knowledgeBaseId",
      ],
      ["Embedding model", "embedding.model"],
      ["Dimensions", "embedding.dimensions"],
      ["Vector provider", "vector.provider", "vector.store"],
      ["Vector operation", "vector.operation"],
      ["Results", "retriever.results.count", "vector.results.count"],
    ],
  ],
  [
    "Prompt",
    [
      ["Name", "prompt.name"],
      ["Version", "prompt.version"],
      ["Source", "prompt.source"],
      ["Latest version", "prompt.latest_version"],
      ["Outdated", "prompt.outdated"],
      ["Labels", "prompt.labels"],
      ["Tags", "prompt.tags"],
      ["Configuration", "prompt.config"],
    ],
  ],
  [
    "Summary",
    [
      ["Action", "agent.summary.action"],
      ["Updated", "agent.summary.updated"],
      ["Candidates", "agent.summary.candidates"],
      ["Retained messages", "agent.summary.keep_messages"],
      ["Estimated tokens", "agent.summary.estimated_tokens"],
      ["Length", "agent.summary.length"],
    ],
  ],
  [
    "Delegation & plan",
    [
      ["Subagent", "planagent.task.subagent_type", "subagent.name"],
      ["Subagent ID", "subagent.id"],
      ["Task status", "planagent.task.status"],
      ["Response", "planagent.task.response_preview"],
      ["Todos", "planagent.todos.total"],
      ["Pending", "planagent.todos.pending"],
      ["In progress", "planagent.todos.in_progress"],
      ["Done", "planagent.todos.done"],
      ["Truncated", "planagent.todos.truncated"],
      ["Bailed", "bailed"],
      ["Transformed", "bail.transformed"],
    ],
  ],
  [
    "Identity",
    [
      ["User ID", "user.id"],
      ["Conversation ID", "conversation.id"],
      ["Agent ID", "entity.id"],
      ["Operation ID", "operation.id"],
    ],
  ],
];

export function insightSections(span: Span): InsightSection[] {
  return sections
    .map(([title, specs]) => ({
      title,
      fields: specs
        .map(([label, ...keys]) => ({ label, value: parseRecorded(spanValue(span, ...keys)) }))
        .filter((field) => field.value !== undefined && field.value !== null),
    }))
    .filter((section) => section.fields.length > 0);
}

/** Only this agent's descendants: a child agent owns its own model calls and estimates. */
export function ownedModelSpans(span: Span, trace?: Trace): Span[] {
  if (!trace) return [];
  const children = new Map<string, Span[]>();
  for (const item of trace.spans) {
    if (item.traceId !== span.traceId || !item.parentSpanId) continue;
    const siblings = children.get(item.parentSpanId) ?? [];
    siblings.push(item);
    children.set(item.parentSpanId, siblings);
  }
  const found: Span[] = [];
  const seen = new Set([span.spanId]);
  const visit = (parent: string) => {
    for (const item of children.get(parent) ?? []) {
      if (seen.has(item.spanId)) continue;
      seen.add(item.spanId);
      if (
        spanKind(item) === "agent" ||
        item.name.startsWith("subagent:") ||
        item.attributes["agent.is_subagent"] === true ||
        item.attributes["voltagent.is_subagent"] === true
      )
        continue;
      if (item.attributes["llm.operation"] || spanKind(item) === "llm") found.push(item);
      visit(item.spanId);
    }
  };
  visit(span.spanId);
  // Provider attempts are the real requests; enclosing loops often repeat their telemetry.
  const attemptParents = new Set(
    found
      .filter((item) => item.attributes["llm.provider_attempt"] === true)
      .map((item) => item.parentSpanId),
  );
  return found.filter(
    (item) =>
      item.attributes["llm.provider_attempt"] === true ||
      (!attemptParents.has(item.parentSpanId) && !attemptParents.has(item.spanId)),
  );
}

export function modelNames(span: Span, trace?: Trace): string[] {
  return [
    ...new Set(
      [span, ...ownedModelSpans(span, trace)]
        .map((item) =>
          spanValue(item, "llm.model", "gen_ai.request.model", "ai.model.name", "model.name"),
        )
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ];
}

export function promptContext(span: Span, trace?: Trace) {
  const read = (item: Span) => ({
    system: recordedNumber(item.attributes["usage.prompt_context.system_tokens_estimated"]),
    messages: recordedNumber(
      item.attributes["usage.prompt_context.non_system_message_tokens_estimated"],
    ),
    tools: recordedNumber(item.attributes["usage.prompt_context.tool_tokens_estimated"]),
    total: recordedNumber(item.attributes["usage.prompt_context.total_tokens_estimated"]),
  });
  const has = (values: ReturnType<typeof read>) =>
    Object.values(values).some((value) => value !== undefined);
  const own = read(span);
  const values = has(own) ? [own] : ownedModelSpans(span, trace).map(read).filter(has);
  if (!values.length) return undefined;
  const sum = (key: keyof typeof own) =>
    values.some((item) => item[key] !== undefined)
      ? values.reduce((total, item) => total + (item[key] ?? 0), 0)
      : undefined;
  return {
    system: sum("system"),
    messages: sum("messages"),
    tools: sum("tools"),
    total: sum("total"),
    calls: values.length,
  };
}

export function spanError(span: Span) {
  const exception = span.events?.map(record).find((event) => event?.name === "exception");
  const attributes = record(exception?.attributes);
  return {
    message:
      spanValue(span, "error.message", "error") ??
      attributes?.["exception.message"] ??
      (span.status.code === 2 ? span.status.message : undefined),
    stack: spanValue(span, "error.stack") ?? attributes?.["exception.stacktrace"],
    type: spanValue(span, "error.type") ?? attributes?.["exception.type"],
  };
}

export function messageSets(span: Span) {
  const sources = [
    ["UI messages", span.attributes["agent.messages.ui"]],
    [
      "Model messages",
      span.attributes["agent.messages.model"] ?? span.attributes["agent.messages"],
    ],
    ["LLM messages", span.attributes["llm.messages"]],
  ] as const;
  return sources.flatMap(([label, source]) => {
    const messages = parseRecorded(source);
    return Array.isArray(messages) ? [{ label, messages }] : [];
  });
}

/** JSON Schema and the serialised Zod shape emitted by older tool telemetry. */
export function parameterRows(value: unknown): Array<{
  name: string;
  type: string;
  required: boolean;
  description?: string;
  choices?: unknown[];
}> {
  const schema = record(value);
  const definition = record(schema?.def ?? schema?._def);
  const properties = record(schema?.properties) ?? record(definition?.shape);
  if (!properties) return [];
  return Object.entries(properties).map(([name, raw]) => {
    let field = record(raw);
    let def = record(field?.def ?? field?._def);
    let optional = false;
    const seen = new Set<unknown>();
    while (def?.innerType && !seen.has(def)) {
      seen.add(def);
      if (["optional", "default"].includes(String(def.type))) optional = true;
      field = record(def.innerType);
      def = record(field?.def ?? field?._def);
    }
    return {
      name,
      type: String(field?.type ?? def?.type ?? "unknown"),
      required: Array.isArray(schema?.required)
        ? schema.required.includes(name)
        : definition
          ? !optional
          : false,
      description: typeof field?.description === "string" ? field.description : undefined,
      choices: Array.isArray(field?.enum) ? field.enum : undefined,
    };
  });
}

/** Payload tabs own their messages; only additional recorded representations get another tab. */
export function extraMessageSets(span: Span) {
  const io = spanIO(span);
  const seen = new Set(
    [io.input, io.output]
      .filter((value) => value !== undefined)
      .map((value) => safeStringify(parseRecorded(value))),
  );
  return messageSets(span).filter((set) => {
    const key = safeStringify(set.messages);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
