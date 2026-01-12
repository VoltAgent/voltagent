/**
 * Goal (one feature):
 * - Adaptive limiter blocks (waits) after `threshold` rate-limit hits within `windowMs`.
 *
 * How we test (public API only):
 * - Configure TrafficController with adaptiveLimiter: threshold=2, minPenaltyMs=200.
 * - Trigger 2 rate-limit hits via `reportStreamFailure` with `RateLimitedUpstreamError`
 *   (avoids retries and avoids opening the circuit breaker).
 * - Then send a 3rd request that should be delayed by the adaptive limiter and then succeed.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/24-adaptive-threshold-enforces-wait.ts`
 */

const { getTrafficController, RateLimitedUpstreamError } = require("../../dist/index.js");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function createLeanLogger(name: string) {
  const write =
    (level: string) =>
    (msg: string, context?: object): void => {
      const prefix = `[${name}] [${level}]`;
      if (context) return void console.info(prefix, msg, context);
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
    maxConcurrent: 5,
    logger: logger as any,
    adaptiveLimiter: {
      windowMs: 10_000,
      threshold: 2,
      minPenaltyMs: 200,
      maxPenaltyMs: 1000,
      penaltyMultiplier: 2,
      decayMs: 500,
    },
  });

  const metadata = {
    provider: "mock-provider",
    model: "adaptive-model",
    taskType: "chat",
    tenantId: "tenant-1",
  };

  controller.reportStreamFailure(metadata, new RateLimitedUpstreamError("429", metadata, 0));
  controller.reportStreamFailure(metadata, new RateLimitedUpstreamError("429", metadata, 0));

  const startedAt = Date.now();
  const res = await controller
    .handleText({
      tenantId: "tenant-1",
      metadata,
      maxQueueWaitMs: 5000,
      execute: async () => {
        await sleep(5);
        return "ok";
      },
    })
    .then((value: unknown) => ({ kind: "resolved" as const, value }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));
  const elapsedMs = Date.now() - startedAt;

  if (res.kind === "rejected") {
    logger.error("Unexpected rejection (BUG)", {
      errorName: (res.error as { name?: unknown } | null)?.name,
      errorMessage: (res.error as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  } else {
    logger.info("Resolved", { value: res.value, elapsedMs });
    if (elapsedMs < 150) {
      logger.error("Resolved too quickly (BUG): expected adaptive wait.", { elapsedMs });
      process.exitCode = 1;
    }
  }

  process.exit(process.exitCode ?? 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
