/**
 * Goal (one feature):
 * - After adaptive cooldown has applied, a subsequent success should start clearing adaptive state.
 *   Practically: once the cooldown has elapsed and a request succeeds, the next request should not be delayed.
 *
 * How we test:
 * - adaptiveLimiter threshold=2, minPenaltyMs=200.
 * - Trigger 2 rate-limit hits for tenant-1 via `reportStreamFailure`.
 * - Run request X (tenant-1) that waits and succeeds (this should call recordSuccess).
 * - Immediately run request Y (tenant-1) and ensure it starts quickly (no fresh wait).
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/26-adaptive-success-clears-cooldown.ts`
 */

const { getTrafficController, RateLimitedUpstreamError } = require("../../dist/index.js");

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
      decayMs: 200,
    },
  });

  const metadata = {
    provider: "mock-provider",
    model: "adaptive-clear",
    taskType: "chat",
    tenantId: "tenant-1",
  };
  controller.reportStreamFailure(metadata, new RateLimitedUpstreamError("429", metadata, 0));
  controller.reportStreamFailure(metadata, new RateLimitedUpstreamError("429", metadata, 0));

  const xStart = Date.now();
  await controller.handleText({
    tenantId: "tenant-1",
    metadata,
    maxQueueWaitMs: 5000,
    execute: async () => "x ok",
  });
  const xElapsed = Date.now() - xStart;
  logger.info("X done", { elapsedMs: xElapsed });
  if (xElapsed < 150) {
    logger.error("X resolved too quickly (BUG): expected adaptive wait.", { xElapsed });
    process.exitCode = 1;
  }

  const yStart = Date.now();
  await controller.handleText({
    tenantId: "tenant-1",
    metadata,
    maxQueueWaitMs: 5000,
    execute: async () => "y ok",
  });
  const yElapsed = Date.now() - yStart;
  logger.info("Y done", { elapsedMs: yElapsed });
  if (yElapsed > 100) {
    logger.error(
      "Y was delayed unexpectedly (BUG): adaptive should be cleared/reduced after success.",
      {
        yElapsed,
      },
    );
    process.exitCode = 1;
  }

  process.exit(process.exitCode ?? 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
