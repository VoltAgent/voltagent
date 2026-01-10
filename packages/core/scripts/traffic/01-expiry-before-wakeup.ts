/**
 * Goal (one feature):
 * - If a request is queued due to maxConcurrent, it should time out based on its own deadline,
 *   even if the "wakeup" (slot becoming available) happens later.
 *
 * How we test (public API only):
 * - Configure shared TrafficController: maxConcurrent=1.
 * - Start request A and keep it running ~1200ms (occupies the only slot).
 * - Start request B with maxQueueWaitMs=500ms (deadline earlier than A's finish).
 * - Expect:
 *   - B rejects with QueueWaitTimeoutError around ~500ms (before A finishes).
 *   - B's model is never invoked (no late start after A completes).
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/01-expiry-before-wakeup.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { QueueWaitTimeoutError, getTrafficController, Agent } = require("../../dist/index.js");

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

  getTrafficController({
    maxConcurrent: 1,
    logger: logger as any,
  });

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const aSleepMs = 1200;
  const bQueueWaitMs = 500;

  const slowModelA = new MockLanguageModelV3({
    modelId: "mock-slow-A",
    doGenerate: async () => {
      await sleep(aSleepMs);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "A done" }],
        warnings: [],
      };
    },
  });

  let bModelInvoked = false;
  const fastModelB = new MockLanguageModelV3({
    modelId: "mock-fast-B",
    doGenerate: async () => {
      bModelInvoked = true;
      logger.error("[B] Model invoked (BUG): B should have expired in queue before wakeup.");
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "B done" }],
        warnings: [],
      };
    },
  });

  const agentA = new Agent({
    name: "Expiry Before Wakeup Agent A",
    instructions: "You are a test agent.",
    model: slowModelA as any,
  });

  const agentB = new Agent({
    name: "Expiry Before Wakeup Agent B",
    instructions: "You are a test agent.",
    model: fastModelB as any,
  });

  const startedAt = Date.now();
  let aFinishedAt: number | null = null;

  const requestA = agentA
    .generateText("request A (slow)", {
      tenantId: "tenant-1",
      taskType: "chat",
    })
    .then((result: unknown) => {
      aFinishedAt = Date.now();
      logger.info(`[A] finished at +${aFinishedAt - startedAt}ms`);
      return result;
    });

  logger.info(`[A] started at +${Date.now() - startedAt}ms`);

  await sleep(25);

  const requestB = agentB.generateText("request B (should expire in queue)", {
    tenantId: "tenant-1",
    taskType: "chat",
    maxQueueWaitMs: bQueueWaitMs,
  });

  const bSettledAtStart = Date.now();
  const resultB = await requestB
    .then(() => ({ kind: "resolved" as const }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));
  const bSettledAt = Date.now();

  if (resultB.kind === "resolved") {
    logger.error("[B] Unexpectedly resolved (BUG): should have timed out in queue.");
    process.exitCode = 1;
  } else if (resultB.error instanceof QueueWaitTimeoutError) {
    logger.info(`[B] Timed out as expected at +${bSettledAt - startedAt}ms`, {
      maxQueueWaitMs: resultB.error.maxQueueWaitMs,
      deadlineAt: resultB.error.deadlineAt,
    });
  } else {
    logger.error("[B] Failed with unexpected error", { error: resultB.error });
    process.exitCode = 1;
  }

  const bElapsedMs = bSettledAt - bSettledAtStart;
  if (bElapsedMs > bQueueWaitMs + 250) {
    logger.error(
      "[B] Timeout happened too late (BUG): likely waited for wakeup instead of deadline.",
      {
        bQueueWaitMs,
        bElapsedMs,
      },
    );
    process.exitCode = 1;
  }

  if (bModelInvoked) {
    process.exitCode = 1;
  }

  await requestA.catch(() => {});

  if (aFinishedAt !== null && bSettledAt > aFinishedAt) {
    logger.error("[B] Settled after A finished (BUG): B should have expired before wakeup.", {
      bSettledAtMs: bSettledAt - startedAt,
      aFinishedAtMs: aFinishedAt - startedAt,
    });
    process.exitCode = 1;
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
