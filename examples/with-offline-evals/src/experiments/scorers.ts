import { Agent, type AgentModelReference, buildScorer } from "@voltagent/core";
import type { ExperimentRuntimePayload, ExperimentScorerConfig } from "@voltagent/evals";
import {
  createAnswerCorrectnessScorer,
  createAnswerRelevancyScorer,
  createContextPrecisionScorer,
  createContextRecallScorer,
  createContextRelevancyScorer,
  createFactualityScorer,
  createHumorScorer,
  createModerationScorer,
  createPossibleScorer,
  createSummaryScorer,
  createTranslationScorer,
  scorers,
} from "@voltagent/scorers";
import { z } from "zod";

import type { SupportDatasetItem } from "./dataset.js";

type SupportRuntime = ExperimentRuntimePayload<SupportDatasetItem>;

interface SupportModels {
  judgeModel: AgentModelReference;
  moderationModel: AgentModelReference;
}

const HELPFULNESS_SCHEMA = z.object({
  score: z.number().min(0).max(1).describe("Score from 0 to 1 for helpfulness"),
  reason: z.string().describe("Explanation of the score"),
});

function createKeywordMatchScorer() {
  return buildScorer({
    id: "keyword-match",
    label: "Keyword Match",
  })
    .score(({ payload, params }) => {
      const output = String(payload.output ?? "");
      const keyword = params.keyword as string;
      if (!keyword) {
        const error = new Error("keyword parameter is required");
        (error as Error & { metadata?: Record<string, unknown> }).metadata = { keyword };
        throw error;
      }

      const matched = output.toLowerCase().includes(keyword.toLowerCase());

      return {
        score: matched ? 1 : 0,
        metadata: {
          keyword,
          matched,
        },
      };
    })
    .reason(({ score, params }) => {
      const keyword = params.keyword as string;
      if (!keyword) {
        return {
          reason: "Keyword parameter was not provided.",
        };
      }

      const matched = typeof score === "number" && score >= 1;
      return {
        reason: matched
          ? `Output contains the keyword "${keyword}".`
          : `Output does not contain the keyword "${keyword}".`,
      };
    })
    .build();
}

function createHelpfulnessJudgeScorer(judgeModel: AgentModelReference) {
  const agent = new Agent({
    name: "helpfulness-judge",
    model: judgeModel,
    instructions: "You evaluate helpfulness of responses",
  });

  return buildScorer({
    id: "helpfulness-judge",
    label: "Helpfulness Judge",
  })
    .score(async (context) => {
      const prompt = `Rate the assistant response for factual accuracy, helpfulness, and clarity.

User Input: ${context.payload.input}
Assistant Response: ${context.payload.output}

Provide a score from 0 to 1 and explain your reasoning.`;

      const response = await agent.generateObject(prompt, HELPFULNESS_SCHEMA);

      const rawResults = context.results.raw;
      rawResults.helpfulnessJudge = response.object;
      context.results.raw = rawResults;

      return {
        score: response.object.score,
        metadata: {
          reason: response.object.reason,
        },
      };
    })
    .reason(({ results }) => {
      const raw = results.raw;
      const judge = raw.helpfulnessJudge as { reason?: string } | undefined;
      const reason = judge?.reason ?? "The judge did not provide an explanation.";

      return {
        reason,
      };
    })
    .build();
}

