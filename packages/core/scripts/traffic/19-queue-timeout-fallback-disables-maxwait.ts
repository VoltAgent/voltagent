/**
 * Goal (one feature):
 * - When a queue-timeout fallback is applied, the controller should disable `maxQueueWaitMs`
 *   for the remainder of that queued item (`queueTimeoutDisabled = true`), so it won't immediately
 *   re-timeout after switching to fallback.
 *
 * Code under test:
 * - `packages/core/src/traffic/traffic-controller.ts:858` -> `TrafficCircuitBreaker.tryFallback(..., "queue-timeout")`
 * - `packages/core/src/traffic/traffic-circuit-breaker.ts:354` (`applyFallbackRequest` sets `queueTimeoutDisabled`)
 * - `packages/core/src/traffic/traffic-controller.ts:831` (`resolveQueueTimeoutAt` honors `queueTimeoutDisabled`)
 *
 * How we test (public API only):
 * - maxConcurrent=1, start request A (holds slot ~300ms).
 * - Enqueue request B with:
 *   - `maxQueueWaitMs = 50` (would normally reject quickly),
 *   - `deadlineAt = now + 2000` (so it can still run later),
 *   - `createFallbackRequest` that switches to a fast fallback model.
 * - Configure fallbackChains so the queue-timeout handler can find a fallback.
 *
 * Expect:
 * - B should NOT reject with QueueWaitTimeoutError at ~50ms.
 * - After ~300ms when A completes, B should dispatch using the fallback model and resolve.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/19-queue-timeout-fallback-disables-maxwait.ts`
 */

const { getTrafficController, QueueWaitTimeoutError } = require("../../dist/index.js");

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

  const provider = "mock-provider";
  const primaryModel = "qt-primary";
  const fallbackModel = "qt-fallback";
  const chainKey = `${provider}::${primaryModel}`;

  const controller = getTrafficController({
    maxConcurrent: 1,
    logger: logger,
    fallbackChains: {
      [chainKey]: [fallbackModel],
    },
  });

  const startedAt = Date.now();

  // A holds the only slot for ~300ms.
  const requestA = controller.handleText({
    tenantId: "tenant-1",
    metadata: { provider, model: "qt-holder", taskType: "chat" },
    execute: async () => {
      await sleep(300);
      return "A done";
    },
  });
  logger.info(`[A] started at +${Date.now() - startedAt}ms`);

  // B is queued and would "timeout" at 50ms, but should fallback and then continue waiting until A releases.
  const deadlineAt = Date.now() + 2000;
  const bResult = await controller
    .handleText({
      tenantId: "tenant-1",
      metadata: { provider, model: primaryModel, taskType: "chat" },
      maxQueueWaitMs: 50,
      deadlineAt,
      createFallbackRequest: (target: unknown) => {
        const targetModel = typeof target === "string" ? target : (target as any)?.model;
        if (!targetModel) return undefined;
        return {
          tenantId: "tenant-1",
          metadata: { provider, model: targetModel, taskType: "chat" },
          deadlineAt,
          // no maxQueueWaitMs here; but even if original was tiny, queueTimeoutDisabled should ignore it.
          execute: async () => `B done via ${targetModel}`,
        };
      },
      execute: async () => "B done via primary (should not run)",
    })
    .then((value: unknown) => ({ kind: "resolved" as const, value }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  const bAtMs = Date.now() - startedAt;

  if (bResult.kind === "rejected") {
    if (bResult.error instanceof QueueWaitTimeoutError) {
      logger.error(
        "[B] Unexpected QueueWaitTimeoutError (BUG): fallback should have disabled maxQueueWaitMs.",
        {
          waitedMs: bResult.error.waitedMs,
          maxQueueWaitMs: bResult.error.maxQueueWaitMs,
          deadlineAt: bResult.error.deadlineAt,
        },
      );
    } else {
      logger.error("[B] Unexpected rejection (BUG)", {
        errorName: bResult.error?.name,
        errorMessage: bResult.error?.message,
      });
    }
    process.exitCode = 1;
  } else {
    logger.info(`[B] resolved at +${bAtMs}ms`, { value: bResult.value });
    if (bAtMs < 200) {
      logger.error("[B] Resolved too early (BUG): expected to wait for A to release slot.", {
        bAtMs,
      });
      process.exitCode = 1;
    }
    if (!String(bResult.value).includes(fallbackModel)) {
      logger.error("[B] Did not run via fallback model (BUG)", { value: bResult.value });
      process.exitCode = 1;
    }
  }

  await requestA.catch(() => {});
  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
