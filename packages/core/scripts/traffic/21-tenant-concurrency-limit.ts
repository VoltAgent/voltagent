/**
 * Goal (one feature):
 * - `maxConcurrentPerTenant` should block additional requests from the same tenant,
 *   while allowing other tenants to proceed (given global capacity).
 *
 * How we test (public API only):
 * - Configure TrafficController:
 *   - maxConcurrent=10
 *   - maxConcurrentPerTenant=1
 * - Start A (tenant-1) and hold ~250ms.
 * - Enqueue B (tenant-1) and C (tenant-2) immediately after.
 * - Expect: C starts quickly; B starts only after A finishes.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/21-tenant-concurrency-limit.ts`
 */

const { getTrafficController } = require("../../dist/index.js");

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
    maxConcurrent: 10,
    maxConcurrentPerTenant: 1,
    logger: logger as any,
  });

  const startedAt = Date.now();
  let aFinishedAt: number | null = null;
  let bStartedAt: number | null = null;
  let cStartedAt: number | null = null;

  const a = controller.handleText({
    tenantId: "tenant-1",
    metadata: { provider: "mock-provider", model: "tc-A", taskType: "chat" },
    execute: async () => {
      logger.info(`[A] start +${Date.now() - startedAt}ms`);
      await sleep(250);
      aFinishedAt = Date.now();
      logger.info(`[A] finish +${aFinishedAt - startedAt}ms`);
      return "A ok";
    },
  });

  const b = controller.handleText({
    tenantId: "tenant-1",
    metadata: { provider: "mock-provider", model: "tc-B", taskType: "chat" },
    execute: async () => {
      bStartedAt = Date.now();
      logger.info(`[B] start +${bStartedAt - startedAt}ms`);
      return "B ok";
    },
  });

  const c = controller.handleText({
    tenantId: "tenant-2",
    metadata: { provider: "mock-provider", model: "tc-C", taskType: "chat" },
    execute: async () => {
      cStartedAt = Date.now();
      logger.info(`[C] start +${cStartedAt - startedAt}ms`);
      return "C ok";
    },
  });

  await Promise.allSettled([a, b, c]);

  if (aFinishedAt === null || bStartedAt === null || cStartedAt === null) {
    logger.error("Missing timestamps (BUG)", { aFinishedAt, bStartedAt, cStartedAt });
    process.exitCode = 1;
  } else {
    if (cStartedAt - startedAt > 150) {
      logger.error("C started too late (BUG): other tenant should not be blocked.", {
        cStartedAtMs: cStartedAt - startedAt,
      });
      process.exitCode = 1;
    }
    if (bStartedAt < aFinishedAt) {
      logger.error("B started before A finished (BUG): tenant concurrency violated.", {
        aFinishedAtMs: aFinishedAt - startedAt,
        bStartedAtMs: bStartedAt - startedAt,
      });
      process.exitCode = 1;
    }
  }

  process.exit(process.exitCode ?? 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
