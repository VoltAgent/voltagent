/**
 * Goal (one feature):
 * - Circuit opens after repeated eligible failures, and subsequent requests are rejected fast
 *   with `CircuitBreakerOpenError` when no fallback is available.
 *
 * How we test (public API only):
 * - Configure TrafficController with defaults (circuit thresholds from constants).
 * - Send 5 failing requests (status=500) for the same provider/model key within the window.
 * - Then send a 6th request and expect immediate `CircuitBreakerOpenError` (no model invocation).
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/08-circuit-open-reject.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { CircuitBreakerOpenError, getTrafficController, Agent } = require("../../dist/index.js");

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

  getTrafficController({
    maxConcurrent: 3,
    logger: logger as any,
  });

  const startedAt = Date.now();

  let modelInvocations = 0;
  const failingModel = new MockLanguageModelV3({
    modelId: "mock-circuit",
    doGenerate: async () => {
      modelInvocations += 1;
      const error = Object.assign(new Error("Synthetic 500 error"), { status: 500 });
      throw error;
    },
  });

  const agent = new Agent({
    name: "Circuit Open Reject Demo Agent",
    instructions: "You are a test agent.",
    model: failingModel as any,
  });

  const failureCountToOpen = 5;
  for (let i = 1; i <= failureCountToOpen; i += 1) {
    const result = await agent
      .generateText(`failing request ${i}`, { tenantId: "tenant-1", taskType: "chat" })
      .then(() => ({ kind: "resolved" as const }))
      .catch((error: unknown) => ({ kind: "rejected" as const, error }));

    if (result.kind === "resolved") {
      logger.error(`[${i}] Unexpectedly resolved (BUG): request should fail.`);
      process.exitCode = 1;
      break;
    }
    logger.info(`[${i}] failed as expected at +${Date.now() - startedAt}ms`, {
      errorName: (result.error as { name?: unknown } | null)?.name,
      status: (result.error as { status?: unknown } | null)?.status,
    });
  }

  const invocationsBeforeProbe = modelInvocations;

  // Small delay to allow logs to flush; should still be well within the failure window.
  await sleep(25);

  const probe = await agent
    .generateText("probe after open", { tenantId: "tenant-1", taskType: "chat" })
    .then(() => ({ kind: "resolved" as const }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  if (probe.kind === "resolved") {
    logger.error("[probe] Unexpectedly resolved (BUG): should be blocked by circuit.");
    process.exitCode = 1;
  } else if (probe.error instanceof CircuitBreakerOpenError) {
    logger.info(`[probe] blocked by circuit at +${Date.now() - startedAt}ms (expected)`, {
      retryAfterMs: probe.error.retryAfterMs,
    });
  } else {
    logger.error("[probe] rejected with unexpected error (BUG)", {
      errorName: (probe.error as { name?: unknown } | null)?.name,
      errorMessage: (probe.error as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  }

  if (modelInvocations !== invocationsBeforeProbe) {
    logger.error("[probe] Model was invoked even though circuit should be open (BUG)", {
      invocationsBeforeProbe,
      modelInvocations,
    });
    process.exitCode = 1;
  }

  logger.info("Done.", { modelInvocations });
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