export function createSupportExperimentScorers({
  judgeModel,
  moderationModel,
}: SupportModels): ExperimentScorerConfig<SupportDatasetItem>[] {
  const keywordMatchScorer = createKeywordMatchScorer();
  const helpfulnessJudgeScorer = createHelpfulnessJudgeScorer(judgeModel);

  const answerCorrectnessScorer = createAnswerCorrectnessScorer({ model: judgeModel });
  const answerRelevancyScorer = createAnswerRelevancyScorer({ model: judgeModel });
  const contextPrecisionScorer = createContextPrecisionScorer({ model: judgeModel });
  const contextRecallScorer = createContextRecallScorer({ model: judgeModel });
  const contextRelevancyScorer = createContextRelevancyScorer({ model: judgeModel });
  const factualityScorer = createFactualityScorer({ model: judgeModel });
  const summaryScorer = createSummaryScorer({ model: judgeModel });
  const translationScorer = createTranslationScorer({ model: judgeModel });
  const humorScorer = createHumorScorer({ model: judgeModel });
  const possibleScorer = createPossibleScorer({ model: judgeModel });

  const runtimeScorers: ExperimentScorerConfig<SupportDatasetItem>[] = [
    {
      scorer: keywordMatchScorer,
      buildParams: (runtime: SupportRuntime) => ({
        keyword: runtime.item.extra?.keyword ?? "",
      }),
    },
    {
      scorer: scorers.exactMatch,
      buildParams: (runtime: SupportRuntime) => ({
        expected: runtime.expected,
      }),
    },
    {
      scorer: factualityScorer,
      buildPayload: (runtime: SupportRuntime) => ({
        input: runtime.input,
        output: runtime.output,
        expected: runtime.expected,
      }),
    },
    {
      scorer: answerCorrectnessScorer,
      buildPayload: (runtime: SupportRuntime) => ({
        input: runtime.input,
        output: runtime.output,
        expected: runtime.expected,
      }),
    },
    {
      scorer: answerRelevancyScorer,
      buildPayload: (runtime: SupportRuntime) => ({
        input: runtime.input,
        output: runtime.output,
        context: runtime.expected,
      }),
    },
    {
      scorer: summaryScorer,
      buildPayload: (runtime: SupportRuntime) => ({
        input: runtime.item.extra?.summarySource ?? "",
        expected: runtime.item.extra?.summaryExpected ?? "",
      }),
    },
    {
      scorer: translationScorer,
      buildPayload: (runtime: SupportRuntime) => ({
        input: runtime.item.extra?.translationSource ?? "",
        expected: runtime.item.extra?.translationExpected ?? "",
        output: runtime.output,
      }),
      buildParams: (runtime: SupportRuntime) => ({
        language: runtime.item.extra?.translationLanguage,
      }),
    },
    humorScorer,
    possibleScorer,
    {
      scorer: contextPrecisionScorer,
      buildPayload: (runtime: SupportRuntime) => ({
        context: runtime.item.extra?.contextSnippets ?? [],
        expected: runtime.expected,
      }),
    },
    {
      scorer: contextRecallScorer,
      buildPayload: (runtime: SupportRuntime) => ({
        context: runtime.item.extra?.contextSnippets ?? [],
        expected: runtime.expected,
      }),
    },
    {
      scorer: contextRelevancyScorer,
      buildPayload: (runtime: SupportRuntime) => ({
        context: runtime.item.extra?.contextSnippets ?? [],
        input: runtime.input,
        output: runtime.output,
      }),
    },
    {
      scorer: createModerationScorer({ model: moderationModel, threshold: 0.5 }),
      threshold: 0.5,
    },
    {
      scorer: helpfulnessJudgeScorer,
      buildParams: () => ({
        criteria: "Reward answers that are specific to VoltAgent features and actionable guidance.",
      }),
    },
    {
      scorer: scorers.levenshtein,
      buildParams: (runtime: SupportRuntime) => ({
        expected: runtime.expected,
      }),
    },
    {
      scorer: scorers.numericDiff,
      buildParams: (runtime: SupportRuntime) => ({
        expected: runtime.item.extra?.numericBaseline.expected,
        output: runtime.item.extra?.numericBaseline.output,
      }),
    },
    {
      scorer: scorers.jsonDiff,
      buildParams: (runtime: SupportRuntime) => ({
        expected: runtime.item.extra?.jsonBaselineExpected,
        output: runtime.item.extra?.jsonBaselineOutput,
      }),
    },
    {
      scorer: scorers.listContains,
      buildParams: (runtime: SupportRuntime) => ({
        expected: runtime.item.extra?.entitiesExpected ?? [],
        output: runtime.item.extra?.entitiesOutput ?? [],
      }),
    },
  ];

  return runtimeScorers;
}
