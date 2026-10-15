import { type Span, pretty } from "./api";

export function spanValue(span: Span, ...keys: string[]) {
  return keys
    .map((key) => span.attributes[key])
    .find((value) => value !== undefined && value !== null);
}

export function tokenUsage(span: Span) {
  const value = (...keys: string[]) => {
    const raw = spanValue(span, ...keys);
    return (typeof raw !== "number" && (typeof raw !== "string" || !raw.trim())) ||
      !Number.isFinite(Number(raw))
      ? undefined
      : Number(raw);
  };
  const input = value(
    "llm.usage.prompt_tokens",
    "usage.prompt_tokens",
    "gen_ai.usage.input_tokens",
  );
  const output = value(
    "llm.usage.completion_tokens",
    "usage.completion_tokens",
    "gen_ai.usage.output_tokens",
  );
  return {
    input,
    output,
    total:
      value("llm.usage.total_tokens", "usage.total_tokens") ??
      (input === undefined && output === undefined ? undefined : (input ?? 0) + (output ?? 0)),
    cached: value(
      "llm.usage.cached_tokens",
      "usage.cached_input_tokens",
      "usage.cached_tokens",
      "gen_ai.usage.cache_read.input_tokens",
    ),
    reasoning: value(
      "llm.usage.reasoning_tokens",
      "usage.reasoning_tokens",
      "gen_ai.usage.reasoning_tokens",
    ),
  };
}

export function spanIO(span: Span) {
  // null is a recorded payload, unlike missing metadata.
  const payload = (...keys: string[]) =>
    keys.map((key) => span.attributes[key]).find((value) => value !== undefined);
  return {
    input: payload(
      "voltagent.input",
      "input",
      "tool.arguments",
      "tool.input",
      "llm.messages",
      "memory.input",
      "eval.input",
      "middleware.input.current",
      "middleware.output.current",
      "guardrail.input.original",
      "guardrail.output.original",
    ),
    output: payload(
      "voltagent.output",
      "output",
      "tool.output",
      "llm.output",
      "memory.output",
      "eval.output",
      "middleware.input.after",
      "middleware.output.after",
      "guardrail.input.after",
      "guardrail.output.after",
    ),
  };
}

export function nodeSummary(span: Span): string[] {
  const usage = tokenUsage(span);
  const model = spanValue(span, "llm.model", "gen_ai.request.model");
  const finish = spanValue(span, "llm.finish_reason", "ai.response.finish_reason");
  const action = spanValue(span, "guardrail.action");
  const memory = spanValue(span, "memory.storage.adapter", "memory.operation");
  const result: string[] = [];
  if (model) result.push(String(model));
  if (usage.total !== undefined)
    result.push(`${usage.total.toLocaleString()} tokens${finish ? ` · ${finish}` : ""}`);
  else if (finish) result.push(String(finish));
  if (action) result.push(`${spanValue(span, "guardrail.direction") ?? "Guardrail"} · ${action}`);
  if (memory) result.push(String(memory));
  if (span.attributes["tool.name"]) {
    const { input, output } = spanIO(span);
    if (input !== undefined) result.push(`In: ${pretty(input).replace(/\s+/g, " ")}`);
    if (output !== undefined) result.push(`Out: ${pretty(output).replace(/\s+/g, " ")}`);
  }
  const attempt = spanValue(span, "llm.retry.attempt", "retry.attempt", "llm.attempt");
  if (attempt !== undefined) result.push(`Attempt ${attempt}`);
  return result.slice(0, 2);
}

/** A bounded, exact before/after diff. Unchanged prefix/suffix lines stay neutral. */
export function valueDiff(before: unknown, after: unknown) {
  const left = pretty(before).split("\n");
  const right = pretty(after).split("\n");
  let prefix = 0;
  while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix++;
  let suffix = 0;
  while (
    suffix < left.length - prefix &&
    suffix < right.length - prefix &&
    left[left.length - 1 - suffix] === right[right.length - 1 - suffix]
  )
    suffix++;
  return [
    ...left.slice(0, prefix).map((line) => ({ type: "same", line })),
    ...left.slice(prefix, left.length - suffix).map((line) => ({ type: "removed", line })),
    ...right.slice(prefix, right.length - suffix).map((line) => ({ type: "added", line })),
    ...right.slice(right.length - suffix).map((line) => ({ type: "same", line })),
  ];
}
