// @ts-nocheck
/**
 * Manual test: TrafficController retry behavior via Agent + AI SDK path (stub model).
 *
 * Scenarios included:
 *  - 5xx retries (up to 3 attempts)
 *  - 429 retries (up to 3 attempts)
 *  - timeout retries (up to 2 attempts)
 *  - non-retriable 4xx does not retry
 *
 * Run:
 *  - pnpm ts-node tmp/test/traffic-retry-behavior.ts
 *
 * Notes:
 *  - Uses a stub LanguageModel; no network calls.
 *  - Watch the `[model] attempt=...` logs to confirm retries.
 */

import { Agent, getTrafficController } from "../../packages/core/dist/index.js";

const verbose = process.env.VERBOSE === "1";
if (!verbose) {
  console.debug = () => {};
}

type Scenario =
  | "server-error"
  | "rate-limit"
  | "timeout"
  | "bad-request"
  | "forbidden"
  // Variations to hit different retry-detection branches.
  | "server-error-status-string"
  | "server-error-statusCode"
  | "server-error-response-status"
  | "server-error-cause-status"
  | "rate-limit-statusCode"
  | "timeout-code-only"
  | "timeout-name-only"
  | "timeout-message-only"
  // Variations that should STOP retrying (hit max attempts).
  | "server-error-exceed-max"
  | "timeout-exceed-max";

type RetryPlan = {
  failCountBeforeSuccess: number;
  status?: number | string;
  statusCode?: number | string;
  httpStatus?: number | string;
  responseStatus?: number | string;
  causeStatus?: number | string;
  code?: string;
  name?: string;
  message?: string;
};

const plans: Record<Scenario, RetryPlan> = {
  "server-error": { failCountBeforeSuccess: 2, status: 500 },
  "rate-limit": { failCountBeforeSuccess: 2, status: 429 },
  timeout: { failCountBeforeSuccess: 1, status: 408, code: "ETIMEDOUT", message: "timeout" },
  "bad-request": { failCountBeforeSuccess: 10, status: 400 },
  forbidden: { failCountBeforeSuccess: 10, status: 403 },
  "server-error-status-string": { failCountBeforeSuccess: 2, status: "500" },
  "server-error-statusCode": { failCountBeforeSuccess: 2, statusCode: 502 },
  "server-error-response-status": { failCountBeforeSuccess: 2, responseStatus: 503 },
  "server-error-cause-status": { failCountBeforeSuccess: 2, causeStatus: 500 },
  "rate-limit-statusCode": { failCountBeforeSuccess: 2, statusCode: 429 },
  "timeout-code-only": { failCountBeforeSuccess: 1, code: "timeout" },
  "timeout-name-only": { failCountBeforeSuccess: 1, name: "TimeoutError" },
  "timeout-message-only": { failCountBeforeSuccess: 1, message: "this is a TIMEOUT" },
  "server-error-exceed-max": { failCountBeforeSuccess: 10, status: 500 },
  "timeout-exceed-max": { failCountBeforeSuccess: 10, message: "timeout" },
};

function makeModel(modelId: string, plan: RetryPlan) {
  let counter = 0;
  let lastAttemptAt = 0;

  return {
    specificationVersion: "v2",
    provider: "retry-provider",
    modelId,
    doGenerate: async () => {
      counter += 1;
      const now = Date.now();
      const delta = lastAttemptAt ? now - lastAttemptAt : 0;
      lastAttemptAt = now;

      console.log(`[model] modelId=${modelId} attempt=${counter} (+${delta}ms)`);

      if (counter <= plan.failCountBeforeSuccess) {
        const err: any = new Error(plan.message ?? `forced failure ${counter} for ${modelId}`);
        if (plan.status !== undefined) err.status = plan.status;
        if (plan.statusCode !== undefined) err.statusCode = plan.statusCode;
        if (plan.httpStatus !== undefined) err.httpStatus = plan.httpStatus;
        if (plan.responseStatus !== undefined) err.response = { status: plan.responseStatus };
        if (plan.causeStatus !== undefined) err.cause = { status: plan.causeStatus };
        if (plan.code !== undefined) err.code = plan.code;
        if (plan.name !== undefined) err.name = plan.name;
        throw err;
      }

      return {
        content: [{ type: "text", text: "ok" }],
        finishReason: "stop",
        usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
        warnings: [],
        response: { modelId, headers: {} },
      };
    },
  };
}

async function runScenario(name: Scenario) {
  const plan = plans[name];
  const modelId = `retry-${name}`;
  const model = makeModel(modelId, plan);

  const agent = new Agent({
    name: `RetryAgent-${name}`,
    instructions: "echo",
    model,
    maxOutputTokens: 32,
    temperature: 0,
  });

  console.log(`\n=== ${name} ===`);
  try {
    const result = await agent.generateText(name, { tenantId: "retry-test" });
    console.log(`[${name}] succeeded. text=${result.text}`);
  } catch (err: any) {
    console.log(
      `[${name}] failed. status=${err?.status ?? err?.statusCode ?? err?.response?.status ?? "n/a"}`,
    );
  }
}

async function main() {
  // Create controller early so all Agent calls share the same singleton.
  getTrafficController({ maxConcurrent: 1 });

  const runs: Scenario[] = [
    "server-error",
    "rate-limit",
    "timeout",
    "bad-request",
    "forbidden",
    // Uncomment for additional coverage:
    // "server-error-status-string",
    // "server-error-statusCode",
    // "server-error-response-status",
    // "server-error-cause-status",
    // "rate-limit-statusCode",
    // "timeout-code-only",
    // "timeout-name-only",
    // "timeout-message-only",
    // "server-error-exceed-max",
    // "timeout-exceed-max",
  ];

  for (const name of runs) {
    await runScenario(name);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
