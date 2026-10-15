import { type Span, type Trace, pretty } from "./api";
import { parseRecorded, recordedNumber } from "./span-insights";

export function middlewareChange(span: Span) {
  const direction = span.attributes["middleware.direction"];
  if (direction !== "input" && direction !== "output") return undefined;
  const before = span.attributes[`middleware.${direction}.current`];
  const after = span.attributes[`middleware.${direction}.after`];
  if (before === undefined || after === undefined) return undefined;
  return pretty(parseRecorded(before)) === pretty(parseRecorded(after)) ? "Unchanged" : "Modified";
}

export function scorerResult(span: Span) {
  const a = span.attributes;
  if (a["eval.scorer.id"] === undefined && a["eval.scorer.score"] === undefined) return undefined;
  const passed = a["eval.scorer.threshold_passed"];
  return {
    name: String(a["eval.scorer.name"] ?? a["eval.scorer.id"] ?? "Scorer"),
    score: recordedNumber(a["eval.scorer.score"]),
    threshold: recordedNumber(a["eval.scorer.threshold"]),
    verdict:
      passed === true ? "Threshold passed" : passed === false ? "Below threshold" : undefined,
    status: String(a["eval.scorer.status"] ?? (span.endTime ? "Recorded" : "Running")),
  };
}

export function workflowStepSummary(span: Span, trace?: Trace): string[] {
  const type = span.attributes["workflow.step.type"];
  if (typeof type !== "string") return [];
  const labels: Record<string, string> = {
    func: "Function",
    agent: "Agent",
    workflow: "Nested workflow",
    tap: "Tap · preserves input",
    map: "Map fields",
    "conditional-when": "Conditional step",
    branch: "Conditional branches",
    "parallel-all": "Parallel · wait for all",
    "parallel-race": "Race · first settled branch",
    sleep: "Delay",
    "sleep-until": "Wait until",
    foreach: "For each item",
    loop: "Loop",
    guardrail: "Guardrail",
  };
  const result = [labels[type] ?? type.replaceAll("-", " ")];
  if (type.startsWith("parallel") || type === "branch") {
    const count = trace?.spans.filter((child) => child.parentSpanId === span.spanId).length;
    if (count) result.push(`${count} recorded branches`);
  }
  const count = recordedNumber(span.attributes["workflow.step.retry.count"]);
  const retries = recordedNumber(span.attributes["workflow.step.retries"]);
  if (count !== undefined)
    result.push(`Attempt ${count + 1}${retries === undefined ? "" : ` of ${retries + 1}`}`);
  return result;
}
