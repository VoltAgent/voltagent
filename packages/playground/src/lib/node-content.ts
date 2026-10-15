import { type Span, type Trace, pretty } from "./api";
import { spanIO, spanValue } from "./span-details";
import {
  type InsightField,
  insightSections,
  modelNames,
  ownedModelSpans,
  parseRecorded,
  record,
} from "./span-insights";
import { modelCallNumber, spanKind } from "./trace-presentation";

const profiles: Record<string, { label: string; sections: Record<string, string[]> }> = {
  agent: {
    label: "Agent",
    sections: {
      Model: ["Finish reason", "Max steps", "Model steps", "Step limit reached"],
      Prompt: ["Name", "Version", "Source", "Outdated"],
    },
  },
  llm: {
    label: "Model",
    sections: {
      Model: [
        "Provider",
        "Operation",
        "Finish reason",
        "Temperature",
        "Max output tokens",
        "Messages",
        "Available tools",
      ],
      "Retry & fallback": ["Attempt"],
    },
  },
  tool: { label: "Tool", sections: { Tool: ["Name", "Scopes", "Tags"] } },
  memory: {
    label: "Memory",
    sections: {
      Memory: [
        "Operation",
        "Type",
        "Storage adapter",
        "Messages",
        "Steps saved",
        "Semantic search",
        "Working memory",
        "Scope",
        "Format",
      ],
    },
  },
  "working-memory": {
    label: "Working memory",
    sections: {
      Memory: [
        "Operation",
        "Scope",
        "Format",
        "Last updated",
        "Template available",
        "Schema available",
      ],
    },
  },
  guardrail: {
    label: "Guardrail",
    sections: { Guardrail: ["Direction", "Decision", "Severity", "Reason", "Message"] },
  },
  middleware: {
    label: "Middleware",
    sections: { Middleware: ["Direction", "Operation", "Retry count"] },
  },
  scorer: {
    label: "Evaluation",
    sections: { Evaluation: ["Sampling strategy", "Sampling rate", "Sampling applied"] },
  },
  workflow: {
    label: "Workflow",
    sections: {
      Workflow: ["Ended early"],
      "Retry & fallback": ["Workflow attempts", "Retry delay (ms)"],
    },
  },
  "workflow-step": {
    label: "Workflow step",
    sections: {
      Workflow: ["Function", "Parallel steps", "Ended early"],
      "Retry & fallback": ["Step retries", "Retry delay (ms)"],
    },
  },
  retriever: {
    label: "Retriever",
    sections: { "Knowledge & retrieval": ["Knowledge base", "Results"] },
  },
  embedding: {
    label: "Embedding",
    sections: { "Knowledge & retrieval": ["Embedding model", "Dimensions"] },
  },
  vector: {
    label: "Vector store",
    sections: { "Knowledge & retrieval": ["Vector provider", "Vector operation", "Results"] },
  },
  summary: {
    label: "Summary",
    sections: {
      Summary: [
        "Action",
        "Updated",
        "Candidates",
        "Retained messages",
        "Estimated tokens",
        "Length",
      ],
    },
  },
  delegate: {
    label: "Delegation",
    sections: { "Delegation & plan": ["Subagent", "Task status", "Bailed", "Transformed"] },
  },
};

export interface NodePayload {
  label: string;
  value: unknown;
}

function agentFacts(span: Span, trace?: Trace): InsightField[] {
  const fields: InsightField[] = [];
  const models = modelNames(span, trace);
  if (models.length)
    fields.push({ label: models.length === 1 ? "Model" : "Models", value: models.join(", ") });
  const snapshot = record(span.attributes["agent.stateSnapshot"]);
  for (const [label, source] of [
    ["Tools", span.attributes["llm.tools"] ?? snapshot?.tools],
    ["Subagents", snapshot?.subAgents],
  ] as const) {
    const items = parseRecorded(source);
    if (!Array.isArray(items)) continue;
    const names = items.map((item) => record(item)?.name).filter(Boolean);
    if (names.length) fields.push({ label, value: names.join(", ") });
  }
  const calls = ownedModelSpans(span, trace);
  if (calls.length) fields.push({ label: "Model calls", value: calls.length });
  return fields;
}

