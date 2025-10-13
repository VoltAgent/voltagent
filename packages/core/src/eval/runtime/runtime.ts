import { safeStringify } from "@voltagent/internal/utils";

export type SamplingPolicy =
  | { type: "always" }
  | { type: "never" }
  | { type: "ratio"; rate: number };

export interface SamplingMetadata {
  strategy: "always" | "never" | "ratio";
  rate?: number;
  applied?: boolean;
}

export interface ScorerContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
> {
  payload: Payload;
  params: Params;
}

export type ScorerResult =
  | {
      status?: "success";
      score?: number | null;
      metadata?: Record<string, unknown> | null;
    }
  | {
      status: "error";
      score?: number | null;
      metadata?: Record<string, unknown> | null;
      error: unknown;
    }
  | {
      status: "skipped";
      score?: number | null;
      metadata?: Record<string, unknown> | null;
    };

export interface LocalScorerDefinition<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  name: string;
  scorer: (context: ScorerContext<Payload, Params>) => ScorerResult | Promise<ScorerResult>;
  params?: Params | ((payload: Payload) => Params | undefined | Promise<Params | undefined>);
  metadata?: Record<string, unknown> | null;
  sampling?: SamplingPolicy;
}

export interface LocalScorerExecutionResult {
  id: string;
  name: string;
  status: "success" | "error" | "skipped";
  score: number | null;
  metadata: Record<string, unknown> | null;
  sampling?: SamplingMetadata;
  durationMs: number;
  error?: unknown;
}

export interface ScorerLifecycleScope {
  run<T>(executor: () => T | Promise<T>): Promise<T>;
}

export interface RunLocalScorersArgs<Payload extends Record<string, unknown>> {
  payload: Payload;
  scorers: LocalScorerDefinition<Payload>[];
  defaultSampling?: SamplingPolicy;
  baseArgs?:
    | Record<string, unknown>
    | ((payload: Payload) => Record<string, unknown> | Promise<Record<string, unknown>>);
  onScorerStart?: (info: {
    definition: LocalScorerDefinition<Payload>;
    sampling?: SamplingMetadata;
  }) => ScorerLifecycleScope | undefined;
  onScorerComplete?: (info: {
    definition: LocalScorerDefinition<Payload>;
    execution: LocalScorerExecutionResult;
    context?: ScorerLifecycleScope;
  }) => void;
}

export interface RunLocalScorersResult {
  results: LocalScorerExecutionResult[];
  summary: {
    successCount: number;
    errorCount: number;
    skippedCount: number;
  };
}

interface NormalizedScorerResult {
  score?: number | null;
  metadata?: Record<string, unknown> | null;
  error?: unknown;
  status?: "success" | "error" | "skipped";
}

export async function runLocalScorers<Payload extends Record<string, unknown>>(
  args: RunLocalScorersArgs<Payload>,
): Promise<RunLocalScorersResult> {
  const { payload, scorers, defaultSampling, baseArgs } = args;

  if (!Array.isArray(scorers) || scorers.length === 0) {
    return {
      results: [],
      summary: { successCount: 0, errorCount: 0, skippedCount: 0 },
    };
  }

  const tasks = scorers.map(async (definition) => {
    const policy = definition.sampling ?? defaultSampling ?? { type: "always" };
    const samplingDecision = shouldSample(policy);
    const baseSamplingMetadata = buildSamplingMetadata(policy);
    const sampling = baseSamplingMetadata
      ? { ...baseSamplingMetadata, applied: samplingDecision }
      : undefined;

    if (!samplingDecision) {
      return {
        id: definition.id,
        name: definition.name,
        status: "skipped",
        score: null,
        metadata: mergeMetadata(null, definition.metadata),
        sampling,
        durationMs: 0,
      } satisfies LocalScorerExecutionResult;
    }

    let scorerParams: Record<string, unknown> = {};

    try {
      scorerParams = await resolveScorerParams(payload, baseArgs, definition.params);
    } catch (error) {
      const execution: LocalScorerExecutionResult = {
        id: definition.id,
        name: definition.name,
        status: "error",
        score: null,
        metadata: mergeMetadata(null, definition.metadata),
        sampling,
        durationMs: 0,
        error,
      };
      args.onScorerComplete?.({
        definition,
        execution,
        context: undefined,
      });
      return execution;
    }

    const lifecycleScope = args.onScorerStart?.({
      definition,
      sampling,
    });

    const start = Date.now();
    let status: LocalScorerExecutionResult["status"] = "success";
    let score: number | null = null;
    let metadata: Record<string, unknown> | null = mergeMetadata(null, definition.metadata);
    let errorValue: unknown;

    try {
      const scorerCall = () =>
        definition.scorer({
          payload,
          params: scorerParams,
        });
      const rawResult =
        lifecycleScope && typeof lifecycleScope.run === "function"
          ? await lifecycleScope.run(scorerCall)
          : await scorerCall();
      const normalized = normalizeScorerResult(rawResult);

      if (normalized.status) {
        status = normalized.status;
      }

      if (normalized.score !== undefined) {
        score = typeof normalized.score === "number" ? normalized.score : null;
      }

      if (normalized.metadata !== undefined) {
        metadata = mergeMetadata(normalized.metadata, definition.metadata);
      }

      if (normalized.error !== undefined) {
        errorValue = normalized.error;
        status = "error";
      }
    } catch (error) {
      status = "error";
      errorValue = error;
    }

    const durationMs = Date.now() - start;

    const execution: LocalScorerExecutionResult = {
      id: definition.id,
      name: definition.name,
      status,
      score: status === "success" ? (score ?? null) : score,
      metadata,
      sampling,
      durationMs,
      error: errorValue,
    };

    args.onScorerComplete?.({
      definition,
      execution,
      context: lifecycleScope,
    });

    return execution;
  });

  const results = await Promise.all(tasks);

  const summary = results.reduce(
    (acc, result) => {
      if (result.status === "success") {
        acc.successCount += 1;
      } else if (result.status === "error") {
        acc.errorCount += 1;
      } else {
        acc.skippedCount += 1;
      }
      return acc;
    },
    { successCount: 0, errorCount: 0, skippedCount: 0 },
  );

  return {
    results,
    summary,
  };
}

