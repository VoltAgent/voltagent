/**
 * Goal (one feature):
 * - Fallback chain selection should:
 *   1) skip fallbacks whose circuits are open, and
 *   2) prevent loops by tracking visited keys (won't re-select the same key).
 *
 * What we test:
 * - Configure fallback chains:
 *   - A -> [B, C]
 *   - B -> [A]   (creates a potential loop)
 * - Force circuits open for A and B.
 * - Enqueue a request targeting A with `createFallbackRequest` that can switch models.
 * - Expect: it selects C (since B is open, and A is visited / open), switches to C, and succeeds.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/14-fallback-chain-skip-open-and-prevent-loops.ts`
 */

const { getTrafficController } = require("../../dist/index.js");

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
  const modelA = "model-A";
  const modelB = "model-B";
  const modelC = "model-C";

  const controller = getTrafficController({
    maxConcurrent: 2,
    logger: logger as any,
    fallbackChains: {
      [`${provider}::${modelA}`]: [modelB, modelC],
      [`${provider}::${modelB}`]: [modelA],
    },
  });

  const baseMetadata = { provider, taskType: "chat", tenantId: "tenant-1" };

  // Helper to open a circuit for a given model by sending 5 eligible failures (status=500).
  const openCircuit = async (model: string) => {
    for (let i = 0; i < 5; i += 1) {
      await controller
        .handleText({
          tenantId: "tenant-1",
          metadata: { ...baseMetadata, model },
          execute: async () => {
            throw Object.assign(new Error(`Synthetic 500 for ${model}`), { status: 500 });
          },
        })
        .catch(() => {});
    }
  };

  await openCircuit(modelA);
  await openCircuit(modelB);

  const invoked: Record<string, number> = { [modelA]: 0, [modelB]: 0, [modelC]: 0 };

  const executeByModel = async (model: string) => {
    invoked[model] = (invoked[model] ?? 0) + 1;
    if (model === modelC) {
      await sleep(10);
      return `ok-${modelC}`;
    }
    throw Object.assign(new Error(`Should not execute ${model} when its circuit is open`), {
      status: 500,
    });
  };

  const result = await controller
    .handleText({
      tenantId: "tenant-1",
      metadata: { ...baseMetadata, model: modelA },
      maxQueueWaitMs: 15_000,
      createFallbackRequest: (target: unknown) => {
        const targetModel = typeof target === "string" ? target : (target as any)?.model;
        if (!targetModel) return undefined;
        return {
          tenantId: "tenant-1",
          metadata: { ...baseMetadata, model: targetModel },
          execute: () => executeByModel(targetModel),
          maxQueueWaitMs: 15_000,
        };
      },
      execute: () => executeByModel(modelA),
    })
    .then((value: unknown) => ({ kind: "resolved" as const, value }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  if (result.kind === "rejected") {
    logger.error("Unexpected rejection (BUG)", {
      errorName: (result.error as { name?: unknown } | null)?.name,
      errorMessage: (result.error as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  } else {
    logger.info("Resolved", { value: result.value });
  }

  if (invoked[modelC] !== 1) {
    logger.error("Expected fallback to execute model C exactly once (BUG)", { invoked });
    process.exitCode = 1;
  } else {
    logger.info("Fallback chain selection looks correct", { invoked });
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
