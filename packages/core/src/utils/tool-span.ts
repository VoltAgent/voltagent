import type { Span } from "@opentelemetry/api";

/** Each concurrent tool call owns its span; the shared context is only a legacy fallback. */
export function getToolSpan(context: {
  parentToolSpan?: Span;
  systemContext?: { get(key: string): unknown };
}): Span | undefined {
  return (
    context.parentToolSpan ?? (context.systemContext?.get("parentToolSpan") as Span | undefined)
  );
}
