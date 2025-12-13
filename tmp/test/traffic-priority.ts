// @ts-nocheck
/**
 * Manual test: TrafficController priority scheduling.
 *
 * Scenarios:
 *  - Test 1: P0 should run before P1/P2 when runnable.
 *  - Test 2: If a P0 request is rate-limited, a lower priority (P1) can proceed.
 *
 * Run:
 *  - pnpm ts-node tmp/test/traffic-priority.ts
 *  - VERBOSE=1 pnpm ts-node tmp/test/traffic-priority.ts
 */

import { safeStringify } from "@voltagent/internal";
import { Agent, getTrafficController } from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

const controller = getTrafficController({ maxConcurrent: 1 });

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

function makeModel(provider: string, modelId: string, delayMs = 50) {
  let calls = 0;
  let lastStartAt = 0;

  return {
    specificationVersion: "v2",
    provider,
    modelId,
    doGenerate: async (options: any) => {
      calls += 1;
      const startAt = Date.now();
      const delta = lastStartAt ? startAt - lastStartAt : 0;
      lastStartAt = startAt;

      const label = extractLabel(options?.prompt);
      console.log(
        `[${now()}] doGenerate start model=${provider}::${modelId} call=${calls} (+${delta}ms) input=${label}`,
      );
      await sleep(delayMs);
      console.log(`[${now()}] doGenerate end   model=${provider}::${modelId} input=${label}`);

      return {
        content: [{ type: "text", text: `ok:${label}` }],
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
        response: { modelId, headers: {} },
      };
    },
  };
}

async function test1_priorityOrder() {
  console.log("\n=== Test 1: priority order (P0 before P1/P2) ===");

  const sharedModel = makeModel("p", "shared-model", 50);
  const agent = new Agent({
    name: "traffic-priority",
    instructions: "echo",
    model: sharedModel,
    temperature: 0,
    maxOutputTokens: 32,
  });

  // Enqueue in reverse order; scheduler should still run P0 first.
  const p2 = agent.generateText("P2", { tenantId: "default", trafficPriority: "P2" });
  const p1 = agent.generateText("P1", { tenantId: "default", trafficPriority: "P1" });
  const p0 = agent.generateText("P0", { tenantId: "default", trafficPriority: "P0" });

  const settled = await Promise.allSettled([p0, p1, p2]);
  console.log(
    `[Test 1] results=${safeStringify(
      settled.map((s) => (s.status === "fulfilled" ? s.value.text : s.reason?.message)),
    )}`,
  );
}

async function test2_lowerPriorityWhenP0RateLimited() {
  console.log("\n=== Test 2: P1 proceeds when P0 rate-limited ===");

  const applied = controller.updateRateLimitFromHeaders(
    { provider: "p0", model: "m0" },
    {
      "x-ratelimit-limit-requests": "1",
      "x-ratelimit-remaining-requests": "0",
      "x-ratelimit-reset-requests": "1s",
    },
  );
  console.log(`[Test 2] updateRateLimitFromHeaders=${safeStringify(applied)}`);

  const modelP0 = makeModel("p0", "m0", 50);
  const modelP1 = makeModel("p1", "m1", 50);
  const agent = new Agent({
    name: "traffic-priority-rate-limit",
    instructions: "echo",
    model: modelP1,
    temperature: 0,
    maxOutputTokens: 32,
  });

  // Now the next P0 request is at the head of the queue but rate-limited,
  // so a runnable P1 request should execute first.
  const p0Blocked = agent.generateText("P0-blocked (rate limited)", {
    tenantId: "default",
    trafficPriority: "P0",
    model: modelP0,
  });
  const p1Free = agent.generateText("P1-free (should run first)", {
    tenantId: "default",
    trafficPriority: "P1",
    model: modelP1,
  });

  const settled = await Promise.allSettled([p0Blocked, p1Free]);
  console.log(
    `[Test 2] results=${safeStringify(
      settled.map((s) => (s.status === "fulfilled" ? s.value.text : s.reason?.message)),
    )}`,
  );
}

async function main() {
  await test1_priorityOrder();
  await test2_lowerPriorityWhenP0RateLimited();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
