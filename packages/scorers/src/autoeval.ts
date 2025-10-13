import { safeStringify } from "@voltagent/internal/utils";
import type { Score as AutoEvalScore, Scorer as AutoEvalScorer } from "autoevals";

import {
  type BuilderScoreContext,
  type LocalScorerDefinition,
  type SamplingPolicy,
  type ScorerContext,
  type ScorerResult,
  buildScorer,
} from "@voltagent/core";

export interface AutoEvalScorerOptions<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
  Output = unknown,
> {
  /** Unique identifier for the scorer. Falls back to the AutoEval scorer name. */
  id?: string;
  /** Display name. Defaults to the resolved identifier. */
  name?: string;
  /** AutoEval scorer function to wrap. */
  scorer: AutoEvalScorer<Output, Params>;
  /** Optional sampling policy applied in addition to runtime defaults. */
  sampling?: SamplingPolicy;
  /** Static metadata merged with runtime results. */
  metadata?: Record<string, unknown> | null;
  /** Extra VoltAgent metadata merged into the default `{ scorer: id }` payload. */
  voltMetadata?: Record<string, unknown>;
  /** Override the argument builder invoked before calling the AutoEval scorer. */
  buildArgs?: (context: ScorerContext<Payload, Params>) => Record<string, unknown>;
  /**
   * Provide a custom result transformer. Defaults to mapping AutoEval's Score
   * structure into VoltAgent's ScorerResult semantic.
   */
  transformResult?: (args: {
    context: ScorerContext<Payload, Params>;
    autoEvalScore: AutoEvalScore;
  }) => ScorerResult;
}

export function createAutoEvalScorer<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
  Output = unknown,
>(options: AutoEvalScorerOptions<Payload, Params, Output>): LocalScorerDefinition<Payload, Params> {
  const {
    id: rawId,
    name: rawName,
    scorer,
    sampling,
    metadata,
    voltMetadata,
    buildArgs = defaultBuildArgs,
    transformResult = defaultTransformResult,
  } = options;

  if (typeof scorer !== "function") {
    throw new Error("createAutoEvalScorer requires a callable AutoEval scorer");
  }

  const inferredName = inferScorerName(scorer);
  const id = rawId ?? inferredName ?? "autoeval-scorer";
  const name = rawName ?? inferredName ?? id;

  const staticMetadata =
    metadata === undefined
      ? {
          voltAgent: {
            scorer: id,
            ...(voltMetadata ?? {}),
          },
        }
      : metadata;

  const builder = buildScorer<Payload, Params>({
    id,
    label: name,
    sampling,
    metadata: staticMetadata ?? null,
  });

  const definition = builder
    .score(async (context) => {
      const scorerContext = toScorerContext(context);
      const args = buildArgs(scorerContext);
      const autoEvalScore = await scorer(args as any);
      const transformed = transformResult({ context: scorerContext, autoEvalScore });
      const resolvedScore = resolveAutoEvalScore(transformed, autoEvalScore);

      storeAutoEvalSnapshot(context, {
        raw: autoEvalScore,
        result: transformed,
        score: resolvedScore,
      });

      return {
        score: typeof resolvedScore === "number" ? resolvedScore : 0,
        metadata: transformed.metadata ?? null,
      };
    })
    .build();

  const baseScorer = definition.scorer;

  return {
    ...definition,
    scorer: async (context) => {
      const result = await baseScorer(context);
      const snapshot = extractAutoEvalSnapshot(result.metadata);
      if (!snapshot) {
        return result;
      }

      const resolvedScore = snapshot.score;
      const metadata = normalizeMetadata(result.metadata);
      const status = snapshot.result.status ?? "success";

      if (status === "error") {
        const autoEvalError =
          snapshot.result.status === "error"
            ? (snapshot.result as { error?: unknown }).error
            : undefined;
        return {
          status: "error",
          score: typeof resolvedScore === "number" ? resolvedScore : null,
          metadata,
          error:
            autoEvalError ??
            snapshot.raw?.error ??
            new Error(`AutoEval scorer '${id}' returned an error.`),
        };
      }

      if (status === "skipped") {
        return {
          status: "skipped",
          score: typeof resolvedScore === "number" ? resolvedScore : null,
          metadata,
        };
      }

      return {
        ...result,
        score: typeof resolvedScore === "number" ? resolvedScore : null,
        metadata,
      };
    },
  };
}

