import { safeStringify } from "@voltagent/internal/utils";
import type {
  EmbeddingModel,
  GenerateTextResult,
  LanguageModel,
  ToolChoice,
  ToolSet,
  TypedToolCall,
  TypedToolResult,
} from "ai";
import { embedMany, generateText } from "ai";

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

type StepResult = unknown;

type PreprocessFunctionStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = (context: ScorerPipelineContext<Payload, Params>) => StepResult | Promise<StepResult>;

type AnalyzeFunctionStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = (context: ScorerPipelineContext<Payload, Params>) => StepResult | Promise<StepResult>;

export type GenerateScoreResult =
  | number
  | {
      score: number;
      metadata?: Record<string, unknown> | null;
    };

interface LlmStepExecutionArgs<Context> {
  context: Context;
  prompt: string;
  text: string;
  raw: unknown;
}

interface LlmStepBase<Context, Result> {
  type: "llm";
  model: LanguageModel;
  maxOutputTokens?: number;
  buildPrompt: (context: Context) => string | Promise<string>;
  parse: (args: LlmStepExecutionArgs<Context>) => Result | Promise<Result>;
  onResult?: (args: LlmStepExecutionArgs<Context>) => void | Promise<void>;
  execute?: (args: { context: Context; prompt: string }) => Promise<{ text: string; raw: unknown }>;
}

export type LlmPreprocessStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = LlmStepBase<ScorerPipelineContext<Payload, Params>, StepResult>;

export type LlmAnalyzeStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = LlmStepBase<ScorerPipelineContext<Payload, Params>, StepResult>;

export type LlmGenerateScoreStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = LlmStepBase<ScorerPipelineContext<Payload, Params>, GenerateScoreResult>;

export type PreprocessStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = PreprocessFunctionStep<Payload, Params> | LlmPreprocessStep<Payload, Params>;

export type AnalyzeStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = AnalyzeFunctionStep<Payload, Params> | LlmAnalyzeStep<Payload, Params>;

export type GenerateScoreStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> =
  | ((
      context: ScorerPipelineContext<Payload, Params>,
    ) => GenerateScoreResult | Promise<GenerateScoreResult>)
  | LlmGenerateScoreStep<Payload, Params>;

export type GenerateReasonResult =
  | string
  | {
      reason: string;
      metadata?: Record<string, unknown> | null;
    };

export type LlmGenerateReasonStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> = LlmStepBase<ScorerReasonContext<Payload, Params>, GenerateReasonResult>;

type GenerateReasonStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> =
  | ((
      context: ScorerReasonContext<Payload, Params>,
    ) => GenerateReasonResult | Promise<GenerateReasonResult>)
  | LlmGenerateReasonStep<Payload, Params>;

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
          if (isLlmPreprocessStep(preprocess)) {
            const llmResult = await executeLlmStep(preprocess, context);
            results.preprocessPrompt = llmResult.prompt;
            results.preprocessRaw = llmResult.raw;
            if (llmResult.result !== undefined) {
              results.preprocess = llmResult.result;
            }
          } else {
            const preprocessResult = await preprocess(context);
            if (preprocessResult !== undefined) {
              results.preprocess = preprocessResult;
            }
          }
        }

        if (analyze) {
          if (isLlmAnalyzeStep(analyze)) {
            const llmResult = await executeLlmStep(analyze, context);
            results.analyzePrompt = llmResult.prompt;
            results.analyzeRaw = llmResult.raw;
            if (llmResult.result !== undefined) {
              results.analyze = llmResult.result;
            }
          } else {
            const analyzeResult = await analyze(context);
            if (analyzeResult !== undefined) {
              results.analyze = analyzeResult;
            }
          }
        }

        if (generateScore) {
          if (isLlmGenerateScoreStep(generateScore)) {
            const llmResult = await executeLlmStep(generateScore, context);
            results.generateScorePrompt = llmResult.prompt;
            results.generateScoreRaw = llmResult.raw;
            if (typeof llmResult.result === "number") {
              score = llmResult.result;
            } else {
              score = llmResult.result.score;
              metadata = mergeMetadata(metadata, llmResult.result.metadata ?? null);
            }
          } else {
            const scoreResult = await generateScore(context);
            if (typeof scoreResult === "number") {
              score = scoreResult;
            } else {
              score = scoreResult.score;
              metadata = mergeMetadata(metadata, scoreResult.metadata ?? null);
            }
          }
        }

        if (generateReason) {
          const reasonContext: ScorerReasonContext<Payload, Params> = {
            payload,
            params,
            results,
            score,
          };

          if (isLlmGenerateReasonStep(generateReason)) {
            const llmReason = await executeLlmStep(generateReason, reasonContext);
            results.generateReasonPrompt = llmReason.prompt;
            results.generateReasonRaw = llmReason.raw;
            if (typeof llmReason.result === "string") {
              reason = llmReason.result;
            } else {
              reason = llmReason.result.reason;
              metadata = mergeMetadata(metadata, llmReason.result.metadata ?? null);
            }
          } else {
            const reasonResult = await generateReason(reasonContext);
            if (typeof reasonResult === "string") {
              reason = reasonResult;
            } else {
              reason = reasonResult.reason;
              metadata = mergeMetadata(metadata, reasonResult.metadata ?? null);
            }
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

function isLlmStep(value: unknown): value is LlmStepBase<unknown, unknown> {
  return (
    Boolean(value) && typeof value === "object" && (value as { type?: unknown }).type === "llm"
  );
}

function isLlmPreprocessStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(value: PreprocessStep<Payload, Params>): value is LlmPreprocessStep<Payload, Params> {
  return isLlmStep(value);
}

function isLlmAnalyzeStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(value: AnalyzeStep<Payload, Params>): value is LlmAnalyzeStep<Payload, Params> {
  return isLlmStep(value);
}

function isLlmGenerateScoreStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(value: GenerateScoreStep<Payload, Params>): value is LlmGenerateScoreStep<Payload, Params> {
  return isLlmStep(value);
}

function isLlmGenerateReasonStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(value: GenerateReasonStep<Payload, Params>): value is LlmGenerateReasonStep<Payload, Params> {
  return isLlmStep(value);
}

async function executeLlmStep<Context, Result>(
  step: LlmStepBase<Context, Result>,
  context: Context,
): Promise<{ result: Result; prompt: string; raw: unknown }> {
  const prompt = await step.buildPrompt(context);
  const execution = step.execute
    ? await step.execute({ context, prompt })
    : await defaultGenerateTextCall(step, prompt);
  const args: LlmStepExecutionArgs<Context> = {
    context,
    prompt,
    text: execution.text,
    raw: execution.raw,
  };
  if (step.onResult) {
    await step.onResult(args);
  }
  const parsed = await step.parse(args);
  return {
    result: parsed,
    prompt,
    raw: execution.raw,
  };
}

async function defaultGenerateTextCall<Context, Result>(
  step: LlmStepBase<Context, Result>,
  prompt: string,
): Promise<{ text: string; raw: GenerateTextResult<ToolSet, unknown> }> {
  const response = await generateText({
    model: step.model,
    prompt,
    maxOutputTokens: step.maxOutputTokens,
  });
  return {
    text: response.text,
    raw: response,
  };
}

export interface CreateLlmStepOptions<Context, Result> {
  model: LanguageModel;
  maxOutputTokens?: number;
  buildPrompt: (context: Context) => string | Promise<string>;
  parse: (args: LlmStepExecutionArgs<Context>) => Result | Promise<Result>;
  onResult?: (args: LlmStepExecutionArgs<Context>) => void | Promise<void>;
}

export function createLlmStep<Context, Result>(
  options: CreateLlmStepOptions<Context, Result>,
): LlmStepBase<Context, Result> {
  return {
    type: "llm",
    ...options,
  } satisfies LlmStepBase<Context, Result>;
}

export function evaluateWithLlm<Context, Result>(
  options: CreateLlmStepOptions<Context, Result> & { context: Context },
): Promise<{ result: Result; prompt: string; raw: unknown }> {
  const step = createLlmStep<Context, Result>(options);
  return executeLlmStep(step, options.context);
}

type SafeParseResult<Result> = { success: true; data: Result } | { success: false; error: unknown };

export type LlmPromptSchema<Result> =
  | ((input: unknown) => Result | Promise<Result>)
  | {
      parse?: (input: unknown) => Result | Promise<Result>;
      parseAsync?: (input: unknown) => Promise<Result>;
      safeParse?: (input: unknown) => SafeParseResult<Result>;
      safeParseAsync?: (input: unknown) => Promise<SafeParseResult<Result>>;
    };

export interface LlmPromptTransformArgs<Context, SchemaResult> {
  context: Context;
  prompt: string;
  raw: string;
  value: SchemaResult;
}

export interface LlmPromptResultArgs<Context, SchemaResult, Result>
  extends LlmPromptTransformArgs<Context, SchemaResult> {
  result: Result;
}

export interface CreateLlmPromptStepOptions<Context, SchemaResult, Result = SchemaResult> {
  model: LanguageModel;
  buildPrompt: (context: Context) => string | Promise<string>;
  schema: LlmPromptSchema<SchemaResult>;
  transform?: (args: LlmPromptTransformArgs<Context, SchemaResult>) => Result | Promise<Result>;
  onResult?: (args: LlmPromptResultArgs<Context, SchemaResult, Result>) => void | Promise<void>;
  onRawResult?: (args: LlmStepExecutionArgs<Context>) => void | Promise<void>;
  maxOutputTokens?: number;
}

export function createLlmPromptStep<Context, SchemaResult, Result = SchemaResult>(
  options: CreateLlmPromptStepOptions<Context, SchemaResult, Result>,
): LlmStepBase<Context, Result> {
  const { model, buildPrompt, schema, transform, onResult, onRawResult, maxOutputTokens } = options;

  return createLlmStep<Context, Result>({
    model,
    buildPrompt,
    maxOutputTokens,
    onResult: onRawResult,
    parse: async ({ context, prompt, text }) => {
      const rawText = typeof text === "string" ? text : String(text);
      const normalized = rawText.trim();

      const structuredValue = await parseStructuredResponse(normalized, schema);
      const transformArgs: LlmPromptTransformArgs<Context, SchemaResult> = {
        context,
        prompt,
        raw: normalized,
        value: structuredValue,
      };

      const finalResult = (await (transform?.(transformArgs) ?? structuredValue)) as Result;

      if (onResult) {
        await onResult({ ...transformArgs, result: finalResult });
      }

      return finalResult;
    },
  });
}

export interface LlmToolStepData<Tools extends ToolSet> {
  toolCalls: TypedToolCall<Tools>[];
  toolResults: TypedToolResult<Tools>[];
  text: string;
}

export interface LlmToolTransformArgs<Context, Tools extends ToolSet>
  extends LlmToolStepData<Tools> {
  context: Context;
  prompt: string;
  raw: string;
  response: GenerateTextResult<Tools, unknown>;
}

export interface LlmToolResultArgs<Context, Tools extends ToolSet, Result>
  extends LlmToolTransformArgs<Context, Tools> {
  result: Result;
}

export interface CreateLlmToolStepOptions<
  Context,
  Tools extends ToolSet,
  Result = LlmToolStepData<Tools>,
> {
  model: LanguageModel;
  buildPrompt: (context: Context) => string | Promise<string>;
  tools: Tools;
  toolChoice?: ToolChoice<Tools>;
  maxOutputTokens?: number;
  requireToolCall?: boolean;
  transform?: (args: LlmToolTransformArgs<Context, Tools>) => Result | Promise<Result>;
  onResult?: (args: LlmToolResultArgs<Context, Tools, Result>) => void | Promise<void>;
  onRawResult?: (args: LlmStepExecutionArgs<Context>) => void | Promise<void>;
}

export function createLlmToolStep<Context, Tools extends ToolSet, Result = LlmToolStepData<Tools>>(
  options: CreateLlmToolStepOptions<Context, Tools, Result>,
): LlmStepBase<Context, Result> {
  const {
    model,
    buildPrompt,
    tools,
    toolChoice,
    maxOutputTokens,
    requireToolCall = true,
    transform,
    onResult,
    onRawResult,
  } = options;

  return {
    type: "llm",
    model,
    maxOutputTokens,
    buildPrompt,
    onResult: onRawResult,
    execute: async ({ prompt }) => {
      const response = await generateText({
        model,
        prompt,
        maxOutputTokens,
        tools,
        toolChoice,
      });
      return {
        text: response.text,
        raw: response,
      };
    },
    parse: async ({ context, prompt, raw, text }) => {
      const response = raw as GenerateTextResult<Tools, unknown>;
      const toolCalls = response.toolCalls ?? [];
      const toolResults = response.toolResults ?? [];
      const normalizedText = typeof text === "string" ? text.trim() : "";

      const invalidCalls = toolCalls.filter((call) => call.invalid === true);
      if (invalidCalls.length > 0) {
        throw createToolCallError({
          message: "LLM returned invalid tool arguments",
          prompt,
          raw: normalizedText,
          expectedTools: Object.keys(tools ?? {}),
          calls: invalidCalls,
        });
      }

      const dynamicCalls = toolCalls.filter((call) => call.dynamic === true && !call.invalid);
      if (dynamicCalls.length > 0) {
        throw createToolCallError({
          message: "LLM invoked an unexpected tool",
          prompt,
          raw: normalizedText,
          expectedTools: Object.keys(tools ?? {}),
          calls: dynamicCalls,
        });
      }

      if (requireToolCall && toolCalls.length === 0) {
        throw createToolCallError({
          message: "LLM did not call any tools",
          prompt,
          raw: normalizedText,
          expectedTools: Object.keys(tools ?? {}),
        });
      }

      const summary: LlmToolStepData<Tools> = {
        toolCalls,
        toolResults,
        text: normalizedText,
      };

      const transformArgs: LlmToolTransformArgs<Context, Tools> = {
        context,
        prompt,
        raw: normalizedText,
        response,
        ...summary,
      };

      const finalResult = (await (transform?.(transformArgs) ?? summary)) as Result;

      if (onResult) {
        await onResult({ ...transformArgs, result: finalResult });
      }

      return finalResult;
    },
  } satisfies LlmStepBase<Context, Result>;
}

export interface ParallelStepDefinition<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  id: string;
  step: GenerateScoreStep<Payload, Params>;
}

export function parallelSteps<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(definitions: ParallelStepDefinition<Payload, Params>[]): GenerateScoreStep<Payload, Params> {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    throw new Error("parallelSteps requires at least one step definition");
  }

  return async (context) => {
    const components: Array<{
      id: string;
      score: number | null;
      metadata: Record<string, unknown> | null;
    }> = [];

    for (const { id, step } of definitions) {
      const rawResult = await runGenerateScoreStep(step, context);
      const normalized = normalizeGenerateScore(rawResult);
      components.push({ id, score: normalized.score, metadata: normalized.metadata });
      context.results[id] = normalized;
    }

    const validScores = components.filter(
      (entry): entry is { id: string; score: number; metadata: Record<string, unknown> | null } =>
        typeof entry.score === "number" && Number.isFinite(entry.score),
    );
    const finalScore =
      validScores.length > 0
        ? validScores.reduce((sum, entry) => sum + entry.score, 0) / validScores.length
        : 0;

    return {
      score: finalScore,
      metadata: {
        components,
      },
    } satisfies GenerateScoreResult;
  };
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
        const rawResult = await runGenerateScoreStep(component.step, context);
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
      } satisfies GenerateScoreResult;
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
    } satisfies GenerateScoreResult;
  };
}

