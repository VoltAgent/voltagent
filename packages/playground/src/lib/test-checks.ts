import { type Trace, pretty } from "./api";
import { spanIO } from "./span-details";
import { parseRecorded } from "./span-insights";
import { spanKind, spanStatus, statusLabels, traceRoot } from "./trace-presentation";

export type CaseExpectations = {
  status?: "success" | "error" | "cancelled";
  outputIncludes?: string;
  tools?: string[];
};
export type CaseCheck = {
  label: string;
  status: "passed" | "failed" | "pending" | "unavailable";
  detail: string;
};

/** These are explicit assertions over telemetry, not an automatic judgement of answer quality. */
export function checkRun(trace: Trace, expected?: CaseExpectations): CaseCheck[] {
  if (!expected) return [];
  const root = traceRoot(trace);
  const status = root && spanStatus(root);
  const pending = status && !["success", "error", "cancelled"].includes(status);
  const output = root && spanIO(root).output;
  const tools = new Set(
    trace.spans
      .filter((span) => span.traceId === trace.traceId && spanKind(span) === "tool")
      .map((span) => String(span.attributes["tool.name"] ?? "")),
  );
  const check = (label: string, passed: boolean, detail: string, available = true): CaseCheck => ({
    label,
    status: !root
      ? "unavailable"
      : pending
        ? "pending"
        : !available
          ? "unavailable"
          : passed
            ? "passed"
            : "failed",
    detail: !root
      ? "Root trace data is unavailable."
      : pending
        ? "Waiting for the run to finish."
        : detail,
  });
  return [
    ...(expected.status
      ? [
          check(
            `Execution is ${statusLabels[expected.status].toLowerCase()}`,
            status === expected.status,
            status ? `Recorded: ${statusLabels[status]}` : "Status not recorded.",
          ),
        ]
      : []),
    ...(expected.outputIncludes
      ? [
          check(
            `Output contains “${expected.outputIncludes}”`,
            output !== undefined && pretty(parseRecorded(output)).includes(expected.outputIncludes),
            output === undefined
              ? "Output was not recorded; this check cannot be evaluated."
              : "Case-sensitive match against the recorded output.",
            output !== undefined,
          ),
        ]
      : []),
    ...(expected.tools ?? []).map((tool) =>
      check(
        `Tool call recorded: ${tool}`,
        tools.has(tool),
        tools.has(tool)
          ? "A call was recorded. Inspect the step for its execution outcome."
          : "No matching tool call in this run’s trace.",
      ),
    ),
  ];
}
