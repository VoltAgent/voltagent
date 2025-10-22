import {
  type CreateScorerOptions,
  type GenerateReasonResult,
  type GenerateScoreResult,
  type ScorerPipelineContext,
  type ScorerReasonContext,
  createScorer,
} from "./create-scorer";
import type { LocalScorerDefinition, SamplingPolicy, ScorerResult } from "./runtime";
import { buildSamplingMetadata, shouldSample } from "./runtime";

interface BuilderResultsSnapshot {
  prepare?: unknown;
  analyze?: unknown;
  score?: number | null;
  reason?: string | null;
  raw: Record<string, unknown>;
}

interface MutableBuilderResults {
  prepare?: unknown;
  analyze?: unknown;
  score?: number | null;
  reason?: string | null;
  raw: Record<string, unknown>;
}

interface BuilderContextBase<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  payload: Payload;
  params: Params;
  results: BuilderResultsSnapshot;
}

export interface BuilderPrepareContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> extends BuilderContextBase<Payload, Params> {
  kind: "prepare";
}

export interface BuilderAnalyzeContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> extends BuilderContextBase<Payload, Params> {
  kind: "analyze";
}

export interface BuilderScoreContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> extends BuilderContextBase<Payload, Params> {
  kind: "score";
}

export interface BuilderReasonContext<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> extends BuilderContextBase<Payload, Params> {
  kind: "reason";
  score: number | null;
}

export type BuilderPrepareStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = (context: BuilderPrepareContext<Payload, Params>) => unknown | Promise<unknown>;

export type BuilderAnalyzeStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = (context: BuilderAnalyzeContext<Payload, Params>) => unknown | Promise<unknown>;

export type BuilderScoreStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = (
  context: BuilderScoreContext<Payload, Params>,
) => GenerateScoreResult | number | Promise<GenerateScoreResult | number>;

export type BuilderReasonStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = (
  context: BuilderReasonContext<Payload, Params>,
) => GenerateReasonResult | string | Promise<GenerateReasonResult | string>;

interface BuilderStepRegistry<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  prepare?: BuilderPrepareStep<Payload, Params>;
  analyze?: BuilderAnalyzeStep<Payload, Params>;
  score?: BuilderScoreStep<Payload, Params>;
  reason?: BuilderReasonStep<Payload, Params>;
}

// Removed BuilderJudgeDefaults - users should provide models explicitly

type BuildScorerCustomOptions<
  Payload extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;
  label?: string;
  description?: string;
  metadata?: Record<string, unknown> | null;
  sampling?: SamplingPolicy;
  params?: Params | ((payload: Payload) => Params | undefined | Promise<Params | undefined>);
};

// Removed type shortcuts - be explicit about types
export type BuildScorerOptions<
  Payload extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
> = BuildScorerCustomOptions<Payload, Params>;

export interface BuildScorerRunArgs<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  payload: Payload;
  params?: Params;
  sampling?: SamplingPolicy;
}

export interface BuildScorerRunResult<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  id: string;
  status: "success" | "error" | "skipped";
  score: number | null;
  reason?: string;
  metadata: Record<string, unknown> | null;
  durationMs: number;
  sampling?: ReturnType<typeof buildSamplingMetadata>;
  rawResult: ScorerResult;
  payload: Payload;
  params: Params;
  steps: BuilderResultsSnapshot;
}

interface ScorerBuilderState<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  options: BuildScorerCustomOptions<Payload, Params>;
  steps: BuilderStepRegistry<Payload, Params>;
  cached?: LocalScorerDefinition<Payload, Params>;
}

export interface ScorerBuilder<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  prepare(step: BuilderPrepareStep<Payload, Params>): ScorerBuilder<Payload, Params>;
  analyze(step: BuilderAnalyzeStep<Payload, Params>): ScorerBuilder<Payload, Params>;
  score(step: BuilderScoreStep<Payload, Params>): ScorerBuilder<Payload, Params>;
  reason(step: BuilderReasonStep<Payload, Params>): ScorerBuilder<Payload, Params>;
  build(): LocalScorerDefinition<Payload, Params>;
  run(args: BuildScorerRunArgs<Payload, Params>): Promise<BuildScorerRunResult<Payload, Params>>;
  getId(): string;
  getLabel(): string;
  getDescription(): string | undefined;
}

class ScorerBuilderImpl<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> implements ScorerBuilder<Payload, Params>
{
  #state: ScorerBuilderState<Payload, Params>;