export interface EmbeddingSimilarityReference {
  id?: string;
  text: string;
}

export interface EmbeddingSimilarityInput {
  query: string;
  references: EmbeddingSimilarityReference[];
}

export interface EmbeddingSimilarityItem {
  id: string;
  text: string;
  similarity: number;
  score: number;
  embedding?: number[];
}

export interface EmbeddingSimilarityStepResult {
  aggregateScore: number;
  strategy: "max" | "average" | "custom";
  items: EmbeddingSimilarityItem[];
  usage: number;
}

export interface EmbeddingSimilarityTransformArgs<Context> {
  context: Context;
  input: EmbeddingSimilarityInput;
  queryEmbedding: number[];
  referenceEmbeddings: number[][];
  items: EmbeddingSimilarityItem[];
  aggregateScore: number;
  strategy: "max" | "average" | "custom";
  usage: number;
}

export interface EmbeddingSimilarityResultArgs<Context, Result>
  extends EmbeddingSimilarityTransformArgs<Context> {
  result: Result;
}

export interface CreateEmbeddingSimilarityStepOptions<
  Context,
  Result = EmbeddingSimilarityStepResult,
> {
  model: EmbeddingModel<string>;
  buildInput: (context: Context) => EmbeddingSimilarityInput | Promise<EmbeddingSimilarityInput>;
  strategy?: "max" | "average" | ((items: EmbeddingSimilarityItem[]) => number);
  normalize?: boolean;
  includeEmbeddings?: boolean;
  transform?: (args: EmbeddingSimilarityTransformArgs<Context>) => Result | Promise<Result>;
  onResult?: (args: EmbeddingSimilarityResultArgs<Context, Result>) => void | Promise<void>;
}

