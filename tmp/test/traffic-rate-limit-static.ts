// @ts-nocheck
/**
 * Manual test: TrafficController window-based rate limiting (simulated OpenAI headers).
 *
 * What to look for:
 *  - Requests should be paced out across the window (no steady "refill" math).
 *  - If responses arrive out-of-order, remaining headers might "increase"; controller should
 *    keep remaining monotonic within the same window.
 *
 * Run:
 *  - pnpm ts-node tmp/test/traffic-rate-limit-static.ts
 *  - VERBOSE=1 pnpm ts-node tmp/test/traffic-rate-limit-static.ts
 *
 * Optional env:
 *  - LIMIT=6 WINDOW_MS=3000 pnpm ts-node tmp/test/traffic-rate-limit-static.ts
 */

import { safeStringify } from "@voltagent/internal";
import { Agent, getTrafficController } from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

const provider = "sim";
const model = "rate-limited-model";
const key = `${provider}::${model}`;

const controller = getTrafficController({ maxConcurrent: 50 });

const limit = Number(process.env.LIMIT ?? 6);
const windowMs = Number(process.env.WINDOW_MS ?? 3000);
let windowStartAt = Date.now();
let windowResetAt = windowStartAt + windowMs;
let usedInWindow = 0;

function extractLabel(prompt: any): string {
  if (!Array.isArray(prompt)) {
    return "unknown";
  }

  for (let index = prompt.length - 1; index >= 0; index -= 1) {
    const message = prompt[index];
    if (!message || message.role !== "user" || !Array.isArray(message.content)) {
      continue;
    }

    const textPart = message.content.find((part: any) => part?.type === "text");
    if (textPart?.text) {
      return String(textPart.text);
    }
  }

  return "unknown";
}

async function main() {
  console.log(
    `\n=== Window rate limit for ${key} (limit=${limit}, windowMs=${windowMs}, jobs=10) ===`,
  );

  const seeded = controller.updateRateLimitFromHeaders(
    { provider, model },
    {
      "x-ratelimit-limit-requests": String(limit),
      "x-ratelimit-remaining-requests": String(limit),
      "x-ratelimit-reset-requests": `${windowMs}ms`,
    },
  );
  console.log(`[seed] updateRateLimitFromHeaders=${safeStringify(seeded)}`);

  let calls = 0;
  let lastStartAt = 0;
  const rateLimitedModel = {
    specificationVersion: "v2",
    provider,
    modelId: model,
    doGenerate: async (options: any) => {
      const simulatedLatencyMs = 10 + Math.floor(Math.random() * 120);
      const nowMs = Date.now();
      if (nowMs >= windowResetAt) {
        windowStartAt = nowMs;
        windowResetAt = windowStartAt + windowMs;
        usedInWindow = 0;
      }

      calls += 1;
      usedInWindow += 1;
      const startAt = Date.now();
      const delta = lastStartAt ? startAt - lastStartAt : 0;
      lastStartAt = startAt;

      const label = extractLabel(options?.prompt);
      console.log(
        `[${now()}] doGenerate start call=${calls} (+${delta}ms) input=${label} latencyMs=${simulatedLatencyMs}`,
      );
      await sleep(simulatedLatencyMs);
      console.log(`[${now()}] doGenerate end   input=${label}`);

      const remainingAfterThis = Math.max(0, limit - usedInWindow);
      const resetMs = Math.max(1, windowResetAt - Date.now());
      return {
        content: [{ type: "text", text: `ok:${label}` }],
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
        response: {
          modelId: model,
          headers: {
            "x-ratelimit-limit-requests": String(limit),
            "x-ratelimit-remaining-requests": String(remainingAfterThis),
            "x-ratelimit-reset-requests": `${resetMs}ms`,
          },
        },
      };
    },
  };

  const agent = new Agent({
    name: "traffic-rate-limit-static",
    instructions: "echo",
    model: rateLimitedModel,
    temperature: 0,
    maxOutputTokens: 32,
  });

  const jobs = Array.from({ length: 10 }, (_, idx) =>
    agent.generateText(`req-${idx + 1}`, {
      tenantId: "default",
      trafficPriority: "P1",
    }),
  );

  const settled = await Promise.allSettled(jobs);
  console.log(
    `\n[done] results=${safeStringify(
      settled.map((s) => (s.status === "fulfilled" ? s.value.text : s.reason?.message)),
    )}`,
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
