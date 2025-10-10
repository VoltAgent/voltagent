import { openai } from "@ai-sdk/openai";
import VoltAgent, {
  Agent,
  VoltAgentObservability,
  buildScorer,
  createLlmJudgeGenerateScore,
  type AgentEvalContext,
  type LlmJudgeScorerParams,
} from "@voltagent/core";
import {
  createAnswerCorrectnessScorer,
  createAnswerRelevancyScorer,
  createModerationScorer,
} from "@voltagent/scorers";
import honoServer from "@voltagent/server-hono";

const observability = new VoltAgentObservability();

const judgeModel = openai("gpt-4o-mini");
const moderationModel = openai("gpt-4o-mini");
const embeddingModel = openai.embedding("text-embedding-3-small");

const keywordMatchScorer = buildScorer({
  id: "keyword-match",
  type: "agent",
  label: "Keyword Match",
})
  .score(({ payload, params }) => {
    const output = normalizeEvalText(payload.output);
    const keyword = readStringParam(params, "keyword");
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
    const keyword = readStringParam(params, "keyword");
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

const helpfulnessJudgeScorer = buildScorer({
  id: "helpfulness-judge",
  type: "agent",
  label: "Helpfulness Judge",
  preferJudge: {
    model: judgeModel,
    instructions: "Rate the assistant response for factual accuracy, helpfulness, and clarity.",
  },
})
  .score(async (context) => {
    const rawResults = ensureRecord(context.results.raw);
    const judge = await createLlmJudgeGenerateScore<AgentEvalContext, LlmJudgeScorerParams>({
      model: judgeModel,
      instructions: "Rate the assistant response for factual accuracy, helpfulness, and clarity.",
      context: {
        payload: context.payload,
        params: context.params as LlmJudgeScorerParams,
        results: rawResults,
      },
    });

    rawResults.helpfulnessJudge = judge;
    context.results.raw = rawResults;

    return judge;
  })
  .reason(({ results }) => {
    const raw = ensureRecord(results.raw);
    const judge = raw.helpfulnessJudge as { metadata?: Record<string, unknown> } | undefined;
    const reason =
      judge?.metadata && typeof judge.metadata.reason === "string"
        ? judge.metadata.reason
        : "The judge did not provide an explanation.";

    return {
      reason,
    };
  })
  .build();

const answerCorrectnessScorer = createAnswerCorrectnessScorer<AgentEvalContext>({
  model: judgeModel,
  embeddingModel,
  buildPayload: ({ payload, params }) => ({
    input: normalizeEvalText(payload.input),
    output: normalizeEvalText(payload.output),
    expected: readStringParam(params, "expectedAnswer"),
  }),
});

const answerRelevancyScorer = createAnswerRelevancyScorer<AgentEvalContext>({
  model: judgeModel,
  embeddingModel,
  strictness: 3,
  buildPayload: ({ payload, params }) => ({
    input: normalizeEvalText(payload.input),
    output: normalizeEvalText(payload.output),
    context: readStringParam(params, "referenceContext"),
  }),
});

function normalizeEvalText(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value === null || value === undefined) {
    return "";
  }
  try {
    return typeof value === "object" ? JSON.stringify(value) : String(value);
  } catch {
    return String(value);
  }
}

function readStringParam(params: Record<string, unknown>, key: string): string {
  const value = params?.[key];
  return typeof value === "string" ? value : "";
}

function ensureRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

const supportAgent = new Agent({
  name: "live-scorer-demo",
  instructions:
    "You are a helpful assistant that answers questions about VoltAgent concisely and accurately.",
  model: openai("gpt-4o-mini"),
  eval: {
    sampling: { type: "ratio", rate: 1 },
    scorers: {
      moderation: {
        scorer: createModerationScorer({
          model: moderationModel,
          threshold: 0.5,
        }),
      },
      keyword: {
        scorer: keywordMatchScorer,
        params: {
          keyword: "voltagent",
        },
      },
      helpfulness: {
        scorer: helpfulnessJudgeScorer,
        params: {
          criteria:
            "Reward answers that are specific to VoltAgent features and actionable guidance.",
        },
      },
      answerCorrectness: {
        scorer: answerCorrectnessScorer,
        params: {
          expectedAnswer:
            "Configure the agent's eval.scorers map with LocalScorer definitions and params to enable live evaluations in VoltAgent.",
          factualityWeight: 0.75,
          answerSimilarityWeight: 0.25,
          embeddingExpectedMin: 0.7,
        },
      },
      answerRelevancy: {
        scorer: answerRelevancyScorer,
        params: {
          strictness: 3,
          referenceContext:
            "VoltAgent lets you attach live eval scorers by providing an eval configuration with a scorers map. Each scorer can be a LocalScorer definition created with createScorer or helper factories such as createAnswerCorrectnessScorer.",
        },
      },
    },
  },
});

new VoltAgent({
  agents: { support: supportAgent },
  server: honoServer(),
  observability,
});

(async () => {
  const question = "How can I enable live eval scorers in VoltAgent?";
  const result = await supportAgent.generateText(question);

  console.log("Question:\n", question, "\n");
  console.log("Agent response:\n", result.text, "\n");

  // Live scorers run asynchronously, give them a short moment to finish.
  await new Promise((resolve) => setTimeout(resolve, 750));

  const storage = observability.getStorage();
  if (storage && typeof storage.listEvalScores === "function") {
    const scores = await storage.listEvalScores({ agentId: supportAgent.id, limit: 10 });

    if (scores.length === 0) {
      console.log("No live eval scores recorded yet. Try running the script again.");
    } else {
      console.log("Live eval scores:");
      for (const score of scores) {
        const value =
          score.score === null || score.score === undefined ? "n/a" : score.score.toFixed(3);
        const name = score.scorerName ?? score.scorerId;
        console.log(`- ${name}: ${value} (${score.status})`);
        if (score.sampling?.strategy) {
          console.log(
            `  sampling: ${score.sampling.strategy}${
              score.sampling.rate !== undefined ? ` (${score.sampling.rate})` : ""
            }`,
          );
        }
        if (score.triggerSource || score.environment) {
          console.log(
            `  trigger: ${score.triggerSource ?? "unknown"} | env: ${score.environment ?? "n/a"}`,
          );
        }
        if (score.metadata?.scorer) {
          console.log("  metadata:", score.metadata.scorer);
        }
      }
    }
  } else {
    console.warn("Observability storage does not expose eval score queries in this runtime.");
  }
})();
