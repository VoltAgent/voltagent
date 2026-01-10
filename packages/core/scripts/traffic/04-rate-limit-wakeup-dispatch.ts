/**
 * Goal (one feature):
 * - When not concurrency-saturated, if a queued request is blocked by a gate (rate limit),
 *   the controller should:
 *   1) return a `wait` decision with a wake-up time,
 *   2) schedule a wakeup, and
 *   3) eventually dispatch the request after that wakeup without needing a new enqueue.
 *
 * How we test (public API only):
 * - Configure TrafficController:
 *   - maxConcurrent=2 (so we can evaluate the 2nd request while the 1st is in-flight).
 *   - rateLimits for the model key with burstSize=1 and refill ~2 tokens/sec (wait ~500ms).
 * - Enqueue request A (consumes the only token immediately).
 * - Enqueue request B right after; it should be rate-limit blocked and dispatched only after wakeup.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/04-rate-limit-wakeup-dispatch.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { getTrafficController, Agent } = require("../../dist/index.js");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function createLeanLogger(name: string) {
  const write =
    (level: string) =>
    (msg: string, context?: object): void => {
      const prefix = `[${name}] [${level}]`;
      if (context) {
        console.info(prefix, msg, context);
        return;
      }
      console.info(prefix, msg);
    };

  return {
    child: (bindings?: Record<string, unknown>) =>
      createLeanLogger(
        bindings
          ? `${name} ${Object.entries(bindings)
              .map(([k, v]) => `${k}=${String(v)}`)
              .join(" ")}`
          : name,
      ),
    trace: write("trace"),
    debug: write("debug"),
    info: write("info"),
    warn: write("warn"),
    error: write("error"),
    fatal: write("fatal"),
  };
}

async function main() {
  const logger = createLeanLogger("traffic-demo");

  // Note: provider/model metadata is inferred from MockLanguageModelV3 (`mock-provider` + `modelId`).
  // Do not pass provider/model through `generateText` options, or the Agent may route via AI Gateway.
  const model = "mock-rl-model";
  const rateLimitKey = `mock-provider::${model}::taskType=chat`;

  getTrafficController({
    maxConcurrent: 2,
    logger: logger as any,
    rateLimits: {
      // Token bucket strategy uses requestsPerMinute as "tokens per minute" for request gating.
      // With burstSize=1, request A consumes the only token.
      // With 120 rpm => 2 tokens/sec, request B should wait ~500ms to refill to 1 token.
      [rateLimitKey]: { requestsPerMinute: 120, tokensPerMinute: 0, burstSize: 1 },
    },
  });

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const startedAt = Date.now();
  let invokedAAt: number | null = null;
  let invokedBAt: number | null = null;

  const modelA = new MockLanguageModelV3({
    modelId: model,
    doGenerate: async () => {
      invokedAAt = Date.now();
      logger.info(`[A] model invoked at +${invokedAAt - startedAt}ms`);
      await sleep(75);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "A done" }],
        warnings: [],
      };
    },
  });

  const modelB = new MockLanguageModelV3({
    modelId: model,
    doGenerate: async () => {
      invokedBAt = Date.now();
      logger.info(`[B] model invoked at +${invokedBAt - startedAt}ms`);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "B done" }],
        warnings: [],
      };
    },
  });

  const agentA = new Agent({
    name: "Rate Limit Wakeup Agent A",
    instructions: "You are a test agent.",
    model: modelA as any,
  });

  const agentB = new Agent({
    name: "Rate Limit Wakeup Agent B",
    instructions: "You are a test agent.",
    model: modelB as any,
  });

  const requestA = agentA.generateText("request A", {
    tenantId: "tenant-1",
    taskType: "chat",
  });
  logger.info(`[A] enqueued at +${Date.now() - startedAt}ms`);

  const requestB = agentB.generateText("request B (should wait on rate limit)", {
    tenantId: "tenant-1",
    taskType: "chat",
  });
  logger.info(`[B] enqueued at +${Date.now() - startedAt}ms`);

  await Promise.allSettled([requestA, requestB]);

  if (invokedAAt === null) {
    logger.error("[A] did not invoke model (BUG)");
    process.exitCode = 1;
  }
  if (invokedBAt === null) {
    logger.error("[B] did not invoke model (BUG)");
    process.exitCode = 1;
  }

  if (invokedAAt !== null && invokedBAt !== null) {
    const deltaMs = invokedBAt - invokedAAt;
    // Expect B to wait roughly ~500ms (rate limit refill); allow wide slack for scheduling jitter.
    if (deltaMs < 300) {
      logger.error("[B] invoked too early (BUG): expected rate-limit wait before dispatch.", {
        invokedAAtMs: invokedAAt - startedAt,
        invokedBAtMs: invokedBAt - startedAt,
        deltaMs,
        rateLimitKey,
      });
      process.exitCode = 1;
    } else {
      logger.info("[ok] B was delayed by rate limit as expected", {
        invokedAAtMs: invokedAAt - startedAt,
        invokedBAtMs: invokedBAt - startedAt,
        deltaMs,
        rateLimitKey,
      });
    }
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
