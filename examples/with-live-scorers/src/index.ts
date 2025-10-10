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
      keyword: {
        scorer: keywordMatchScorer,
        params: {
          keyword: "voltagent",
        },
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
  if (storage) {
    const traceIds = await storage.listTraces(20, 0);
    const scorerSpans: import("@voltagent/core").ObservabilitySpan[] = [];

    for (const traceId of traceIds) {
      const spans = await storage.getTrace(traceId);
      for (const span of spans) {
        const attrs = span.attributes ?? {};
        if (attrs["entity.id"] === supportAgent.id && attrs["eval.scorer.id"]) {
          scorerSpans.push(span);
        }
      }
    }

    scorerSpans.sort((a, b) => {
      const aTime = new Date(a.endTime ?? a.startTime).getTime();
      const bTime = new Date(b.endTime ?? b.startTime).getTime();
      return bTime - aTime;
    });

    const latest = scorerSpans.slice(0, 10);

    if (latest.length === 0) {
      console.log("No live eval scores recorded yet. Try running the script again.");
    } else {
      console.log("Live eval scores:");
      for (const span of latest) {
        const attrs = span.attributes ?? {};
        const name =
          (attrs["eval.scorer.name"] as string) ?? (attrs["eval.scorer.id"] as string) ?? "unknown";
        const status = (attrs["eval.scorer.status"] as string) ?? "unknown";
        const rawScore = attrs["eval.scorer.score"];
        const value =
          typeof rawScore === "number"
            ? rawScore.toFixed(3)
            : typeof rawScore === "string" && rawScore.length > 0
              ? Number.parseFloat(rawScore).toFixed(3)
              : "n/a";
        console.log(`- ${name}: ${value} (${status})`);

        const strategy = attrs["eval.scorer.sampling.strategy"] as string | undefined;
        const rateAttr = attrs["eval.scorer.sampling.rate"];
        const rate =
          typeof rateAttr === "number"
            ? rateAttr
            : typeof rateAttr === "string"
              ? Number.parseFloat(rateAttr)
              : undefined;
        if (strategy) {
          console.log(`  sampling: ${strategy}${rate !== undefined ? ` (${rate})` : ""}`);
        }

        const trigger = (attrs["eval.trigger_source"] as string) ?? "unknown";
        const environment = (attrs["eval.environment"] as string) ?? "n/a";
        console.log(`  trigger: ${trigger} | env: ${environment}`);

        const metadataRaw = attrs["eval.scorer.metadata"];
        if (metadataRaw) {
          try {
            const metadata =
              typeof metadataRaw === "string" ? JSON.parse(metadataRaw) : metadataRaw;
            console.log("  metadata:", JSON.stringify(metadata, null, 2));
          } catch {
            console.log("  metadata:", metadataRaw);
          }
        }
      }
    }
  } else {
    console.warn("Observability storage does not expose eval score queries in this runtime.");
  }
})();
