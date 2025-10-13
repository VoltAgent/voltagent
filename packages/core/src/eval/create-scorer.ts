import { safeStringify } from "@voltagent/internal/utils";

import type { LocalScorerDefinition } from "./runtime";

export interface ScorerPipelineContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  payload: Payload;
  params: Params;
  results: Record<string, unknown>;
}

export interface ScorerReasonContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> extends ScorerPipelineContext<Payload, Params> {
  score: number | null;
}

type PreprocessFunctionStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = (context: ScorerPipelineContext<Payload, Params>) => unknown | Promise<unknown>;

type AnalyzeFunctionStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = (context: ScorerPipelineContext<Payload, Params>) => unknown | Promise<unknown>;

export type GenerateScoreResult =
  | number
  | {
      score: number;
      metadata?: Record<string, unknown> | null;
    };

export type PreprocessStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = PreprocessFunctionStep<Payload, Params>;

export type AnalyzeStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = AnalyzeFunctionStep<Payload, Params>;

export type GenerateScoreStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = (
  context: ScorerPipelineContext<Payload, Params>,
) => GenerateScoreResult | Promise<GenerateScoreResult>;

export type GenerateReasonResult =
  | string
  | {
      reason: string;
      metadata?: Record<string, unknown> | null;
    };

export type GenerateReasonStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = (
  context: ScorerReasonContext<Payload, Params>,
) => GenerateReasonResult | Promise<GenerateReasonResult>;

export interface CreateScorerOptions<
  Payload extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
> {
  id: string;
  name?: string;
  metadata?: Record<string, unknown> | null;
  preprocess?: PreprocessStep<Payload, Params>;
  analyze?: AnalyzeStep<Payload, Params>;
  generateScore?: GenerateScoreStep<Payload, Params>;
  generateReason?: GenerateReasonStep<Payload, Params>;
}

export function createScorer<
  Payload extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
>(options: CreateScorerOptions<Payload, Params>): LocalScorerDefinition<Payload, Params> {
  const {
    id,
    name,
    metadata: baseMetadata,
    preprocess,
    analyze,
    generateScore,
    generateReason,
  } = options;

  return {
    id,
    name: name ?? id,
    metadata: baseMetadata ?? null,
    scorer: async ({ payload, params }) => {
      const results: Record<string, unknown> = {};
      let metadata = cloneMetadata(baseMetadata);
      let score: number | null = null;
      let reason: string | undefined;

      try {
        const context: ScorerPipelineContext<Payload, Params> = {
          payload,
          params,
          results,
        };

        if (preprocess) {
          const preprocessResult = await preprocess(context);
          if (preprocessResult !== undefined) {
            results.preprocess = preprocessResult;
          }
        }

        if (analyze) {
          const analyzeResult = await analyze(context);
          if (analyzeResult !== undefined) {
            results.analyze = analyzeResult;
          }
        }

        if (generateScore) {
          const scoreResult = await generateScore(context);
          const normalizedScore = normalizeGenerateScore(scoreResult);
          score = normalizedScore.score;
          metadata = mergeMetadata(metadata, normalizedScore.metadata);
          results.generateScore = normalizedScore.raw;
        }

        if (generateReason) {
          const reasonContext: ScorerReasonContext<Payload, Params> = {
            payload,
            params,
            results,
            score,
          };

          const reasonResult = await generateReason(reasonContext);
          if (typeof reasonResult === "string") {
            reason = reasonResult;
          } else {
            reason = reasonResult.reason;
            metadata = mergeMetadata(metadata, reasonResult.metadata ?? null);
          }
        }

        if (reason) {
          metadata = mergeMetadata(metadata, { reason });
        }

        return {
          status: "success",
          score,
          metadata,
        };
      } catch (error) {
        const errorMetadata = getErrorMetadata(error);
        if (errorMetadata) {
          metadata = mergeMetadata(metadata, errorMetadata);
        }
        return {
          status: "error",
          score,
          metadata,
          error,
        };
      }
    },
  };
}

