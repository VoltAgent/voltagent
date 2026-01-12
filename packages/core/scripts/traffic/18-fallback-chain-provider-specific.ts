/**
 * Goal (one feature):
 * - `resolveFallbackChain()` should prefer provider-specific chains (`provider::model`)
 *   over generic model chains (`model`).
 *
 * Code under test:
 * - `packages/core/src/traffic/traffic-circuit-breaker.ts:451` (`resolveFallbackChain`)
 *
 * How we test (public API only):
 * - Configure fallbackChains:
 *   - "model-X" -> ["generic-fallback"]
 *   - "mock-provider::model-X" -> ["provider-fallback"]
 * - Open the circuit for "mock-provider::model-X".
 * - Enqueue a request for model-X with `createFallbackRequest`.
 * - Expect it switches to "provider-fallback" (not "generic-fallback") and succeeds.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/18-fallback-chain-provider-specific.ts`
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
  const model = "model-X";
  const providerFallback = "provider-fallback";
  const genericFallback = "generic-fallback";

  const controller = getTrafficController({
    maxConcurrent: 2,
    logger: logger,
    fallbackChains: {
      // generic chain
      [model]: [genericFallback],
      // provider-specific chain (should win)
      [`${provider}::${model}`]: [providerFallback],
    },
  });

  const baseMetadata = { provider, taskType: "chat", tenantId: "tenant-1" };

  // Open the circuit for provider::model.
  for (let i = 0; i < 5; i += 1) {
    await controller
      .handleText({
        tenantId: "tenant-1",
        metadata: { ...baseMetadata, model },
        execute: async () => {
          throw Object.assign(new Error("Synthetic 500 error"), { status: 500 });
        },
      })
      .catch(() => {});
    await sleep(5);
  }

  const invoked = { [providerFallback]: 0, [genericFallback]: 0 };

  const result = await controller
    .handleText({
      tenantId: "tenant-1",
      metadata: { ...baseMetadata, model },
      maxQueueWaitMs: 15_000,
      createFallbackRequest: (target: unknown) => {
        const targetModel = typeof target === "string" ? target : (target as any)?.model;
        if (!targetModel) return undefined;
        return {
          tenantId: "tenant-1",
          metadata: { ...baseMetadata, model: targetModel },
          execute: async () => {
            if (targetModel === providerFallback) invoked[providerFallback] += 1;
            if (targetModel === genericFallback) invoked[genericFallback] += 1;
            return `ok-${targetModel}`;
          },
          maxQueueWaitMs: 15_000,
        };
      },
      execute: async () => "should-not-run-primary",
    })
    .then((value: unknown) => ({ kind: "resolved" as const, value }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  if (result.kind === "rejected") {
    logger.error("Unexpected rejection (BUG)", {
      errorName: result.error?.name,
      errorMessage: result.error?.message,
    });
    process.exitCode = 1;
  } else {
    logger.info("Resolved", { value: result.value });
  }

  if (invoked[providerFallback] !== 1 || invoked[genericFallback] !== 0) {
    logger.error("Expected provider-specific fallback to be chosen (BUG)", { invoked });
    process.exitCode = 1;
  } else {
    logger.info("Provider-specific fallback chain selected as expected", { invoked });
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
