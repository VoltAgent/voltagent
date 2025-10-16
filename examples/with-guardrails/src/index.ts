import { openai } from "@ai-sdk/openai";
import {
  Agent,
  type InputGuardrail,
  VoltAgent,
  createMaxLengthGuardrail,
  createSensitiveNumberGuardrail,
} from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

const logger = createPinoLogger({
  name: "with-guardrails",
  level: "info",
});

const bannedWords = ["badword", "curse", "heck"];

const profanityGuardrail: InputGuardrail = {
  id: "profanity-filter",
  name: "Profanity Filter",
  description: "Blocks user prompts that contain banned language.",
  severity: "warning",
  handler: async ({ inputText }) => {
    const text = (inputText || "").toLowerCase();
    if (!text) {
      return { pass: true };
    }

    const match = bannedWords.find((word) => text.includes(word));
    if (match) {
      return {
        pass: false,
        action: "block",
        message: "Let's keep things friendly! Please rephrase your request.",
        metadata: { bannedWord: match },
      };
    }

    return { pass: true };
  },
};

const agent = new Agent({
  name: "Guarded Support Agent",
  instructions:
    "You are a friendly support agent. Reject offensive prompts and never return raw account or card numbers.",
  model: openai("gpt-4o-mini"),
  inputGuardrails: [profanityGuardrail],
  outputGuardrails: [
    createSensitiveNumberGuardrail(),
    createMaxLengthGuardrail({
      maxCharacters: 1,
    }),
  ],
  hooks: {
    onStart: ({ context }) => {
      context.logger.info("⚙️  Running guarded agent task");
    },
    onEnd: ({ context }) => {
      context.logger.info("✅ Guarded agent task completed");
    },
    onError: ({ error, context }) => {
      context.logger.error("❌ Guarded agent task failed", { error });
    },
  },
});

new VoltAgent({
  agents: { agent },
  server: honoServer(),
  logger,
});