  constructor(options: BuildScorerCustomOptions<Payload, Params>) {
    this.#state = {
      options,
      steps: {},
    };
  }

  prepare(step: BuilderPrepareStep<Payload, Params>): ScorerBuilder<Payload, Params> {
    this.#state.steps.prepare = step;
    this.#state.cached = undefined;
    return this;
  }

  analyze(step: BuilderAnalyzeStep<Payload, Params>): ScorerBuilder<Payload, Params> {
    this.#state.steps.analyze = step;
    this.#state.cached = undefined;
    return this;
  }

  score(step: BuilderScoreStep<Payload, Params>): ScorerBuilder<Payload, Params> {
    this.#state.steps.score = step;
    this.#state.cached = undefined;
    return this;
  }

  reason(step: BuilderReasonStep<Payload, Params>): ScorerBuilder<Payload, Params> {
    this.#state.steps.reason = step;
    this.#state.cached = undefined;
    return this;
  }

  getId(): string {
    return this.#state.options.id;
  }

  getLabel(): string {
    return this.#state.options.label ?? this.#state.options.id;
  }

  getDescription(): string | undefined {
    return this.#state.options.description;
  }

  build(): LocalScorerDefinition<Payload, Params> {
    if (this.#state.cached) {
      return this.#state.cached;
    }

    if (!this.#state.steps.score) {
      throw new Error(`Scorer '${this.getId()}' is missing a required 'score' step.`);
    }

    const definition: LocalScorerDefinition<Payload, Params> = {
      id: this.#state.options.id,
      name: this.getLabel(),
      metadata: this.#state.options.metadata ?? null,
      sampling: this.#state.options.sampling,
      params: this.#state.options.params,
      scorer: async ({ payload, params }) => {
        const runResults: MutableBuilderResults = {
          raw: {},
        };

        const createOptions = this.#createOptionsForRun(runResults);
        const scorerInstance = createScorer<Payload, Params>(createOptions);
        const result = await scorerInstance.scorer({
          payload,
          params,
        });

        const mergedMetadata = mergeMetadataRecords(result.metadata, {
          scorerBuilder: {
            prepare: runResults.prepare,
            analyze: runResults.analyze,
            score: runResults.score ?? null,
            reason: runResults.reason ?? null,
            raw: { ...runResults.raw },
          },
        });

        return {
          ...result,
          metadata: mergedMetadata,
        };
      },
    };

    this.#state.cached = definition;
    return definition;
  }

  async run(
    args: BuildScorerRunArgs<Payload, Params>,
  ): Promise<BuildScorerRunResult<Payload, Params>> {
    const definition = this.build();
    const payload = args.payload;
    const resolvedParams = await this.#resolveParams(payload, args.params);

    const samplingPolicy = args.sampling ?? definition.sampling;
    const samplingMetadata = buildSamplingMetadata(samplingPolicy);

    if (samplingPolicy && !shouldSample(samplingPolicy)) {
      return {
        id: definition.id,
        status: "skipped",
        score: null,
        reason: undefined,
        metadata: null,
        durationMs: 0,
        sampling: samplingMetadata,
        rawResult: {
          status: "skipped",
          metadata: null,
          score: null,
        },
        payload,
        params: resolvedParams,
        steps: this.#emptySnapshot(),
      };
    }

    const startedAt = Date.now();
    const result = await definition.scorer({
      payload,
      params: resolvedParams,
    });
    const durationMs = Date.now() - startedAt;

    const status = result.status ?? "success";
    const score =
      typeof result.score === "number" ? result.score : result.score === null ? null : null;

    const builderSnapshot = extractBuilderSnapshot(result.metadata);
    const builderReason = builderSnapshot?.reason ?? undefined;
    const reason =
      builderReason ??
      (typeof result.metadata === "object" &&
      result.metadata !== null &&
      typeof (result.metadata as Record<string, unknown>).reason === "string"
        ? String((result.metadata as Record<string, unknown>).reason)
        : undefined);

    const metadata =
      result.metadata && typeof result.metadata === "object"
        ? (result.metadata as Record<string, unknown>)
        : null;

    return {
      id: definition.id,
      status,
      score,
      reason,
      metadata,
      durationMs,
      sampling: samplingMetadata,
      rawResult: result,
      payload,
      params: resolvedParams,
      steps: builderSnapshot ?? this.#emptySnapshot(),
    };
  }

  #createOptionsForRun(runResults: MutableBuilderResults): CreateScorerOptions<Payload, Params> {
    const prepareStep = this.#state.steps.prepare;
    const preprocess = prepareStep
      ? async (context: ScorerPipelineContext<Payload, Params>) => {
          this.#updateRawResults(runResults, context);
          const output = await prepareStep(this.#prepareContext(context, runResults));
          runResults.prepare = output;
          return output;
        }
      : undefined;

    const analyzeStep = this.#state.steps.analyze;
    const analyze = analyzeStep
      ? async (context: ScorerPipelineContext<Payload, Params>) => {
          this.#updateRawResults(runResults, context);
          const output = await analyzeStep(this.#analyzeContext(context, runResults));
          runResults.analyze = output;
          return output;
        }
      : undefined;

    const scoreStep = this.#state.steps.score;
    if (!scoreStep) {
      throw new Error("Scorer builder requires a score step");
    }
    const generateScore = async (context: ScorerPipelineContext<Payload, Params>) => {
      this.#updateRawResults(runResults, context);
      const result = await scoreStep(this.#scoreContext(context, runResults));
      const numericScore = typeof result === "number" ? result : result.score;
      runResults.score = numericScore ?? null;
      return result;
    };

    const reasonStep = this.#state.steps.reason;
    const generateReason = reasonStep
      ? async (context: ScorerReasonContext<Payload, Params>) => {
          this.#updateRawResults(runResults, context);
          const output = await reasonStep(this.#reasonContext(context, runResults));
          const reasonText = typeof output === "string" ? output : output.reason;
          runResults.reason = reasonText ?? null;
          return output;
        }
      : undefined;

    return {
      id: this.#state.options.id,
      name: this.getLabel(),
      metadata: this.#state.options.metadata ?? null,
      preprocess,
      analyze,
      generateScore,
      generateReason,
    };
  }

  #prepareContext(
    context: ScorerPipelineContext<Payload, Params>,
    runResults: MutableBuilderResults,
  ): BuilderPrepareContext<Payload, Params> {
    return {
      kind: "prepare",
      payload: context.payload,
      params: context.params,
      results: this.#snapshotResults(runResults),
    };
  }

  #analyzeContext(
    context: ScorerPipelineContext<Payload, Params>,
    runResults: MutableBuilderResults,
  ): BuilderAnalyzeContext<Payload, Params> {
    return {
      kind: "analyze",
      payload: context.payload,
      params: context.params,
      results: this.#snapshotResults(runResults),
    };
  }

  #scoreContext(
    context: ScorerPipelineContext<Payload, Params>,
    runResults: MutableBuilderResults,
  ): BuilderScoreContext<Payload, Params> {
    return {
      kind: "score",
      payload: context.payload,
      params: context.params,
      results: this.#snapshotResults(runResults),
    };
  }

  #reasonContext(
    context: ScorerReasonContext<Payload, Params>,
    runResults: MutableBuilderResults,
  ): BuilderReasonContext<Payload, Params> {
    return {
      kind: "reason",
      payload: context.payload,
      params: context.params,
      score: context.score ?? null,
      results: this.#snapshotResults(runResults),
    };
  }

  #emptySnapshot(): BuilderResultsSnapshot {
    return { raw: {} };
  }

  #snapshotResults(runResults: MutableBuilderResults): BuilderResultsSnapshot {
    return {
      prepare: runResults.prepare,
      analyze: runResults.analyze,
      score: runResults.score ?? null,
      reason: runResults.reason ?? null,
      raw: runResults.raw,
    };
  }

  #updateRawResults(
    runResults: MutableBuilderResults,
    context: ScorerPipelineContext<Payload, Params> | ScorerReasonContext<Payload, Params>,
  ): void {
    const rawEntries = context.results ?? {};
    runResults.raw = rawEntries as Record<string, unknown>;
  }

  async #resolveParams(payload: Payload, override?: Params): Promise<Params> {
    const base = this.#state.options.params;
    const resolvedBase = typeof base === "function" ? ((await base(payload)) ?? {}) : (base ?? {});

    if (!override) {
      return { ...(resolvedBase as Params) };
    }

    return {
      ...(resolvedBase as Params),
      ...override,
    };
  }
}

