import type { Span, Trace } from "./api";
import { nodeValuePreview } from "./node-content";
import { spanIO } from "./span-details";
import { parseRecorded, record } from "./span-insights";
import { modelCallNumber, spanKind } from "./trace-presentation";

/** A short, searchable identity for repeated calls; the original input remains available. */
export function stepPreview(span: Span): string | undefined {
  const { input, output } = spanIO(span);
  const parsed = parseRecorded(input);
  if (Array.isArray(parsed) && parsed.some((item) => record(item)?.role)) {
    const latest = [...parsed].reverse().find((item) => {
      const role = record(item)?.role;
      return role && role !== "system";
    });
    return latest === undefined ? undefined : nodeValuePreview([latest]);
  }
  const data = record(parsed);
  const value = [data?.query, data?.task, data?.prompt, data?.message, input, output].find(
    (item) => item !== undefined,
  );
  return value === undefined ? undefined : nodeValuePreview(value);
}

export function stepRole(span: Span, trace?: Trace): string {
  const call = modelCallNumber(span, trace?.spans);
  return call === undefined ? spanKind(span).replaceAll("-", " ") : `Model · Call ${call}`;
}

export function latestRequestMessage(value: unknown): unknown {
  const parsed = parseRecorded(value);
  if (!Array.isArray(parsed) || !parsed.some((item) => record(item)?.role)) return undefined;
  return [...parsed].reverse().find((item) => {
    const role = record(item)?.role;
    return role && role !== "system";
  });
}

export function modelOutcome(span: Span): string | undefined {
  const reason =
    span.attributes["llm.finish_reason"] ?? span.attributes["gen_ai.response.finish_reasons"];
  const reasons: Record<string, string> = {
    "tool-calls": "Requested tools",
    stop: "Response completed",
    length: "Output limit reached",
    "content-filter": "Response filtered",
    error: "Model request failed",
  };
  return reason === undefined
    ? undefined
    : (reasons[String(reason)] ?? `Finished: ${String(reason)}`);
}
