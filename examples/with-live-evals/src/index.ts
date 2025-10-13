import { openai } from "@ai-sdk/openai";
import VoltAgent, { Agent, VoltAgentObservability, buildScorer } from "@voltagent/core";
import { createModerationScorer, scorers } from "@voltagent/scorers";
import honoServer from "@voltagent/server-hono";
import { z } from "zod";

const observability = new VoltAgentObservability();

const judgeModel = openai("gpt-4o-mini");
const moderationModel = openai("gpt-4o-mini");

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

const HELPFULNESS_SCHEMA = z.object({
  score: z.number().min(0).max(1).describe("Score from 0 to 1 for helpfulness"),
  reason: z.string().describe("Explanation of the score"),
});

const helpfulnessJudgeScorer = buildScorer({
  id: "helpfulness-judge",
  label: "Helpfulness Judge",
})
  .score(async (context) => {
    const prompt = `Rate the assistant response for factual accuracy, helpfulness, and clarity.

User Input: ${context.payload.input}
Assistant Response: ${context.payload.output}

Provide a score from 0 to 1 and explain your reasoning.`;

    const agent = new Agent({
      name: "helpfulness-judge",
      model: judgeModel,
      instructions: "You evaluate helpfulness of responses",
    });

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
      levenshtein: {
        scorer: scorers.levenshtein,
        params: {
          expected: "voltagent",
        },
      },
      helpfulness2: {
        scorer: helpfulnessJudgeScorer,
        params: {
          criteria:
            "Reward answers that are specific to VoltAgent features and actionable guidance.",
        },
      },
      exactMatch: {
        scorer: scorers.exactMatch,
        params: {
          expected: "voltagent",
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
})();