export function shouldSample(policy?: SamplingPolicy): boolean {
  if (!policy || policy.type === "always") {
    return true;
  }

  if (policy.type === "never") {
    return false;
  }

  if (policy.type === "ratio") {
    const rate = Math.max(0, Math.min(1, policy.rate ?? 0));
    if (rate <= 0) {
      return false;
    }
    if (rate >= 1) {
      return true;
    }
    return Math.random() < rate;
  }

  return true;
}

export function buildSamplingMetadata(policy?: SamplingPolicy): SamplingMetadata | undefined {
  if (!policy) {
    return undefined;
  }

  if (policy.type === "ratio") {
    return { strategy: "ratio", rate: policy.rate };
  }

  if (policy.type === "always") {
    return { strategy: "always" };
  }

  if (policy.type === "never") {
    return { strategy: "never" };
  }

  return undefined;
}

export function normalizeScorerResult(result: unknown): NormalizedScorerResult {
  if (typeof result === "number") {
    return { score: result, metadata: null };
  }

  if (result === null || result === undefined) {
    return { metadata: null };
  }

  if (typeof result === "object") {
    const record = result as Record<string, unknown>;

    const scoreValue =
      typeof record.score === "number" ? record.score : record.score === null ? null : undefined;
    const metadataValue = cloneRecord(record.metadata);
    const statusValue = parseStatus(record.status);
    const errorValue = record.error;

    return {
      score: scoreValue,
      metadata: metadataValue ?? null,
      status: statusValue,
      error: errorValue,
    };
  }

  return { metadata: null };
}

async function resolveScorerParams<Payload extends Record<string, unknown>>(
  payload: Payload,
  baseArgs?:
    | Record<string, unknown>
    | ((payload: Payload) => Record<string, unknown> | Promise<Record<string, unknown>>),
  params?:
    | Record<string, unknown>
    | ((
        payload: Payload,
      ) => Record<string, unknown> | undefined | Promise<Record<string, unknown> | undefined>),
): Promise<Record<string, unknown>> {
  const resolvedBase = await resolveArgsSource(payload, baseArgs);
  const resolvedParams = await resolveArgsSource(payload, params);
  return {
    ...resolvedBase,
    ...resolvedParams,
  };
}

async function resolveArgsSource<Payload extends Record<string, unknown>>(
  payload: Payload,
  source?:
    | Record<string, unknown>
    | ((
        payload: Payload,
      ) => Record<string, unknown> | undefined | Promise<Record<string, unknown> | undefined>),
): Promise<Record<string, unknown>> {
  if (!source) {
    return {};
  }

  if (typeof source === "function") {
    const value = await source(payload);
    return value && typeof value === "object" ? (cloneRecord(value) ?? {}) : {};
  }

  return cloneRecord(source) ?? {};
}

function mergeMetadata(
  primary: Record<string, unknown> | null | undefined,
  secondary: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const base = cloneRecord(primary) ?? {};
  const extra = cloneRecord(secondary);

  if (extra) {
    Object.assign(base, extra);
  }

  return Object.keys(base).length > 0 ? base : null;
}

function cloneRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  try {
    return JSON.parse(safeStringify(value)) as Record<string, unknown>;
  } catch {
    return { ...(value as Record<string, unknown>) };
  }
}

function parseStatus(value: unknown): NormalizedScorerResult["status"] {
  if (typeof value !== "string") {
    return undefined;
  }

  if (value === "success" || value === "error" || value === "skipped") {
    return value;
  }

  return undefined;
}
