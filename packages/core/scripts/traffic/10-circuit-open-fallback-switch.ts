/**
 * Goal (one feature):
 * - When the circuit is open and fallback policy is `mode: "fallback"`, the request should be
 *   switched to a fallback target via `createFallbackRequest` and then dispatched successfully.
 *
 * What we verify in logs:
 * - "Circuit open; attempting fallback"
 * - "Selected fallback target" (or short-response fallback)
 * - "Switched to fallback request"
 * - The actual model invocation happens on the fallback modelId (not the primary).
 *
 * How we test (public API only):
 * - Use TrafficController directly so we can provide `createFallbackRequest` (Agent API doesn't expose it).
 * - Configure fallbackChains: `mock-provider::primary-model -> secondary-model`.
 * - Trip the circuit open for the primary key with 5 eligible failures.
 * - Enqueue one request that targets primary-model, with a `createFallbackRequest` implementation that
 *   swaps `metadata.model` and the `execute` function to call the fallback model.
 * - Expect the request resolves, and fallback model invocation count increments.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/10-circuit-open-fallback-switch.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { getTrafficController, CircuitBreakerOpenError } = require("../../dist/index.js");

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
  const primaryModel = "primary-model";
  const fallbackModel = "secondary-model";

  const controller = getTrafficController({
    maxConcurrent: 2,
    logger: logger as any,
    // Explicit fallback chain for the primary model.
    fallbackChains: {
      [`${provider}::${primaryModel}`]: [fallbackModel],
    },
  });

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  let primaryInvoked = 0;
  const primary = new MockLanguageModelV3({
    modelId: primaryModel,
    doGenerate: async () => {
      primaryInvoked += 1;
      throw Object.assign(new Error("Synthetic 500 error"), { status: 500 });
    },
  });

  let fallbackInvoked = 0;
  const secondary = new MockLanguageModelV3({
    modelId: fallbackModel,
    doGenerate: async () => {
      fallbackInvoked += 1;
      await sleep(10);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "fallback ok" }],
        warnings: [],
      };
    },
  });

  const baseMetadata = {
    provider,
    taskType: "chat",
    priority: "P1",
    tenantId: "tenant-1",
  };

  // 1) Trip the circuit open for primary: 5 eligible failures.
  for (let i = 1; i <= 5; i += 1) {
    const result = await controller
      .handleText({
        tenantId: "tenant-1",
        metadata: { ...baseMetadata, model: primaryModel },
        execute: async () => {
          const out = await primary.doGenerate();
          return out.content?.[0]?.text ?? "ok";
        },
      })
      .then(() => ({ kind: "resolved" as const }))
      .catch((error: unknown) => ({ kind: "rejected" as const, error }));

    if (result.kind === "resolved") {
      logger.error(`[trip ${i}] Unexpectedly resolved (BUG): should fail.`);
      process.exitCode = 1;
      break;
    }
    if (result.error instanceof CircuitBreakerOpenError) {
      logger.error(`[trip ${i}] Circuit opened earlier than expected (BUG)`, {
        retryAfterMs: result.error.retryAfterMs,
      });
      process.exitCode = 1;
      break;
    }
    logger.info(`[trip ${i}] failed as expected`);
  }

  // 2) Now enqueue a request that should be switched to fallback (not rejected).
  const switched = await controller
    .handleText({
      tenantId: "tenant-1",
      metadata: { ...baseMetadata, model: primaryModel },
      maxQueueWaitMs: 15_000,
      createFallbackRequest: (target: unknown) => {
        // Target should be `secondary-model` (string) based on our chain.
        const targetModel = typeof target === "string" ? target : (target as any)?.model;
        if (!targetModel) return undefined;
        return {
          tenantId: "tenant-1",
          metadata: { ...baseMetadata, model: targetModel },
          execute: async () => {
            const out = await secondary.doGenerate();
            return out.content?.[0]?.text ?? "fallback ok";
          },
          // Keep the same queue timeout settings for the fallback attempt.
          maxQueueWaitMs: 15_000,
        };
      },
      execute: async () => {
        const out = await primary.doGenerate();
        return out.content?.[0]?.text ?? "primary ok";
      },
    })
    .then((value: unknown) => ({ kind: "resolved" as const, value }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  if (switched.kind === "rejected") {
    logger.error("[switch] Unexpected rejection (BUG)", {
      errorName: (switched.error as { name?: unknown } | null)?.name,
      errorMessage: (switched.error as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  } else {
    logger.info("[switch] Resolved", { value: switched.value });
  }

  if (fallbackInvoked < 1) {
    logger.error("[switch] Fallback model was not invoked (BUG)", {
      primaryInvoked,
      fallbackInvoked,
    });
    process.exitCode = 1;
  } else {
    logger.info("[ok] Fallback invoked", { primaryInvoked, fallbackInvoked });
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