function mergeMetadataRecords(
  original: Record<string, unknown> | null | undefined,
  extra: Record<string, unknown>,
): Record<string, unknown> | null {
  const base = original ? { ...original } : {};

  for (const [key, value] of Object.entries(extra)) {
    const existing = base[key];
    if (
      existing &&
      typeof existing === "object" &&
      existing !== null &&
      !Array.isArray(existing) &&
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value)
    ) {
      base[key] = {
        ...(existing as Record<string, unknown>),
        ...(value as Record<string, unknown>),
      };
    } else {
      base[key] = value;
    }
  }

  return Object.keys(base).length > 0 ? base : null;
}

function extractBuilderSnapshot(
  metadata: Record<string, unknown> | null | undefined,
): BuilderResultsSnapshot | undefined {
  if (!metadata || typeof metadata !== "object") {
    return undefined;
  }
  const record = metadata as Record<string, unknown>;
  const builderInfo = record.scorerBuilder;
  if (!builderInfo || typeof builderInfo !== "object" || Array.isArray(builderInfo)) {
    return undefined;
  }

  const info = builderInfo as Record<string, unknown>;
  const rawValue = info.raw;
  const raw =
    rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)
      ? { ...(rawValue as Record<string, unknown>) }
      : {};

  const scoreValue = info.score;
  const normalizedScore =
    typeof scoreValue === "number" ? scoreValue : scoreValue === null ? null : null;

  const reasonValue = info.reason;

  return {
    prepare: info.prepare,
    analyze: info.analyze,
    score: normalizedScore,
    reason: typeof reasonValue === "string" ? reasonValue : null,
    raw,
  } satisfies BuilderResultsSnapshot;
}

export function buildScorer<
  Payload extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, unknown> = Record<string, unknown>,
>(options: BuildScorerOptions<Payload, Params>): ScorerBuilder<Payload, Params> {
  if (!options?.id) {
    throw new Error("buildScorer requires an 'id' property.");
  }
  return new ScorerBuilderImpl(options);
}
