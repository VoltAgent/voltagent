// @ts-nocheck
/**
 * Manual test: Retry-After handling (429 retry + 200 OK header ingestion).
 *
 * What this exercises:
 *  - Retry-After on 429 errors increases retry delay (TrafficController retry plan).
 *  - Retry-After on successful responses throttles subsequent requests for the same provider::model.
 *
 * Run:
 *  - pnpm -C packages/core build
 *  - pnpm ts-node tmp/test/traffic-retry-after.ts
 *  - VERBOSE=1 pnpm ts-node tmp/test/traffic-retry-after.ts
 */

import { safeStringify } from "@voltagent/internal";
import {
  Agent,
  RateLimitedUpstreamError,
  getTrafficController,
} from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const now = () => new Date().toISOString();

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

function make429RetryAfterModel(args: {
  provider: string;
  modelId: string;
  retryAfterSeconds: number;
  mode: "headers" | "typedError";
}) {
  const { provider, modelId, retryAfterSeconds, mode } = args;
  let calls = 0;
  const startedAt: number[] = [];

  return {
    specificationVersion: "v2",
    provider,
    modelId,
    startedAt,
    doGenerate: async (options: any) => {
      calls += 1;
      const start = Date.now();
      startedAt.push(start);

      const label = extractLabel(options?.prompt);
      console.log(`[${now()}] [model] ${provider}::${modelId} start call=${calls} input=${label}`);

      if (calls === 1) {
        const retryAfterValue = String(retryAfterSeconds);

        if (mode === "typedError") {
          throw new RateLimitedUpstreamError(
            `rate limited (typed) retry-after=${retryAfterValue}s`,
            { provider, model: modelId },
            Math.round(retryAfterSeconds * 1000),
          );
        }

        const err: any = new Error(`rate limited (headers) retry-after=${retryAfterValue}s`);
        err.status = 429;
        err.response = {
          status: 429,
          headers: {
            "retry-after": retryAfterValue,
          },
        };
        throw err;
      }

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

function makeSuccessRetryAfterModel(args: {
  provider: string;
  modelId: string;
  retryAfterSeconds: number;
  latencyMs: number;
}) {
  const { provider, modelId, retryAfterSeconds, latencyMs } = args;
  let calls = 0;
  const startedAt: number[] = [];
  const endedAt: number[] = [];

  return {
    specificationVersion: "v2",
    provider,
    modelId,
    startedAt,
    endedAt,
    doGenerate: async (options: any) => {
      calls += 1;
      const start = Date.now();
      startedAt.push(start);

      const label = extractLabel(options?.prompt);
      console.log(`[${now()}] [model] ${provider}::${modelId} start call=${calls} input=${label}`);
      await sleep(latencyMs);

      const end = Date.now();
      endedAt.push(end);
      console.log(`[${now()}] [model] ${provider}::${modelId} end   call=${calls} input=${label}`);

      return {
        content: [{ type: "text", text: `ok:${label}` }],
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
        response: {
          modelId,
          headers:
            calls === 1
              ? {
                  "retry-after": String(retryAfterSeconds),
                }
              : {},
        },
      };
    },
  };
}

async function test_retryAfterOn429(mode: "headers" | "typedError") {
  const retryAfterSeconds = 1;
  const provider = `retry-after-429-${mode}`;
  const modelId = "ra-429";
  const tenantId = `ra-429-${mode}`;

  const model = make429RetryAfterModel({ provider, modelId, retryAfterSeconds, mode });
  const agent = new Agent({
    name: `ra-429-${mode}`,
    instructions: "echo",
    model,
    temperature: 0,
    maxOutputTokens: 32,
  });

  console.log(`\n=== Test: Retry-After on 429 (${mode}) ===`);
  const result = await agent.generateText("hello", { tenantId, trafficPriority: "P1" });

  const times = model.startedAt;
  const deltaMs = times.length >= 2 ? times[1] - times[0] : undefined;

  console.log(
    `[result] text=${result.text} calls=${times.length} startedAt=${safeStringify(times)} deltaMs=${deltaMs}`,
  );

  if (deltaMs === undefined || deltaMs < retryAfterSeconds * 1000) {
    throw new Error(
      `Expected retry delay >= ${retryAfterSeconds * 1000}ms, got ${deltaMs ?? "n/a"}ms`,
    );
  }
}

async function test_retryAfterOnSuccessResponse() {
  const retryAfterSeconds = 0.3;
  const provider = "retry-after-200";
  const modelId = "ra-200";
  const tenantId = "ra-200";

  const model = makeSuccessRetryAfterModel({
    provider,
    modelId,
    retryAfterSeconds,
    latencyMs: 20,
  });

  const agent = new Agent({
    name: "ra-200",
    instructions: "echo",
    model,
    temperature: 0,
    maxOutputTokens: 32,
  });

  console.log("\n=== Test: Retry-After on 200 response headers ===");
  const first = agent.generateText("first", { tenantId, trafficPriority: "P1" });
  const second = agent.generateText("second", { tenantId, trafficPriority: "P1" });

  const [r1, r2] = await Promise.all([first, second]);

  const end1 = model.endedAt[0];
  const start2 = model.startedAt[1];
  const enforcedDelayMs = start2 && end1 ? start2 - end1 : undefined;

  console.log(
    `[result] texts=${safeStringify([r1.text, r2.text])} startedAt=${safeStringify(
      model.startedAt,
    )} endedAt=${safeStringify(model.endedAt)} enforcedDelayMs=${enforcedDelayMs}`,
  );

  if (enforcedDelayMs === undefined || enforcedDelayMs < retryAfterSeconds * 1000) {
    throw new Error(
      `Expected rate-limit delay >= ${retryAfterSeconds * 1000}ms, got ${enforcedDelayMs ?? "n/a"}ms`,
    );
  }
}

async function main() {
  // Create controller early so all Agent calls share the same singleton.
  getTrafficController({ maxConcurrent: 1 });

  await test_retryAfterOn429("headers");
  await test_retryAfterOn429("typedError");
  await test_retryAfterOnSuccessResponse();

  console.log("\n[done] All Retry-After manual checks passed.");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
