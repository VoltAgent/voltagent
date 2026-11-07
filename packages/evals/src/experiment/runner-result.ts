import type { ExperimentRunnerReturn } from "./types.js";

export function normalizeRunnerResult<Output>(value: ExperimentRunnerReturn<Output>): {
  output: Output | undefined;
  metadata?: Record<string, unknown> | null;
  traceIds?: string[];
} {
  if (isRunnerResultObject(value)) {
    return {
      output: (value as { output: Output }).output,
      metadata: normalizeMetadata(
        (value as { metadata?: Record<string, unknown> | null }).metadata,
      ),
      traceIds: Array.isArray((value as { traceIds?: string[] }).traceIds)
        ? (value as { traceIds?: string[] }).traceIds
        : undefined,
    };
  }

  return {
    output: value as Output,
    metadata: null,
    traceIds: undefined,
  };
}

function isRunnerResultObject<Output>(
  value: ExperimentRunnerReturn<Output>,
): value is { output: Output; metadata?: Record<string, unknown> | null; traceIds?: string[] } {
  return (
    Boolean(value) && typeof value === "object" && "output" in (value as Record<string, unknown>)
  );
}

export function normalizeMetadata(
  metadata: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }
  if (typeof metadata !== "object") {
    return null;
  }
  return { ...metadata };
}