/** Select useful recorded facts per type; keep identifiers and raw attributes in the inspector. */
export function spanCardContent(span: Span, trace?: Trace) {
  const kind = spanKind(span).toLowerCase();
  const profile = profiles[kind];
  const sections = insightSections(span);
  const fields: InsightField[] = sections.flatMap((section) =>
    section.fields.filter(
      (field) =>
        profile?.sections[section.title]?.includes(field.label) ||
        (section.title === "Workspace" && !["Workspace", "Arguments"].includes(field.label)) ||
        (section.title === "Delegation & plan" &&
          !["Subagent ID", "Response"].includes(field.label)),
    ),
  );
  const add = (label: string, value: unknown) => {
    if (value !== undefined && value !== null) fields.push({ label, value });
  };
  const agent = kind === "agent" || kind === "delegate";
  if (agent) {
    fields.unshift(...agentFacts(span, trace));
  }
  const call = modelCallNumber(span, trace?.spans);
  const role =
    kind === "llm"
      ? call === undefined
        ? "Model loop"
        : `Model · Call ${call}`
      : (profile?.label ?? kind);
  if (kind === "tool" && !span.attributes["tool.display_name"]) {
    const index = fields.findIndex((field) => field.label === "Name");
    if (index !== -1) fields.splice(index, 1);
  }
  if (kind === "workflow" && trace) {
    add(
      "Steps",
      trace.spans.filter(
        (item) =>
          item.parentSpanId === span.spanId &&
          item.traceId === span.traceId &&
          spanKind(item) === "workflow-step",
      ).length,
    );
  }
  if (kind === "workflow-step") {
    add("Agent", spanValue(span, "agent.name"));
    add("Condition matched", spanValue(span, "workflow.step.condition_met"));
    add("Loop type", spanValue(span, "workflow.step.loop_type"));
    for (const [label, key] of [
      ["Step", "workflow.step.index"],
      ["Iteration", "workflow.step.loop_iteration"],
      ["Item / branch", "workflow.step.parallel_index"],
    ]) {
      const value = span.attributes[key];
      if (typeof value === "number") add(label, value + 1);
    }
  }
  const { input, output } = spanIO(span);
  const payloads: NodePayload[] = [];
  const payload = (label: string, value: unknown) => {
    if (value !== undefined) payloads.push({ label, value });
  };
  const beforeAfter = kind === "guardrail" || kind === "middleware";
  const labels =
    kind === "retriever"
      ? ["Query", "Results"]
      : kind === "embedding"
        ? ["Text input", "Vector output"]
        : kind === "vector"
          ? ["Input", "Results"]
          : kind === "llm"
            ? ["Messages", "Response"]
            : beforeAfter
              ? ["Before", "After"]
              : ["Input", "Output"];
  payload(labels[0], input);
  payload(labels[1], output);
  if (agent) payload("Instructions", spanValue(span, "agent.instructions", "agent.system.prompt"));
  if (kind === "summary")
    payload("Summary", spanValue(span, "agent.summary.text", "agent.summary.preview"));
  if (kind.includes("memory")) {
    payload("Statistics", spanValue(span, "memory.stats"));
    payload(
      "Working memory",
      spanValue(span, "memory.working.content", "agent.workingMemory.content"),
    );
  }
  if (!profile) payload("Recorded attributes", span.attributes);
  payload("Task response", spanValue(span, "planagent.task.response_preview"));
  return {
    role,
    fields,
    payloads,
    description: spanValue(
      span,
      "tool.purpose",
      "tool.description",
      "retriever.description",
      "eval.scorer.description",
    ),
    schema: spanValue(span, "tool.parameters", "tool.input_schema"),
    sections,
  };
}

/** Readable previews retain full JSON/messages under Expand; never discard the original payload. */
export function nodeValuePreview(value: unknown): string {
  const parsed = parseRecorded(value);
  const messages =
    Array.isArray(parsed) && parsed.some((item) => typeof record(item)?.role === "string");
  const text = messages
    ? (parsed as unknown[])
        .map((item) => {
          const message = record(item);
          if (!message) return pretty(item);
          const content = message.parts ?? message.content;
          const parts = Array.isArray(content)
            ? content
                .map((part) => {
                  const data = record(part);
                  if (data?.type === "step-start") return "";
                  if (typeof data?.text === "string") return data.text;
                  const name =
                    data?.toolName ??
                    (typeof data?.type === "string" &&
                    data.type.startsWith("tool-") &&
                    data.state !== undefined
                      ? data.type.slice(5)
                      : undefined);
                  if (name) {
                    const payload = [
                      data?.input,
                      data?.args,
                      data?.output,
                      data?.result,
                      data?.state,
                    ].find((value) => value !== undefined);
                    return `${name}: ${pretty(payload)}`;
                  }
                  return String(data?.filename ?? data?.type ?? pretty(part));
                })
                .filter(Boolean)
                .join(" ")
            : pretty(content);
          return `${message.role}: ${parts}`;
        })
        .join(" · ")
    : parsed === ""
      ? '""'
      : pretty(parsed);
  return text.replace(/\s+/g, " ").trim();
}