function mergeMetadata(
  primary: Record<string, unknown> | null | undefined,
  secondary: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const base = cloneMetadata(primary) ?? {};
  const extra = cloneMetadata(secondary);

  if (extra) {
    Object.assign(base, extra);
  }

  return Object.keys(base).length > 0 ? base : null;
}

type NormalizedScoreResult = {
  score: number | null;
  metadata: Record<string, unknown> | null;
  raw: GenerateScoreResult;
};

function normalizeGenerateScore(value: GenerateScoreResult): NormalizedScoreResult {
  if (typeof value === "number") {
    return {
      score: Number.isFinite(value) ? value : null,
      metadata: null,
      raw: value,
    };
  }

  const score =
    typeof value.score === "number" && Number.isFinite(value.score) ? value.score : null;
  const metadata = value.metadata ? cloneMetadata(value.metadata) : null;

  return {
    score,
    metadata,
    raw: value,
  };
}

function cloneMetadata(
  value: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(safeStringify(value)) as Record<string, unknown>;
  } catch {
    return { ...value };
  }
}

function getErrorMetadata(error: unknown): Record<string, unknown> | null {
  if (!error || typeof error !== "object") {
    return null;
  }

  const metadata = (error as { metadata?: unknown }).metadata;
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  try {
    return JSON.parse(safeStringify(metadata)) as Record<string, unknown>;
  } catch {
    return { ...(metadata as Record<string, unknown>) };
  }
}

export interface WeightedBlendComponent<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  id: string;
  weight: number;
  step?: GenerateScoreStep<Payload, Params>;
}

export interface WeightedBlendOptions {
  metadataKey?: string;
}

export function weightedBlend<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(
  components: WeightedBlendComponent<Payload, Params>[],
  options?: WeightedBlendOptions,
): GenerateScoreStep<Payload, Params> {
  if (!Array.isArray(components) || components.length === 0) {
    throw new Error("weightedBlend requires at least one component");
  }

  const metadataKey = options?.metadataKey ?? "blend";

  return async (context) => {
    const resolved: Array<{
      id: string;
      weight: number;
      score: number | null;
      metadata: Record<string, unknown> | null;
    }> = [];

    for (const component of components) {
      let normalizedResult: NormalizedScoreResult | null = null;

      if (component.step) {
        const rawResult = await component.step(context);
        normalizedResult = normalizeGenerateScore(rawResult);
        context.results[component.id] = normalizedResult;
      } else {
        const existing = context.results[component.id] as NormalizedScoreResult | undefined;
        if (existing && typeof existing.score === "number") {
          normalizedResult = existing;
        }
      }

      if (!normalizedResult) {
        resolved.push({ id: component.id, weight: component.weight, score: null, metadata: null });
        continue;
      }

      resolved.push({
        id: component.id,
        weight: component.weight,
        score: typeof normalizedResult.score === "number" ? normalizedResult.score : null,
        metadata: normalizedResult.metadata,
      });
    }

    const valid = resolved.filter(
      (entry) => typeof entry.score === "number" && Number.isFinite(entry.score),
    );
    const totalWeight = valid.reduce((sum, entry) => sum + entry.weight, 0);

    if (valid.length === 0 || totalWeight === 0) {
      return {
        score: 0,
        metadata: {
          [metadataKey]: {
            components: resolved,
            totalWeight,
          },
        },
      };
    }

    const finalScore =
      valid.reduce((sum, entry) => sum + (entry.score ?? 0) * entry.weight, 0) / totalWeight;

    const metadata = {
      [metadataKey]: {
        components: resolved.map((entry) => ({
          id: entry.id,
          weight: entry.weight,
          normalizedWeight: totalWeight === 0 ? 0 : entry.weight / totalWeight,
          score: entry.score,
          metadata: entry.metadata ?? undefined,
        })),
        totalWeight,
      },
    } satisfies Record<string, unknown>;

    return {
      score: finalScore,
      metadata,
    };
  };
}