function defaultBuildArgs<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(context: ScorerContext<Payload, Params>): Record<string, unknown> {
  const base: Record<string, unknown> = {
    ...(context.params as Record<string, unknown>),
  };

  if (base.output === undefined) {
    const output = (context.payload as Record<string, unknown>).output;
    if (output !== undefined) {
      base.output = normalizeScoreValue(output);
    }
  } else if (typeof base.output !== "string" && !Array.isArray(base.output)) {
    base.output = normalizeScoreValue(base.output);
  }

  if (base.expected === undefined) {
    const expected = (context.payload as Record<string, unknown>).expected;
    if (expected !== undefined) {
      base.expected = normalizeScoreValue(expected);
    }
  } else if (
    base.expected !== null &&
    typeof base.expected !== "string" &&
    !Array.isArray(base.expected)
  ) {
    base.expected = normalizeScoreValue(base.expected);
  }

  return base;
}

function normalizeScoreValue(value: unknown): unknown {
  // Preserve arrays (for scorers like ListContains)
  if (Array.isArray(value)) {
    return value;
  }
  // Preserve numbers (for scorers like NumericDiff)
  if (typeof value === "number") {
    return value;
  }
  // Preserve plain objects (for scorers like JSONDiff)
  if (value && typeof value === "object" && value.constructor === Object) {
    return value;
  }
  // Convert everything else to string
  return normalizeScoreText(value);
}

function defaultTransformResult({ autoEvalScore }: { autoEvalScore: AutoEvalScore }): ScorerResult {
  const score = typeof autoEvalScore.score === "number" ? autoEvalScore.score : null;
  const metadata = cloneRecord(autoEvalScore.metadata) ?? null;

  if (autoEvalScore.error !== undefined && autoEvalScore.error !== null) {
    return {
      status: "error",
      score,
      metadata,
      error: autoEvalScore.error,
    } satisfies ScorerResult;
  }

  return {
    status: "success",
    score,
    metadata,
  } satisfies ScorerResult;
}

function inferScorerName(fn: unknown): string | undefined {
  if (typeof fn === "function" && typeof fn.name === "string" && fn.name.length > 0) {
    return fn.name;
  }
  if (fn && typeof fn === "object") {
    const name = (fn as { name?: unknown }).name;
    if (typeof name === "string" && name.length > 0) {
      return name;
    }
  }
  return undefined;
}

function normalizeScoreText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  try {
    return typeof value === "object" ? safeStringify(value) : String(value);
  } catch {
    return String(value);
  }
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

function toScorerContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(context: BuilderScoreContext<Payload, Params>): ScorerContext<Payload, Params> {
  return {
    payload: context.payload,
    params: context.params,
  };
}

interface AutoEvalSnapshot {
  raw?: AutoEvalScore;
  result: ScorerResult;
  score: number | null;
}

function storeAutoEvalSnapshot<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(context: BuilderScoreContext<Payload, Params>, snapshot: AutoEvalSnapshot): void {
  const raw = ensureRecord(context.results.raw);
  raw.autoEval = {
    raw: snapshot.raw,
    result: snapshot.result,
    score: snapshot.score,
  };
  context.results.raw = raw;
}

function extractAutoEvalSnapshot(metadata: unknown): AutoEvalSnapshot | undefined {
  if (!isRecord(metadata)) {
    return undefined;
  }

  const builderInfo = metadata.scorerBuilder;
  if (!isRecord(builderInfo)) {
    return undefined;
  }

  const raw = builderInfo.raw;
  if (!isRecord(raw)) {
    return undefined;
  }

  const entry = raw.autoEval;
  if (!isRecord(entry)) {
    return undefined;
  }

  const result = entry.result;
  if (!result || typeof result !== "object") {
    return undefined;
  }

  const score = entry.score;

  return {
    raw: entry.raw as AutoEvalScore | undefined,
    result: result as ScorerResult,
    score: typeof score === "number" ? score : null,
  };
}

function resolveAutoEvalScore(
  transformed: ScorerResult,
  autoEvalScore: AutoEvalScore,
): number | null {
  if (typeof transformed.score === "number") {
    return transformed.score;
  }
  if (typeof autoEvalScore.score === "number") {
    return autoEvalScore.score;
  }
  return null;
}

function ensureRecord(value: unknown): Record<string, unknown> {
  if (isRecord(value)) {
    return value;
  }
  return {};
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeMetadata(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}
