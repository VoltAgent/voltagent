import VoltAgent, { Agent, VoltAgentObservability, buildScorer } from "@voltagent/core";
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
import honoServer from "@voltagent/server-hono";
import { z } from "zod";

const observability = new VoltAgentObservability();

const judgeModel = "openai/gpt-4o-mini";
const moderationModel = "openai/gpt-4o-mini";
const helpfulnessJudgeAgent = new Agent({
  name: "helpfulness-judge",
  model: judgeModel,
  instructions: "You evaluate helpfulness of responses",
});

const keywordMatchScorer = buildScorer({
  id: "keyword-match",
  label: "Keyword Match",
})
  .score(({ payload, params }) => {
    const output = payload.output as string;
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

const customScorer = buildScorer({
  id: "response-length",
})
  .score(() => {
    return { score: 1 };
  })
  .build();

const HELPFULNESS_SCHEMA = z.object({
  score: z.number().min(0).max(1).describe("Score from 0 to 1 for helpfulness"),
  reason: z.string().describe("Explanation of the score"),
});

const referenceAnswer =
  "You can enable live evaluation in VoltAgent by configuring the Agent.eval field with a list of scorers.";
const referenceSummarySource =
  "VoltAgent ships with a flexible evaluation pipeline. Developers can attach scorers to agents, stream results to VoltOps, and monitor quality in real time.";
const referenceSummary =
  "VoltAgent lets you attach evaluation scorers to agents so you can monitor quality in real time.";
const referenceTranslationSource =
  "Activa las evaluaciones en vivo en VoltAgent configurando la sección eval con los scorers que necesitas.";
const referenceTranslationExpected =
  "Enable live evaluations in VoltAgent by configuring the eval section with the scorers you need.";
const referenceContextSnippets = [
  "Live scorers run asynchronously after each agent operation so latency stays low.",
  "VoltAgent forwards scorer output to VoltOps for dashboards, alerts, and annotations.",
  "You can mix heuristic scorers with LLM-based judges inside the same pipeline.",
];
const referenceEntities = ["VoltAgent", "live evaluation", "VoltOps"];
const referenceJson = { feature: "evals", state: "enabled" };
const numericBaseline = { expected: 3.14, output: 3.14 };

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

const helpfulnessJudgeScorer = buildScorer({
  id: "helpfulness-judge",
  label: "Helpfulness Judge",
})
  .score(async (context) => {
    const prompt = `Rate the assistant response for factual accuracy, helpfulness, and clarity.

User Input: ${context.payload.input}
Assistant Response: ${context.payload.output}

Provide a score from 0 to 1 and explain your reasoning.`;

    const response = await helpfulnessJudgeAgent.generateObject(prompt, HELPFULNESS_SCHEMA);

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

const supportAgent = new Agent({
  name: "live-scorer-demo",
  instructions:
    "You are a helpful assistant that answers questions about VoltAgent concisely and accurately.",
  model: "openai/gpt-4o-mini",
  eval: {
    sampling: { type: "ratio", rate: 1 },
    scorers: {
      keyword: {
        scorer: keywordMatchScorer,
        params: {
          keyword: "voltagent",
        },
      },
      exactMatch: {
        scorer: scorers.exactMatch,
        params: {
          expected: referenceAnswer,
        },
      },
      factuality: {
        scorer: factualityScorer,
        buildPayload: (context) => ({
          input: context.input,
          output: context.output,
          expected: referenceAnswer,
        }),
      },
      answerCorrectness: {
        scorer: answerCorrectnessScorer,
        buildPayload: () => ({
          expected: referenceAnswer,
        }),
      },
      answerRelevancy: {
        scorer: answerRelevancyScorer,
        buildPayload: () => ({
          context: referenceAnswer,
        }),
      },
      summary: {
        scorer: summaryScorer,
        buildPayload: () => ({
          input: referenceSummarySource,
          expected: referenceSummary,
        }),
      },
      translation: {
        scorer: translationScorer,
        buildPayload: () => ({
          input: referenceTranslationSource,
          expected: referenceTranslationExpected,
        }),
        buildParams: () => ({
          language: "Spanish",
        }),
      },
      humor: {
        scorer: humorScorer,
      },
      possible: {
        scorer: possibleScorer,
      },
      contextPrecision: {
        scorer: contextPrecisionScorer,
        buildPayload: () => ({
          context: referenceContextSnippets,
          expected: referenceAnswer,
        }),
      },
      contextRecall: {
        scorer: contextRecallScorer,
        buildPayload: () => ({
          expected: referenceAnswer,
          context: referenceContextSnippets,
        }),
      },
      contextRelevancy: {
        scorer: contextRelevancyScorer,
        buildPayload: () => ({
          context: referenceContextSnippets,
        }),
      },
      moderation: {
        scorer: createModerationScorer({
          model: moderationModel,
          threshold: 0.5,
        }),
      },
      helpfulness: {
        scorer: helpfulnessJudgeScorer,
        params: {
          criteria:
            "Reward answers that are specific to VoltAgent features and actionable guidance.",
        },
        onResult: async ({ result, feedback }) => {
          await feedback.save({
            key: "helpfulness",
            score: result.score ?? null,
            comment: typeof result.metadata?.reason === "string" ? result.metadata.reason : null,
            feedbackSourceType: "model",
            feedbackSource: {
              type: "model",
              metadata: {
                scorerId: result.scorerId,
              },
            },
          });
        },
      },
      levenshtein: {
        scorer: scorers.levenshtein,
        params: {
          expected: referenceAnswer,
        },
      },
      numericDiff: {
        scorer: scorers.numericDiff,
        params: {
          expected: numericBaseline.expected,
          output: numericBaseline.output,
        },
      },
      jsonDiff: {
        scorer: scorers.jsonDiff,
        params: {
          expected: referenceJson,
          output: referenceJson,
        },
      },
      listContains: {
        scorer: scorers.listContains,
        params: {
          expected: referenceEntities,
          output: [...referenceEntities, "extra-note"],
        },
      },
    },
  },
});

const singleEvalAgent = new Agent({
  name: "single-eval-demo",
  instructions: "You are a helpful assistant that answers questions about VoltAgent.",
  model: "openai/gpt-4o-mini",
  eval: {
    sampling: { type: "ratio", rate: 1 },
    scorers: {
      responseLength: {
        scorer: customScorer,
      },
    },
  },
});

const scorerFeedbackAgent = new Agent({
  name: "scorer-feedback-demo",
  instructions: "You are a helpful assistant that answers questions about VoltAgent.",
  model: "openai/gpt-4o-mini",
  eval: {
    sampling: { type: "ratio", rate: 1 },
    scorers: {
      "scorer-feedback": {
        scorer: helpfulnessJudgeScorer,
        onResult: async ({ result, feedback }) => {
          await feedback.save({
            key: "helpfulness",
            score: result.score ?? null,
            comment: typeof result.metadata?.reason === "string" ? result.metadata.reason : null,
            feedbackSourceType: "model",
            feedbackSource: {
              type: "model",
              metadata: {
                scorerId: result.scorerId,
              },
            },
          });
        },
      },
    },
  },
});

new VoltAgent({
  agents: {
    support: supportAgent,
    singleEval: singleEvalAgent,
    scorerFeedback: scorerFeedbackAgent,
  },
  server: honoServer(),
  observability,
});

(async () => {
  const question = "How can I enable live eval scorers in VoltAgent?";
  const result = await singleEvalAgent.generateText(question);

  console.log("Question:\n", question, "\n");
  console.log("Agent response:\n", result.text, "\n");
})();
