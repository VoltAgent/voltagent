// @ts-nocheck
/**
 * Manual test: Agent → TrafficController priority scheduling (OpenAI-like stub models).
 *
 * This keeps the Agent + AI SDK path, but avoids real network calls by using stub models
 * that pretend to be `provider="openai"` with modelIds like `gpt-4o`/`gpt-4o-mini`.
 *
 * Scenarios:
 *  - Test 1: P0 runs before P1/P2 when all runnable.
 *  - Test 2: P0 request (gpt-4o) is rate-limited → P1 (gpt-4o-mini) proceeds.
 *
 * Note:
 *  - Rate-limit wakeups include a small probe delay; a "1s" reset may unblock slightly after 1s.
 *
 * Run:
 *  - pnpm ts-node tmp/test/traffic-priority-openai-sim.ts
 */

import { safeStringify } from "@voltagent/internal";
import { Agent, getTrafficController } from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

function makeOpenAIStubModel(modelId: string, delayMs: number) {
  let calls = 0;
  return {
    specificationVersion: "v2",
    provider: "openai",
    modelId,
    doGenerate: async () => {
      calls += 1;
      console.log(`[${now()}] [model] ${modelId} doGenerate call=${calls}`);
      await sleep(delayMs);
      return {
        content: [{ type: "text", text: `ok:${modelId}` }],
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
        response: { modelId, headers: {} },
      };
    },
  };
}

const controller = getTrafficController({ maxConcurrent: 1 });

const modelMini = makeOpenAIStubModel("gpt-4o-mini", 80);
const modelBig = makeOpenAIStubModel("gpt-4o", 80);

const agent = new Agent({
  name: "priority-openai-sim",
  instructions: "echo",
  model: modelMini,
  temperature: 0,
  maxOutputTokens: 32,
});

async function test1_priorityOrder() {
  console.log("\n=== Test 1: P0 ordering via Agent ===");

  const p2 = agent.generateText("P2", { trafficPriority: "P2", tenantId: "sim" });
  const p1 = agent.generateText("P1", { trafficPriority: "P1", tenantId: "sim" });
  const p0 = agent.generateText("P0", { trafficPriority: "P0", tenantId: "sim" });

  const results = await Promise.all([p0, p1, p2]);
  console.log(`[Test 1] results=${safeStringify(results.map((r) => r.text))}`);
}

async function test2_p1RunsWhenP0RateLimited() {
  console.log("\n=== Test 2: P1 proceeds when P0 is rate-limited ===");

  // Seed remaining=0 for openai::gpt-4o so the P0 head item initially waits.
  const applied = controller.updateRateLimitFromHeaders(
    { provider: "openai", model: "gpt-4o" },
    {
      "x-ratelimit-limit-requests": "1",
      "x-ratelimit-remaining-requests": "0",
      "x-ratelimit-reset-requests": "1s",
    },
  );
  console.log(`[Test 2] updateRateLimitFromHeaders=${safeStringify(applied)}`);

  const p0Blocked = agent.generateText("P0 (gpt-4o, rate-limited)", {
    trafficPriority: "P0",
    tenantId: "sim",
    model: modelBig, // per-call model override (new in this branch)
  });

  const p1Free = agent.generateText("P1 (gpt-4o-mini)", {
    trafficPriority: "P1",
    tenantId: "sim",
    model: modelMini,
  });

  const [r0, r1] = await Promise.all([p0Blocked, p1Free]);
  console.log(`[Test 2] p0 text=${r0.text}`);
  console.log(`[Test 2] p1 text=${r1.text}`);
}

async function main() {
  await test1_priorityOrder();
  await test2_p1RunsWhenP0RateLimited();
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
