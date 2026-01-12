/**
 * Goal (one feature):
 * - Global `maxConcurrent` should prevent parallel execution beyond the limit.
 *
 * How we test (public API only):
 * - Configure TrafficController: maxConcurrent=1.
 * - Enqueue two requests for different tenants so no tenant/provider limit interferes.
 * - Expect: request B does not start until A finishes.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/20-global-maxconcurrent-no-parallel.ts`
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
  const controller = getTrafficController({ maxConcurrent: 1, logger: logger as any });

  const startedAt = Date.now();
  let aStartedAt: number | null = null;
  let aFinishedAt: number | null = null;
  let bStartedAt: number | null = null;

  const a = controller.handleText({
    tenantId: "tenant-1",
    metadata: { provider: "mock-provider", model: "mc-A", taskType: "chat" },
    execute: async () => {
      aStartedAt = Date.now();
      logger.info(`[A] execute start +${aStartedAt - startedAt}ms`);
      await sleep(250);
      aFinishedAt = Date.now();
      logger.info(`[A] execute finish +${aFinishedAt - startedAt}ms`);
      return "A ok";
    },
  });

  const b = controller.handleText({
    tenantId: "tenant-2",
    metadata: { provider: "mock-provider", model: "mc-B", taskType: "chat" },
    execute: async () => {
      bStartedAt = Date.now();
      logger.info(`[B] execute start +${bStartedAt - startedAt}ms`);
      return "B ok";
    },
  });

  const [ra, rb] = await Promise.allSettled([a, b]);

  if (ra.status !== "fulfilled" || rb.status !== "fulfilled") {
    logger.error("Unexpected rejection (BUG)", { ra, rb });
    process.exitCode = 1;
  }

  if (aStartedAt === null || aFinishedAt === null || bStartedAt === null) {
    logger.error("Missing timestamps (BUG)", { aStartedAt, aFinishedAt, bStartedAt });
    process.exitCode = 1;
  } else if (bStartedAt < aFinishedAt) {
    logger.error("B started before A finished (BUG): maxConcurrent violated.", {
      aStartedAtMs: aStartedAt - startedAt,
      aFinishedAtMs: aFinishedAt - startedAt,
      bStartedAtMs: bStartedAt - startedAt,
    });
    process.exitCode = 1;
  } else {
    logger.info("maxConcurrent enforced as expected");
  }

  process.exit(process.exitCode ?? 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
