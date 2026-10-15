import { type Span, type Trace, pretty } from "./api";
import { descendantIds, recoveries, recoveryText, spanExplanations } from "./execution-insights";
import { spanError } from "./span-insights";
import { runSummary, spanLabel, spanStatus } from "./trace-presentation";

export type RunFinding = { span: Span; title: string; detail: string; tone: "error" | "notice" };

/** Explain recorded evidence, without inferring model intent or treating recovery as failure. */
export function runFindings(trace: Trace): RunFinding[] {
  const own = { ...trace, spans: trace.spans.filter((span) => span.traceId === trace.traceId) };
  const summary = runSummary(own);
  const recovered = recoveries(own);
  const recoveredIds = new Set(recovered.flatMap((item) => item.failed.map((span) => span.spanId)));
  const findings: RunFinding[] = [];
  const errors = own.spans.filter(
    (span) => spanStatus(span) === "error" && !recoveredIds.has(span.spanId),
  );
  for (const error of errors.filter((span) => {
    const children = descendantIds(own.spans, span.spanId);
    return !errors.some((child) => children.has(child.spanId));
  })) {
    findings.push({
      span: error,
      title: `Error in ${spanLabel(error, own.spans)}`,
      detail: pretty(spanError(error).message ?? "Inspect the recorded error and input."),
      tone: "error",
    });
  }
  if (summary.status === "cancelled" && summary.root)
    findings.push({
      span: summary.root,
      title: "Execution cancelled",
      detail: "The run stopped before normal completion. Recorded output may be partial.",
      tone: "notice",
    });
  for (const item of recovered)
    findings.push({
      span: item.succeeded,
      title: recoveryText(item),
      detail: "Inspect the failed and successful attempts.",
      tone: "notice",
    });
  if (summary.stepLimit && summary.root)
    findings.push({
      span: summary.root,
      title: "Step limit reached",
      detail: `${summary.stepLimit.steps} of ${summary.stepLimit.limit} model steps used. Review the final output before treating this run as successful.`,
      tone: "notice",
    });
  for (const span of own.spans) {
    if (
      span.attributes["eval.scorer.threshold_passed"] === false ||
      span.attributes["eval.scorer.threshold_passed"] === "false"
    )
      findings.push({
        span,
        title: `Quality check failed: ${spanLabel(span)}`,
        detail: `Score ${span.attributes["eval.scorer.score"] ?? "not recorded"} · threshold ${span.attributes["eval.scorer.threshold"] ?? "not recorded"}`,
        tone: "error",
      });
    if (span.attributes["guardrail.action"] !== undefined)
      findings.push({
        span,
        title:
          `${span.attributes["guardrail.direction"] ?? ""} guardrail: ${span.attributes["guardrail.action"]}`.trim(),
        detail: spanExplanations(span).join(" "),
        tone: "notice",
      });
    if (
      ["suspended", "approval", "client-result"].includes(spanStatus(span)) &&
      span.spanId === summary.root?.spanId
    )
      findings.push({
        span,
        title: "This run needs your input",
        detail: spanExplanations(span).join(" ") || "Open the runner to continue this execution.",
        tone: "notice",
      });
  }
  return findings;
}