export function createEmbeddingSimilarityStep<Context, Result = EmbeddingSimilarityStepResult>(
  options: CreateEmbeddingSimilarityStepOptions<Context, Result>,
): (context: Context) => Promise<Result> {
  const {
    model,
    buildInput,
    strategy = "max",
    normalize = true,
    includeEmbeddings = false,
    transform,
    onResult,
  } = options;

  return async (context) => {
    const input = await buildInput(context);

    if (!input || typeof input.query !== "string" || input.query.trim().length === 0) {
      throw new Error("Embedding similarity requires a non-empty query value");
    }

    if (!Array.isArray(input.references) || input.references.length === 0) {
      throw new Error("Embedding similarity requires at least one reference value");
    }

    const values = [input.query, ...input.references.map((reference) => reference.text)];
    const embeddingResult = await embedMany({ model, values });

    const embeddings = embeddingResult.embeddings as unknown as number[][];
    const [queryEmbedding, ...referenceEmbeddings] = embeddings;

    const items: EmbeddingSimilarityItem[] = referenceEmbeddings.map((embedding, index) => {
      const similarity = cosineSimilarity(queryEmbedding, embedding);
      const score = normalize ? similarityToScore(similarity) : similarity;
      return {
        id: input.references[index]?.id ?? String(index),
        text: input.references[index]?.text ?? "",
        similarity,
        score,
        embedding: includeEmbeddings ? embedding : undefined,
      } satisfies EmbeddingSimilarityItem;
    });

    const aggregateScore = computeEmbeddingAggregate(items, strategy);
    const strategyLabel: "max" | "average" | "custom" =
      typeof strategy === "function" ? "custom" : strategy;

    const baseResult: EmbeddingSimilarityStepResult = {
      aggregateScore,
      strategy: strategyLabel,
      items,
      usage: embeddingResult.usage?.tokens ?? 0,
    } satisfies EmbeddingSimilarityStepResult;

    const transformArgs: EmbeddingSimilarityTransformArgs<Context> = {
      context,
      input,
      queryEmbedding,
      referenceEmbeddings,
      items,
      aggregateScore,
      strategy: strategyLabel,
      usage: embeddingResult.usage?.tokens ?? 0,
    } satisfies EmbeddingSimilarityTransformArgs<Context>;

    const finalResult = (await (transform?.(transformArgs) ??
      (baseResult as unknown as Result))) as Result;

    if (onResult) {
      await onResult({ ...transformArgs, result: finalResult });
    }

    return finalResult;
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

export async function parseStructuredResponse<SchemaResult>(
  text: string,
  schema: LlmPromptSchema<SchemaResult>,
): Promise<SchemaResult> {
  const trimmed = text.trim();

  if (!trimmed) {
    const error = new Error("LLM response was empty") as ErrorWithMetadata;
    error.metadata = { raw: text };
    throw error;
  }

  const candidates = collectJsonCandidates(trimmed);
  const attemptErrors: unknown[] = [];

  for (const candidate of candidates) {
    try {
      const parsedCandidate = JSON.parse(candidate);
      return await validateAgainstSchema(schema, parsedCandidate);
    } catch (error) {
      attemptErrors.push(error);
    }
  }

  try {
    return await validateAgainstSchema(schema, trimmed);
  } catch (schemaError) {
    throw createPromptSchemaError(trimmed, text, attemptErrors, schemaError);
  }
}

async function validateAgainstSchema<SchemaResult>(
  schema: LlmPromptSchema<SchemaResult>,
  value: unknown,
): Promise<SchemaResult> {
  if (typeof schema === "function") {
    return schema(value);
  }

  if (schema && typeof schema.safeParseAsync === "function") {
    const result = await schema.safeParseAsync(value);
    if (!result.success) {
      throw result.error ?? new Error("Schema validation failed");
    }
    return result.data;
  }

  if (schema && typeof schema.parseAsync === "function") {
    return schema.parseAsync(value);
  }

  if (schema && typeof schema.safeParse === "function") {
    const result = schema.safeParse(value);
    if (!result.success) {
      throw result.error ?? new Error("Schema validation failed");
    }
    return result.data;
  }

  if (schema && typeof schema.parse === "function") {
    return schema.parse(value);
  }

  throw new Error("Schema must provide a parse method or be a function");
}

function collectJsonCandidates(text: string): string[] {
  const distinct = new Set<string>();
  const fenced = extractCodeFence(text);
  if (fenced) {
    distinct.add(fenced);
  }

  const objectCandidate = extractEnclosedSegment(text, "{", "}");
  if (objectCandidate) {
    distinct.add(objectCandidate);
  }

  const arrayCandidate = extractEnclosedSegment(text, "[", "]");
  if (arrayCandidate) {
    distinct.add(arrayCandidate);
  }

  distinct.add(text);

  return Array.from(distinct).filter((candidate) => candidate.trim().length > 0);
}

function extractCodeFence(text: string): string | null {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (!match) {
    return null;
  }
  const content = match[1]?.trim();
  return content && content.length > 0 ? content : null;
}

function extractEnclosedSegment(text: string, startToken: string, endToken: string): string | null {
  const startIndex = text.indexOf(startToken);
  const endIndex = text.lastIndexOf(endToken);
  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    return null;
  }

  const segment = text.slice(startIndex, endIndex + 1).trim();
  return segment.length > 0 ? segment : null;
}

function createPromptSchemaError(
  raw: string,
  originalText: string,
  attemptErrors: unknown[],
  validationError?: unknown,
): ErrorWithMetadata {
  const error = new Error("LLM response did not match expected schema") as ErrorWithMetadata & {
    cause?: unknown;
  };
  error.metadata = compactMetadata({
    raw,
    original: originalText,
    attempts: attemptErrors.length > 0 ? attemptErrors.map(serializeError) : undefined,
    validationError: validationError ? serializeError(validationError) : undefined,
  });

  if (validationError instanceof Error) {
    error.cause = validationError;
  }

  return error;
}

function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const serialized: Record<string, unknown> = {
      name: error.name,
      message: error.message,
    };

    const errorWithIssues = error as { issues?: unknown; cause?: unknown };
    if (errorWithIssues.issues !== undefined) {
      serialized.issues = errorWithIssues.issues;
    }
    if (errorWithIssues.cause !== undefined) {
      serialized.cause =
        errorWithIssues.cause instanceof Error
          ? {
              name: errorWithIssues.cause.name,
              message: errorWithIssues.cause.message,
            }
          : errorWithIssues.cause;
    }

    return serialized;
  }

  if (typeof error === "object" && error !== null) {
    return {
      message: "Non-Error thrown",
      value: safeStringify(error),
    };
  }

  return {
    message: typeof error === "string" ? error : String(error),
  };
}

function compactMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : {};
}

function createToolCallError(options: {
  message: string;
  prompt: string;
  raw: string;
  expectedTools: string[];
  calls?: TypedToolCall<ToolSet>[];
}): ErrorWithMetadata {
  const error = new Error(options.message) as ErrorWithMetadata;
  error.metadata = compactMetadata({
    prompt: options.prompt,
    raw: options.raw,
    expectedTools: options.expectedTools,
    toolCalls: options.calls?.map(normalizeToolCall),
  });
  return error;
}

function normalizeToolCall(call: TypedToolCall<ToolSet>): Record<string, unknown> {
  return {
    id: call.toolCallId,
    name: call.toolName,
    dynamic: Boolean(call.dynamic),
    invalid: Boolean(call.invalid),
    providerExecuted: call.providerExecuted ?? undefined,
    input: call.input,
  };
}

function computeEmbeddingAggregate(
  items: EmbeddingSimilarityItem[],
  strategy: "max" | "average" | ((entries: EmbeddingSimilarityItem[]) => number),
): number {
  if (items.length === 0) {
    return 0;
  }

  if (typeof strategy === "function") {
    const value = strategy(items);
    return Number.isFinite(value) ? value : 0;
  }

  if (strategy === "average") {
    const total = items.reduce((sum, item) => sum + item.score, 0);
    return total / items.length;
  }

  let maxScore = Number.NEGATIVE_INFINITY;
  for (const item of items) {
    if (item.score > maxScore) {
      maxScore = item.score;
    }
  }
  return Number.isFinite(maxScore) ? maxScore : 0;
}

