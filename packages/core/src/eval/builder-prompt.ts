import type { LanguageModel } from "ai";

import type {
  BuilderAnalyzeContext,
  BuilderPrepareContext,
  BuilderReasonContext,
  BuilderScoreContext,
} from "./builder";
import type { LlmPromptSchema } from "./create-scorer";
import { evaluateWithLlm, parseStructuredResponse } from "./create-scorer";

export interface BuilderPromptTransformArgs<Context, SchemaResult> {
  context: Context;
  prompt: string;
  raw: string;
  value: SchemaResult;
}

export interface BuilderPromptResultArgs<Context, SchemaResult, Result>
  extends BuilderPromptTransformArgs<Context, SchemaResult> {
  result: Result;
}

export interface CreateBuilderPromptStepOptions<Context, SchemaResult, Result = SchemaResult> {
  model: LanguageModel;
  schema: LlmPromptSchema<SchemaResult>;
  buildPrompt: (context: Context) => string | Promise<string>;
  transform?: (args: BuilderPromptTransformArgs<Context, SchemaResult>) => Result | Promise<Result>;
  onResult?: (args: BuilderPromptResultArgs<Context, SchemaResult, Result>) => void | Promise<void>;
  maxOutputTokens?: number;
}

export function createBuilderPromptStep<Context, SchemaResult, Result = SchemaResult>(
  options: CreateBuilderPromptStepOptions<Context, SchemaResult, Result>,
): (context: Context) => Promise<Result> {
  const { model, schema, buildPrompt, transform, onResult, maxOutputTokens } = options;

  return async (context: Context) => {
    const prompt = await buildPrompt(context);
    let normalized = "";

    const { result, raw } = await evaluateWithLlm({
      model,
      maxOutputTokens,
      context,
      buildPrompt: () => prompt,
      parse: async ({ text }) => {
        const rawText = typeof text === "string" ? text : String(text);
        normalized = rawText.trim();
        return parseStructuredResponse(normalized, schema);
      },
    });

    const transformArgs: BuilderPromptTransformArgs<Context, SchemaResult> = {
      context,
      prompt,
      raw: typeof raw === "string" ? raw : normalized,
      value: result,
    };

    const finalResult = (await (transform?.(transformArgs) ??
      (result as unknown as Result))) as Result;

    if (onResult) {
      await onResult({ ...transformArgs, result: finalResult });
    }

    return finalResult;
  };
}

export type BuilderPromptPrepareStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
  SchemaResult,
  Result = SchemaResult,
> = CreateBuilderPromptStepOptions<BuilderPrepareContext<Payload, Params>, SchemaResult, Result>;

export type BuilderPromptAnalyzeStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
  SchemaResult,
  Result = SchemaResult,
> = CreateBuilderPromptStepOptions<BuilderAnalyzeContext<Payload, Params>, SchemaResult, Result>;

export type BuilderPromptScoreStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
  SchemaResult,
  Result = SchemaResult,
> = CreateBuilderPromptStepOptions<BuilderScoreContext<Payload, Params>, SchemaResult, Result>;

export type BuilderPromptReasonStep<
  Payload extends Record<string, unknown>,
  Params extends Record<string, unknown>,
  SchemaResult,
  Result = SchemaResult,
> = CreateBuilderPromptStepOptions<BuilderReasonContext<Payload, Params>, SchemaResult, Result>;
