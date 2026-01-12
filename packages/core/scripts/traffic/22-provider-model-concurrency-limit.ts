/**
 * Goal (one feature):
 * - `maxConcurrentPerProviderModel` should block additional requests for the same provider+model
 *   even across tenants, while allowing different models to proceed.
 *
 * How we test (public API only):
 * - Configure TrafficController:
 *   - maxConcurrent=10
 *   - maxConcurrentPerProviderModel=1
 * - Start A (tenant-1, model=X) and hold ~250ms.
 * - Enqueue B (tenant-2, model=X) and C (tenant-3, model=Y).
 * - Expect: C starts quickly; B starts only after A finishes.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/22-provider-model-concurrency-limit.ts`
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
    maxConcurrentPerProviderModel: 1,
    logger: logger as any,
  });

  const startedAt = Date.now();
  let aFinishedAt: number | null = null;
  let bStartedAt: number | null = null;
  let cStartedAt: number | null = null;

  const provider = "mock-provider";
  const modelX = "pm-X";
  const modelY = "pm-Y";

  const a = controller.handleText({
    tenantId: "tenant-1",
    metadata: { provider, model: modelX, taskType: "chat" },
    execute: async () => {
      logger.info(`[A] start +${Date.now() - startedAt}ms`);
      await sleep(250);
      aFinishedAt = Date.now();
      logger.info(`[A] finish +${aFinishedAt - startedAt}ms`);
      return "A ok";
    },
  });

  const b = controller.handleText({
    tenantId: "tenant-2",
    metadata: { provider, model: modelX, taskType: "chat" },
    execute: async () => {
      bStartedAt = Date.now();
      logger.info(`[B] start +${bStartedAt - startedAt}ms`);
      return "B ok";
    },
  });

  const c = controller.handleText({
    tenantId: "tenant-3",
    metadata: { provider, model: modelY, taskType: "chat" },
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
    if (cStartedAt - startedAt > 200) {
      logger.error("C started too late (BUG): different model should not be blocked.", {
        cStartedAtMs: cStartedAt - startedAt,
      });
      process.exitCode = 1;
    }
    if (bStartedAt < aFinishedAt) {
      logger.error("B started before A finished (BUG): provider/model concurrency violated.", {
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