type NormalizedScoreResult = {
  score: number | null;
  metadata: Record<string, unknown> | null;
  raw: GenerateScoreResult;
};

async function runGenerateScoreStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
>(
  step: GenerateScoreStep<Payload, Params>,
  context: ScorerPipelineContext<Payload, Params>,
): Promise<GenerateScoreResult> {
  if (isLlmGenerateScoreStep(step)) {
    const llmResult = await executeLlmStep(step, context);
    return llmResult.result;
  }
  return step(context);
}

function normalizeGenerateScore(value: GenerateScoreResult): NormalizedScoreResult {
  if (typeof value === "number") {
    return {
      score: Number.isFinite(value) ? value : null,
      metadata: null,
      raw: value,
    } satisfies NormalizedScoreResult;
  }

  const score =
    typeof value.score === "number" && Number.isFinite(value.score) ? value.score : null;
  const metadata = value.metadata ? cloneMetadata(value.metadata) : null;

  return {
    score,
    metadata,
    raw: value,
  } satisfies NormalizedScoreResult;
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

export interface LlmJudgeScorerParams extends Record<string, unknown> {
  criteria?: string;
}

export interface LlmJudgePromptContext {
  question: string;
  answer: string;
  criteria?: string;
}

export interface CreateLlmJudgeGenerateScore<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
> {
  model: LanguageModel;
  instructions: string;
  maxOutputTokens?: number;
  build?: (
    context: ScorerPipelineContext<Payload, Params>,
  ) => LlmJudgePromptContext | Promise<LlmJudgePromptContext>;
  onResult?: (
    result: ScorerPipelineContext<Payload, Params> & { text: string },
  ) => void | Promise<void>;
}

export interface LlmJudgeScoreResult {
  score: number;
  metadata?: Record<string, unknown> | null;
}

export function createLlmJudgeGenerateScore<
  Payload extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, unknown> = LlmJudgeScorerParams,
>(options: CreateLlmJudgeGenerateScore<Payload, Params>): GenerateScoreStep<Payload, Params>;
export function createLlmJudgeGenerateScore<
  Payload extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, unknown> = LlmJudgeScorerParams,
>(
  options: CreateLlmJudgeGenerateScore<Payload, Params> & {
    context: ScorerPipelineContext<Payload, Params>;
  },
): Promise<LlmJudgeScoreResult>;
export function createLlmJudgeGenerateScore<
  Payload extends Record<string, unknown> = Record<string, unknown>,
  Params extends Record<string, unknown> = LlmJudgeScorerParams,
>(
  options: CreateLlmJudgeGenerateScore<Payload, Params> & {
    context?: ScorerPipelineContext<Payload, Params>;
  },
): GenerateScoreStep<Payload, Params> | Promise<LlmJudgeScoreResult> {
  const { model, instructions, maxOutputTokens = 200, build, onResult } = options;

  const stepOptions: CreateLlmStepOptions<
    ScorerPipelineContext<Payload, Params>,
    GenerateScoreResult
  > = {
    model,
    maxOutputTokens,
    buildPrompt: async (context) => {
      const promptContext = build ? await build(context) : defaultPromptContext(context);
      context.results.judgePromptContext = promptContext;
      return buildPrompt({
        instructions,
        criteria: promptContext.criteria ?? "",
        question: promptContext.question,
        answer: promptContext.answer,
      });
    },
    parse: ({ text }) => {
      const parsed = parseJudgeResponse(text);
      if (!parsed) {
        const error = new Error("Judge response was not valid JSON") as ErrorWithMetadata;
        error.metadata = { raw: text.trim() };
        throw error;
      }

      return {
        score: parsed.score,
        metadata: {
          reason: parsed.reason,
          raw: text.trim(),
        },
      } satisfies GenerateScoreResult;
    },
    onResult: onResult
      ? async ({ context, text }) => {
          await onResult({ ...context, text });
        }
      : undefined,
  };

  if (options.context) {
    return evaluateWithLlm({ ...stepOptions, context: options.context }).then(({ result }) => {
      if (typeof result === "number") {
        return { score: result } satisfies LlmJudgeScoreResult;
      }
      return {
        score: result.score,
        metadata: result.metadata,
      } satisfies LlmJudgeScoreResult;
    });
  }

  return createLlmStep(stepOptions) as GenerateScoreStep<Payload, Params>;
}

type ErrorWithMetadata = Error & { metadata?: Record<string, unknown> };

function defaultPromptContext(
  context: ScorerPipelineContext<Record<string, unknown>, Record<string, unknown>>,
): LlmJudgePromptContext {
  const question = stringify(context.payload.input);
  const answer = stringify(context.payload.output);
  const criteriaValue = (context.params as LlmJudgeScorerParams | undefined)?.criteria;

  return {
    question,
    answer,
    criteria: criteriaValue ? String(criteriaValue) : undefined,
  };
}

function buildPrompt(args: {
  instructions: string;
  criteria: string;
  question: string;
  answer: string;
}): string {
  const { instructions, criteria, question, answer } = args;
  const criteriaBlock = criteria ? `\nAdditional criteria:\n${criteria}` : "";

  return `You are a strict evaluator. Output JSON like {"score":0.82,"reason":"..."}.
     The score must be between 0 and 1.
     Your goal: ${instructions}${criteriaBlock}
     Question:\n${question}
     Assistant Response:\n${answer}`;
}

function parseJudgeResponse(text: string): { score: number; reason: string } | null {
  const trimmed = text.trim();
  const candidates = collectJsonCandidates(trimmed);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;

      if (typeof parsed === "number") {
        const score = clamp(parsed);
        if (Number.isNaN(score)) {
          continue;
        }
        return {
          score,
          reason: "",
        };
      }

      if (parsed && typeof parsed === "object") {
        const record = parsed as { score?: number; reason?: string };
        const score = clamp(record.score ?? Number.NaN);
        if (Number.isNaN(score)) {
          continue;
        }
        return {
          score,
          reason: record.reason ?? "",
        };
      }
    } catch {
      // ignore and try next candidate
    }
  }

  const numeric = clamp(Number.parseFloat(trimmed));
  if (Number.isNaN(numeric)) {
    return null;
  }
  return {
    score: numeric,
    reason: "Judge returned a bare score",
  };
}

function clamp(value: number): number {
  if (Number.isNaN(value)) {
    return Number.NaN;
  }
  if (value < 0) {
    return 0;
  }
  if (value > 1) {
    return 1;
  }
  return value;
}

function stringify(value: unknown): string {
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
import { cosineSimilarity, similarityToScore } from "../memory/utils/vector-math";
