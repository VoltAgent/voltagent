import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

const logger = createPinoLogger({
  name: "with-feedback",
  level: "info",
});

const thumbsAgent = new Agent({
  name: "Thumbs Feedback Agent",
  instructions: "You are a helpful assistant. Keep replies short and clear.",
  model: openai("gpt-4o-mini"),
  feedback: {
    key: "satisfaction",
    feedbackConfig: {
      type: "categorical",
      categories: [
        { value: 1, label: "Helpful" },
        { value: 0, label: "Not helpful" },
      ],
    },
  },
});

const ratingAgent = new Agent({
  name: "Rating Feedback Agent",
  instructions: "Respond in concise bullet points.",
  model: openai("gpt-4o-mini"),
  feedback: {
    key: "relevance_score",
    feedbackConfig: {
      type: "continuous",
      min: 1,
      max: 5,
    },
  },
});

const issuesAgent = new Agent({
  name: "Issue Tagging Agent",
  instructions: "Answer clearly and include a short summary.",
  model: openai("gpt-4o-mini"),
  feedback: {
    key: "issue_type",
    feedbackConfig: {
      type: "categorical",
      categories: [
        { value: 1, label: "Incorrect" },
        { value: 2, label: "Incomplete" },
        { value: 3, label: "Unsafe" },
        { value: 4, label: "Other" },
      ],
    },
  },
});

new VoltAgent({
  agents: {
    thumbs: thumbsAgent,
    rating: ratingAgent,
    issues: issuesAgent,
  },
  server: honoServer(),
  logger,
});
