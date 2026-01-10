/**
 * Goal (one feature):
 * - When concurrency is saturated, the controller should still:
 *   1) sweep queued items for queue timeouts (without dispatching), and
 *   2) schedule a wakeup at the earliest queued deadline so timeouts fire even if no request completes.
 *
 * How we test (public API only):
 * - Configure shared TrafficController: maxConcurrent=1.
 * - Start request A that runs ~2000ms (occupies the only slot).
 * - Enqueue request B with maxQueueWaitMs=300ms and request C with maxQueueWaitMs=700ms.
 * - Expect:
 *   - B rejects with QueueWaitTimeoutError around ~300ms.
 *   - C rejects with QueueWaitTimeoutError around ~700ms.
 *   - Both rejections happen before A finishes (i.e., they are driven by scheduled wakeups, not slot release).
 *   - B/C models are never invoked.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/03-saturation-timeout-sweep-wakeup.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { QueueWaitTimeoutError, getTrafficController, Agent } = require("../../dist/index.js");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function createCountingLogger(name: string) {
  const state = {
    wakeupScheduled: 0,
  };

  const write =
    (level: string) =>
    (msg: string, context?: object): void => {
      if (msg === "Rate limit wait; scheduling wakeup") {
        state.wakeupScheduled += 1;
      }

      const prefix = `[${name}] [${level}]`;
      if (context) {
        console.info(prefix, msg, context);
        return;
      }
      console.info(prefix, msg);
    };

  return {
    state,
    child: (bindings?: Record<string, unknown>) =>
      createCountingLogger(
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
  const logger = createCountingLogger("traffic-demo");

  getTrafficController({
    maxConcurrent: 1,
    logger: logger as any,
  });

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const startedAt = Date.now();

  const aSleepMs = 2000;
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
  const modelB = new MockLanguageModelV3({
    modelId: "mock-B",
    doGenerate: async () => {
      bModelInvoked = true;
      logger.error("[B] Model invoked (BUG): should have expired while saturated.");
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "B done" }],
        warnings: [],
      };
    },
  });

  let cModelInvoked = false;
  const modelC = new MockLanguageModelV3({
    modelId: "mock-C",
    doGenerate: async () => {
      cModelInvoked = true;
      logger.error("[C] Model invoked (BUG): should have expired while saturated.");
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "C done" }],
        warnings: [],
      };
    },
  });

  const agentA = new Agent({
    name: "Saturation Timeout Sweep Agent A",
    instructions: "You are a test agent.",
    model: slowModelA as any,
  });

  const agentB = new Agent({
    name: "Saturation Timeout Sweep Agent B",
    instructions: "You are a test agent.",
    model: modelB as any,
  });

  const agentC = new Agent({
    name: "Saturation Timeout Sweep Agent C",
    instructions: "You are a test agent.",
    model: modelC as any,
  });

  let aFinishedAt: number | null = null;
  const requestA = agentA
    .generateText("request A (slow)", { tenantId: "tenant-1", taskType: "chat" })
    .then((result: unknown) => {
      aFinishedAt = Date.now();
      logger.info(`[A] finished at +${aFinishedAt - startedAt}ms`);
      return result;
    });

  logger.info(`[A] started at +${Date.now() - startedAt}ms`);

  await sleep(25);

  const bQueueWaitMs = 300;
  const cQueueWaitMs = 700;

  const requestB = agentB.generateText("request B (timeout 300ms)", {
    tenantId: "tenant-1",
    taskType: "chat",
    maxQueueWaitMs: bQueueWaitMs,
  });
  const requestC = agentC.generateText("request C (timeout 700ms)", {
    tenantId: "tenant-1",
    taskType: "chat",
    maxQueueWaitMs: cQueueWaitMs,
  });

  const settleWithTime = async (p: Promise<unknown>) => {
    const settledAtStart = Date.now();
    const settled = await p
      .then(() => ({ kind: "resolved" as const }))
      .catch((error: unknown) => ({ kind: "rejected" as const, error }));
    return { settled, elapsedMs: Date.now() - settledAtStart, atMs: Date.now() - startedAt };
  };

  const b = await settleWithTime(requestB);
  if (b.settled.kind === "resolved") {
    logger.error("[B] Unexpectedly resolved (BUG): should have timed out in queue.");
    process.exitCode = 1;
  } else if (b.settled.error instanceof QueueWaitTimeoutError) {
    logger.info(`[B] timed out at +${b.atMs}ms`, {
      waitedMs: b.settled.error.waitedMs,
      maxQueueWaitMs: b.settled.error.maxQueueWaitMs,
      deadlineAt: b.settled.error.deadlineAt,
    });
  } else {
    logger.error("[B] Failed with unexpected error", { error: b.settled.error });
    process.exitCode = 1;
  }

  const c = await settleWithTime(requestC);
  if (c.settled.kind === "resolved") {
    logger.error("[C] Unexpectedly resolved (BUG): should have timed out in queue.");
    process.exitCode = 1;
  } else if (c.settled.error instanceof QueueWaitTimeoutError) {
    logger.info(`[C] timed out at +${c.atMs}ms`, {
      waitedMs: c.settled.error.waitedMs,
      maxQueueWaitMs: c.settled.error.maxQueueWaitMs,
      deadlineAt: c.settled.error.deadlineAt,
    });
  } else {
    logger.error("[C] Failed with unexpected error", { error: c.settled.error });
    process.exitCode = 1;
  }

  if (c.atMs <= b.atMs) {
    logger.error("[order] C timed out before/at B (BUG)", { bAtMs: b.atMs, cAtMs: c.atMs });
    process.exitCode = 1;
  }

  if (b.atMs > bQueueWaitMs + 250) {
    logger.error("[B] Timeout happened too late (BUG)", { bAtMs: b.atMs, bQueueWaitMs });
    process.exitCode = 1;
  }
  if (c.atMs > cQueueWaitMs + 250) {
    logger.error("[C] Timeout happened too late (BUG)", { cAtMs: c.atMs, cQueueWaitMs });
    process.exitCode = 1;
  }

  if (
    aFinishedAt !== null &&
    (b.atMs >= aFinishedAt - startedAt || c.atMs >= aFinishedAt - startedAt)
  ) {
    logger.error("[timing] B/C settled after A finished (BUG)", {
      aFinishedAtMs: aFinishedAt - startedAt,
      bAtMs: b.atMs,
      cAtMs: c.atMs,
    });
    process.exitCode = 1;
  }

  if (bModelInvoked || cModelInvoked) {
    process.exitCode = 1;
  }

  if (logger.state.wakeupScheduled < 1) {
    logger.error("Expected at least one scheduled wakeup while saturated (BUG)", {
      wakeupScheduled: logger.state.wakeupScheduled,
    });
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
