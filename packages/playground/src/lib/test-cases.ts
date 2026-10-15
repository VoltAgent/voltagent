import { safeStringify } from "@voltagent/internal";
import { type ModelMessage, type UIMessage, convertToModelMessages } from "ai";
import type { CallSettings } from "../components/settings";
import { initialSettings } from "../components/settings";
import type { EntityKind, Trace } from "./api";
import { comparableRun } from "./run-debug";
import { spanIO } from "./span-details";
import { parseRecorded, record } from "./span-insights";
import type { CaseExpectations } from "./test-checks";
import { runTitle, traceRoot } from "./trace-presentation";

export type RunDraft = { input: unknown; settings: CallSettings; source: "request" | "trace" };
export type CaseBaseline = {
  expectations?: CaseExpectations;
  name: string;
  traceId: string;
  result: ReturnType<typeof comparableRun>;
};
export type TestCase = RunDraft & {
  expectations?: CaseExpectations;
  id: string;
  name: string;
  kind: EntityKind;
  entityId: string;
  baseline: CaseBaseline;
};

export function caseFromTrace(
  trace: Trace,
  kind: EntityKind,
  entityId: string,
  draft?: RunDraft,
): TestCase {
  const root = traceRoot(trace);
  const attributes = root?.attributes ?? {};
  const settings = initialSettings();
  const context = record(attributes["agent.context"] ?? attributes.context);
  if (context) settings.context = safeStringify(context, { indentation: 2 });
  // Only use recorded root values. A fallback model call is not a request override.
  for (const [field, keys] of Object.entries({
    instructions: ["agent.instructions"],
    temperature: ["llm.temperature"],
    maxSteps: ["voltagent.max_steps"],
    maxOutputTokens: ["llm.max_output_tokens"],
  })) {
    const value = keys.map((key) => attributes[key]).find((value) => value !== undefined);
    if (typeof value === "string" || typeof value === "number")
      settings[field as keyof CallSettings] = String(value);
  }
  return {
    id: crypto.randomUUID(),
    name: runTitle(trace),
    kind,
    entityId,
    input: root ? parseRecorded(spanIO(root).input) : undefined,
    settings,
    source: "trace",
    ...draft,
    baseline: { name: runTitle(trace), traceId: trace.traceId, result: comparableRun(trace) },
  };
}

export function freshCaseDraft(test: TestCase): RunDraft {
  return {
    input: test.input,
    settings: {
      ...test.settings,
      userId: `playground-test-${crypto.randomUUID()}`,
      conversationId: crypto.randomUUID(),
      resumableStream: "off",
    },
    source: test.source,
  };
}

/** The visible case marker must never replace saved history on retry or continuation. */
export async function caseContinuationInput(input: unknown, messages: UIMessage[]) {
  const original: ModelMessage[] =
    typeof input === "string"
      ? [{ role: "user", content: input }]
      : Array.isArray(input) && input.every((message) => Array.isArray(message?.parts))
        ? await convertToModelMessages(input as UIMessage[])
        : (input as ModelMessage[]);
  return [...original, ...(await convertToModelMessages(messages.slice(1)))];
}
