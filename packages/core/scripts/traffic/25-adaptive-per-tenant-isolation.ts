/**
 * Goal (one feature):
 * - Adaptive limiter keying is per-tenant by default, so tenant-1 rate-limit hits
 *   should not block tenant-2.
 *
 * How we test:
 * - Configure adaptiveLimiter threshold=2, minPenaltyMs=200.
 * - Trigger 2 rate-limit hits for tenant-1 via `reportStreamFailure`.
 * - Then run:
 *   - request A for tenant-2 should start immediately (no adaptive wait).
 *   - request B for tenant-1 should be delayed by adaptive wait.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/25-adaptive-per-tenant-isolation.ts`
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

  const baseMetadata = { provider: "mock-provider", model: "adaptive-tenant", taskType: "chat" };
  const tenant1Metadata = { ...baseMetadata, tenantId: "tenant-1" };
  controller.reportStreamFailure(
    tenant1Metadata,
    new RateLimitedUpstreamError("429", tenant1Metadata, 0),
  );
  controller.reportStreamFailure(
    tenant1Metadata,
    new RateLimitedUpstreamError("429", tenant1Metadata, 0),
  );

  const startedAt = Date.now();
  let t2ExecutedAt: number | null = null;
  let t1ExecutedAt: number | null = null;

  const t2 = controller.handleText({
    tenantId: "tenant-2",
    metadata: { ...baseMetadata, tenantId: "tenant-2" },
    maxQueueWaitMs: 5000,
    execute: async () => {
      t2ExecutedAt = Date.now();
      logger.info(`[tenant-2] execute +${t2ExecutedAt - startedAt}ms`);
      return "t2 ok";
    },
  });

  const t1 = controller.handleText({
    tenantId: "tenant-1",
    metadata: tenant1Metadata,
    maxQueueWaitMs: 5000,
    execute: async () => {
      t1ExecutedAt = Date.now();
      logger.info(`[tenant-1] execute +${t1ExecutedAt - startedAt}ms`);
      await sleep(5);
      return "t1 ok";
    },
  });

  await Promise.allSettled([t2, t1]);

  if (t2ExecutedAt === null || t1ExecutedAt === null) {
    logger.error("Missing timestamps (BUG)", { t2ExecutedAt, t1ExecutedAt });
    process.exitCode = 1;
  } else {
    const t2Ms = t2ExecutedAt - startedAt;
    const t1Ms = t1ExecutedAt - startedAt;
    if (t2Ms > 100) {
      logger.error("tenant-2 executed too late (BUG): should not be adaptively blocked.", { t2Ms });
      process.exitCode = 1;
    }
    if (t1Ms < 150) {
      logger.error("tenant-1 executed too early (BUG): expected adaptive wait.", { t1Ms });
      process.exitCode = 1;
    }
  }

  process.exit(process.exitCode ?? 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
