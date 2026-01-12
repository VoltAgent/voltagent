/**
 * Goal (one feature):
 * - Rate limiter wakeups should coalesce to the earliest `wakeUpAt`.
 *
 * Scenario:
 * - Request A is rate-limited with a long retry-after (~2s) -> schedules wakeup far in the future.
 * - Request B is rate-limited with a short retry-after (~200ms) -> should reschedule wakeup earlier.
 *
 * Expectations (via logs + timings):
 * - B dispatches around ~200ms (not delayed until A's ~2s wakeup).
 * - A dispatches around ~2s.
 *
 * Run:
 * - `pnpm ts-node scripts/traffic/27-rate-limit-wakeup-coalescing.ts`
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
  const controller = getTrafficController({
    maxConcurrent: 10,
    logger: logger as any,
  });

  const startedAt = Date.now();
  const now = startedAt;

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const modelAId = "mock-rl-coalesce-A";
  const modelBId = "mock-rl-coalesce-B";

  // Seed cooldowns through the public API (simulating response headers).
  controller.updateRateLimitFromHeaders(
    {
      tenantId: "tenant-1",
      provider: "mock-provider",
      model: modelAId,
      taskType: "chat",
      priority: "P1",
    },
    { "retry-after": "2" },
  );

  controller.updateRateLimitFromHeaders(
    {
      tenantId: "tenant-1",
      provider: "mock-provider",
      model: modelBId,
      taskType: "chat",
      priority: "P1",
    },
    { "retry-after": "0.2" },
  );

  let invokedAAt: number | null = null;
  let invokedBAt: number | null = null;

  const modelA = new MockLanguageModelV3({
    modelId: modelAId,
    doGenerate: async () => {
      invokedAAt = Date.now();
      logger.info(`[A] model invoked at +${invokedAAt - startedAt}ms`);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "A ok" }],
        warnings: [],
      };
    },
  });

  const modelB = new MockLanguageModelV3({
    modelId: modelBId,
    doGenerate: async () => {
      invokedBAt = Date.now();
      logger.info(`[B] model invoked at +${invokedBAt - startedAt}ms`);
      await sleep(20);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "B ok" }],
        warnings: [],
      };
    },
  });

  const agentA = new Agent({
    name: "Rate Limit Coalescing Agent A",
    instructions: "You are a test agent.",
    model: modelA as any,
  });

  const agentB = new Agent({
    name: "Rate Limit Coalescing Agent B",
    instructions: "You are a test agent.",
    model: modelB as any,
  });

  const reqA = agentA.generateText("request A (retry-after 2s)", {
    tenantId: "tenant-1",
    taskType: "chat",
  });
  logger.info(`[A] enqueued at +${Date.now() - startedAt}ms`);

  // Small delay so A schedules the first (long) wakeup before B enqueues.
  await sleep(10);

  const reqB = agentB.generateText("request B (retry-after 200ms)", {
    // Different tenant so the scheduler can evaluate B while A is still waiting.
    // (Same-tenant FIFO would keep B behind A and hide the wakeup-coalescing behavior.)
    tenantId: "tenant-2",
    taskType: "chat",
  });
  logger.info(`[B] enqueued at +${Date.now() - startedAt}ms`);

  await Promise.allSettled([reqA, reqB]);

  if (invokedAAt === null) {
    logger.error("[A] did not invoke model (BUG)");
    process.exitCode = 1;
  }
  if (invokedBAt === null) {
    logger.error("[B] did not invoke model (BUG)");
    process.exitCode = 1;
  }

  if (invokedAAt !== null && invokedBAt !== null) {
    const aMs = invokedAAt - startedAt;
    const bMs = invokedBAt - startedAt;
    if (bMs > 1200) {
      logger.error("[B] invoked too late (BUG): wakeup was not coalesced to earliest.", {
        invokedAAtMs: aMs,
        invokedBAtMs: bMs,
        expectedBWakeupMsApprox: 200,
        retryAfterASeconds: 2,
        retryAfterBSeconds: 0.2,
        now,
      });
      process.exitCode = 1;
    } else if (aMs < 1500) {
      logger.error("[A] invoked too early (BUG): expected retry-after ~2s.", {
        invokedAAtMs: aMs,
        invokedBAtMs: bMs,
        retryAfterASeconds: 2,
        now,
      });
      process.exitCode = 1;
    } else {
      logger.info("[ok] wakeup coalesced to earliest and both eventually dispatched", {
        invokedAAtMs: aMs,
        invokedBAtMs: bMs,
      });
    }
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
