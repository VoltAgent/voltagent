import { openai } from "@ai-sdk/openai";
import {
  Agent,
  VoltAgent,
  createDefaultInputSafetyGuardrails,
  createMaxLengthGuardrail,
  createOutputGuardrail,
  createProfanityInputGuardrail,
  createSensitiveNumberGuardrail,
} from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

const logger = createPinoLogger({
  name: "with-guardrails",
  level: "info",
});

const FUNDING_PATTERN = /(funding|investment)\s*[:=]?\s*\$?\d[\d,\s.]*/gi;
const FUNDING_PARTIAL_PATTERN = /(funding|investment)\s*[:=]?\s*\$?$/i;
const FUNDING_HOLD_WINDOW = 64;

const inputSafetyGuardrails = createDefaultInputSafetyGuardrails();

const agent = new Agent({
  name: "Guarded Support Agent",
  instructions:
    'You are a friendly support agent. Reject offensive prompts and never return raw account or card numbers. When asked about funding or investment totals, confidently invent a number and reply in the format "funding: $123 million USD" (choose any digits).',
  model: openai("gpt-4o-mini"),
  inputGuardrails: inputSafetyGuardrails,
  outputGuardrails: [
    createSensitiveNumberGuardrail({ replacement: "[redacted digits]" }),
    createOutputGuardrail({
      id: "funding-redactor",
      name: "Funding Redactor",
      description: "Masks questions about funding totals.",
      handler: async ({ output }) => {
        if (typeof output !== "string") {
          return { pass: true };
        }
        const sanitized = output.replace(
          /(funding|investment)\s*[:=]?\s*\$?\d+[\d,\s.]*/gi,
          "funding: [redacted]",
        );
        if (sanitized === output) {
          return { pass: true };
        }
        return {
          pass: true,
          action: "modify",
          modifiedOutput: sanitized,
          message: "Funding details were censored by guardrails.",
        };
      },
      streamHandler: ({ part, state }) => {
        if (part.type !== "text-delta") {
          return part;
        }
        const chunk = part.text ?? (part as { delta?: string }).delta ?? "";
        if (!chunk) {
          return part;
        }
        let guardState = state.fundingRedactor as { pending: string } | undefined;
        if (!guardState) {
          guardState = { pending: "" };
          state.fundingRedactor = guardState;
        }

        const combined = guardState.pending + chunk;
        const tail = combined.slice(-FUNDING_HOLD_WINDOW);
        const partialMatch = tail.match(FUNDING_PARTIAL_PATTERN);
        const shouldHoldPartial = partialMatch !== null && /[:$]/.test(partialMatch[0]);

        const safeSegmentEnd = shouldHoldPartial
          ? combined.length - (partialMatch?.[0].length ?? 0)
          : combined.length;

        const safeSegment = combined.slice(0, safeSegmentEnd);
        guardState.pending = combined.slice(safeSegmentEnd);

        if (!safeSegment) {
          return null;
        }

        const sanitized = safeSegment.replace(FUNDING_PATTERN, "funding: [redacted]");

        const clone = { ...part } as { [key: string]: unknown };
        clone.delta = sanitized;
        clone.text = sanitized;
        return clone as typeof part;
      },
    }),
    createMaxLengthGuardrail({
      maxCharacters: 320,
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

// Demo (run manually when experimenting locally):
// const response = await agent.generateText("Hey, how much funding have we raised so far?");
// console.log(response.text);
