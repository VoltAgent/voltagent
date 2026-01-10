/**
 * Goal (one feature):
 * - In `processQueuedCandidate()`, queue timeout should be checked before any "gates"
 *   (circuit breaker, concurrency limiter, adaptive limiter, rate limiter).
 *
 * How we test (public API only):
 * - Configure TrafficController: maxConcurrent=2 and a rate limit for model `mock-B`.
 *   - maxConcurrent=2 ensures we are NOT in the saturated branch.
 *   - rate limit ensures that if B were not expired, it would enter the rate-limit wait path.
 * - Start request A that runs ~800ms (occupies 1 slot, but leaves 1 free).
 * - Enqueue request B with maxQueueWaitMs=1ms and then wait ~30ms so it's definitely expired.
 * - Expect:
 *   - B rejects with QueueWaitTimeoutError.
 *   - Logs show queue-timeout rejection for B, and do NOT show rate-limit waiting for B
 *     (e.g. no "Token bucket empty; waiting" for rateLimitKey `mock-provider::mock-B::taskType=chat`).
 *   - B's model is never invoked.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/07-queue-timeout-before-gates.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { QueueWaitTimeoutError, getTrafficController, Agent } = require("../../dist/index.js");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type State = {
  sawRateLimitWaitForB: boolean;
  bModelInvoked: boolean;
};

function createDetectingLogger(name: string, state: State) {
  const write =
    (level: string) =>
    (msg: string, context?: Record<string, unknown>): void => {
      if (msg === "Token bucket empty; waiting") {
        const key = context?.rateLimitKey;
        if (key === "mock-provider::mock-B::taskType=chat") {
          state.sawRateLimitWaitForB = true;
        }
      }

      const prefix = `[${name}] [${level}]`;
      if (context) {
        console.info(prefix, msg, context);
        return;
      }
      console.info(prefix, msg);
    };

  return {
    child: (bindings?: Record<string, unknown>) =>
      createDetectingLogger(
        bindings
          ? `${name} ${Object.entries(bindings)
              .map(([k, v]) => `${k}=${String(v)}`)
              .join(" ")}`
          : name,
        state,
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
  const state: State = { sawRateLimitWaitForB: false, bModelInvoked: false };
  const logger = createDetectingLogger("traffic-demo", state);

  // Rate limit configuration for B's model key.
  // Use burstSize=0 to make it always wait (capacity becomes 1 per implementation),
  // and very low refill to keep it waiting if it were evaluated by the rate limiter.
  const bRateLimitKey = "mock-provider::mock-B::taskType=chat";

  getTrafficController({
    maxConcurrent: 2,
    logger: logger as any,
    rateLimits: {
      [bRateLimitKey]: { requestsPerMinute: 1, tokensPerMinute: 0, burstSize: 1 },
    },
  });

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const startedAt = Date.now();

  const modelA = new MockLanguageModelV3({
    modelId: "mock-A",
    doGenerate: async () => {
      await sleep(800);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "A done" }],
        warnings: [],
      };
    },
  });

  const modelB = new MockLanguageModelV3({
    modelId: "mock-B",
    doGenerate: async () => {
      state.bModelInvoked = true;
      logger.error("[B] Model invoked (BUG): expired request should never dispatch.");
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "B done" }],
        warnings: [],
      };
    },
  });

  const agentA = new Agent({
    name: "Queue Timeout Before Gates Agent A",
    instructions: "You are a test agent.",
    model: modelA as any,
  });

  const agentB = new Agent({
    name: "Queue Timeout Before Gates Agent B",
    instructions: "You are a test agent.",
    model: modelB as any,
  });

  const requestA = agentA.generateText("request A (slow)", {
    tenantId: "tenant-1",
    taskType: "chat",
  });
  logger.info(`[A] started at +${Date.now() - startedAt}ms`);

  // Enqueue B with a near-immediate queue timeout, then ensure it is expired
  // by the time the drain loop evaluates it.
  // Important: attach a rejection handler immediately; Node may treat unhandled rejections as fatal.
  const requestBHandled = agentB
    .generateText("request B (expires immediately)", {
      tenantId: "tenant-1",
      taskType: "chat",
      maxQueueWaitMs: 1,
    })
    .then(() => ({ kind: "resolved" as const }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));
  await sleep(30);

  const resultB = await requestBHandled;

  if (resultB.kind === "resolved") {
    logger.error("[B] Unexpectedly resolved (BUG): should have timed out in queue.");
    process.exitCode = 1;
  } else if (resultB.error instanceof QueueWaitTimeoutError) {
    logger.info(`[B] Timed out as expected at +${Date.now() - startedAt}ms`, {
      waitedMs: resultB.error.waitedMs,
      maxQueueWaitMs: resultB.error.maxQueueWaitMs,
      deadlineAt: resultB.error.deadlineAt,
      rateLimitKey: resultB.error.rateLimitKey,
    });
  } else {
    logger.error("[B] Failed with unexpected error", { error: resultB.error });
    process.exitCode = 1;
  }

  if (state.sawRateLimitWaitForB) {
    logger.error("[B] Saw rate-limit wait log (BUG): queue-timeout should happen before gates.");
    process.exitCode = 1;
  } else {
    logger.info("[ok] No rate-limit wait observed for B (queue-timeout ran before gates).");
  }

  if (state.bModelInvoked) {
    process.exitCode = 1;
  }

  await requestA.catch(() => {});
  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
