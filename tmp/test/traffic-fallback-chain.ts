// @ts-nocheck
/**
 * Manual test: TrafficController circuit breaker + fallback chains.
 *
 * Scenarios:
 *  - Test 1: Open primary circuit (via repeated 429s), then route to fallback1.
 *  - Test 2: Open fallback1 circuit, then route to fallback2 (success).
 *  - Test 3: No fallback configured → CircuitBreakerOpenError.
 *
 * Run:
 *  - pnpm ts-node tmp/test/traffic-fallback-chain.ts
 *  - VERBOSE=1 pnpm ts-node tmp/test/traffic-fallback-chain.ts
 */

import { safeStringify } from "@voltagent/internal";
import { MockLanguageModelV2, MockProviderV2 } from "ai/test";
import {
  Agent,
  CircuitBreakerOpenError,
  getTrafficController,
} from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

type ModelId = "primary" | "fallback1" | "fallback2" | "no-fallback";

const provider = "test-provider";

const controller = getTrafficController({
  maxConcurrent: 1,
  fallbackChains: {
    primary: ["fallback1", "fallback2"],
    fallback1: ["fallback2"],
  },
});

function makeAlways429Model(modelId: ModelId) {
  let attempts = 0;
  return new MockLanguageModelV2({
    provider,
    modelId,
    doGenerate: async () => {
      attempts += 1;
      console.log(`[${now()}] doGenerate model=${modelId} attempt=${attempts} -> 429`);
      await sleep(25);
      const err: any = new Error(`forced 429 for model=${modelId} attempt=${attempts}`);
      err.status = 429;
      throw err;
    },
  });
}

function makeAlwaysOkModel(modelId: ModelId) {
  let attempts = 0;
  return new MockLanguageModelV2({
    provider,
    modelId,
    doGenerate: async () => {
      attempts += 1;
      console.log(`[${now()}] doGenerate model=${modelId} attempt=${attempts} -> ok`);
      await sleep(25);
      return {
        content: [{ type: "text", text: `ok:${modelId}` }],
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
        response: { modelId, headers: {} },
      };
    },
  });
}

const primaryModel = makeAlways429Model("primary");
const fallback1Model = makeAlways429Model("fallback1");
const fallback2Model = makeAlwaysOkModel("fallback2");
const noFallbackModel = makeAlways429Model("no-fallback");

// Required so Agent fallbacks (string model IDs) resolve without network calls.
(globalThis as any).AI_SDK_DEFAULT_PROVIDER = new MockProviderV2({
  languageModels: {
    primary: primaryModel,
    fallback1: fallback1Model,
    fallback2: fallback2Model,
    "no-fallback": noFallbackModel,
  },
});

const primaryAgent = new Agent({
  name: "traffic-fallback-primary",
  instructions: "echo",
  model: primaryModel,
  temperature: 0,
  maxOutputTokens: 32,
});

const noFallbackAgent = new Agent({
  name: "traffic-fallback-none",
  instructions: "echo",
  model: noFallbackModel,
  temperature: 0,
  maxOutputTokens: 32,
});

async function runOnce(label: string, agent: any) {
  console.log(`\n--- ${label} ---`);
  try {
    const result = await agent.generateText(label, {
      tenantId: "default",
      trafficPriority: "P1",
    });
    console.log(
      `[${label}] success text=${result.text} responseModel=${result.response?.modelId ?? "n/a"}`,
    );
  } catch (err: any) {
    if (err instanceof CircuitBreakerOpenError) {
      console.log(
        `[${label}] CircuitBreakerOpenError retryAfterMs=${err.retryAfterMs} msg=${err.message}`,
      );
    } else {
      console.log(
        `[${label}] failed name=${err?.name ?? "Error"} status=${err?.status ?? err?.statusCode ?? "n/a"} msg=${err?.message}`,
      );
    }
  }
}

async function main() {
  console.log("\n=== Circuit breaker + fallback chain ===");
  void controller;

  console.log("\n[Test 1] Open primary circuit, then route to fallback1");
  // Two calls * (up to 3 retries each) ≈ 6 failures → should open the circuit (threshold=5).
  await runOnce("primary-warmup-1", primaryAgent);
  await runOnce("primary-warmup-2", primaryAgent);
  await runOnce("primary-after-open", primaryAgent); // should execute fallback1 (still closed)

  console.log("\n[Test 2] Open fallback1 circuit, then route to fallback2");
  // Build enough failures on fallback1 by routing multiple requests to it via primary circuit-open path.
  await runOnce("fallback1-warmup-1-via-primary", primaryAgent);
  await runOnce("fallback1-warmup-2-via-primary", primaryAgent);
  await runOnce("primary-should-hit-fallback2", primaryAgent); // should execute fallback2 and succeed

  console.log("\n[Test 3] No fallback configured → CircuitBreakerOpenError");
  await runOnce("no-fallback-warmup-1", noFallbackAgent);
  await runOnce("no-fallback-warmup-2", noFallbackAgent);
  await runOnce("no-fallback-after-open", noFallbackAgent);

  console.log("\n[debug] model call counts:");
  console.log(
    safeStringify({
      primary: primaryModel.doGenerateCalls?.length,
      fallback1: fallback1Model.doGenerateCalls?.length,
      fallback2: fallback2Model.doGenerateCalls?.length,
      "no-fallback": noFallbackModel.doGenerateCalls?.length,
    }),
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
