/**
 * Goal (one feature):
 * - Timeouts should be eligible for circuit breaker opening even without status codes.
 *   (`recordFailure()` treats status=408 OR `isTimeoutError(error)` as timeout-eligible.)
 *
 * How we test (public API only):
 * - Send requests that fail with a "timeout" error (message contains "timed out"), same circuit key.
 * - Note: TrafficController has built-in retry for timeouts, so each user request may produce
 *   multiple failure observations; the circuit can open in fewer than 5 user requests.
 * - Expect:
 *   - We observe "Circuit opened" with openReasons including "timeout-threshold".
 *   - A subsequent request is blocked by `CircuitBreakerOpenError` without invoking the model.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/12-circuit-timeout-threshold-open.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { CircuitBreakerOpenError, getTrafficController, Agent } = require("../../dist/index.js");

type State = { sawCircuitOpened: boolean; sawTimeoutThreshold: boolean };

function createDetectingLogger(name: string, state: State) {
  const write =
    (level: string) =>
    (msg: string, context?: Record<string, unknown>): void => {
      if (msg === "Circuit opened") {
        state.sawCircuitOpened = true;
        const openReasons = context?.openReasons;
        if (Array.isArray(openReasons) && openReasons.includes("timeout-threshold")) {
          state.sawTimeoutThreshold = true;
        }
      }
      const prefix = `[${name}] [${level}]`;
      if (context) {
        console.info(prefix, msg, context);
        return;
      }
      console.info(prefix, msg);
    };

  return {
    child: (bindings?: Record<string, unknown>) =>
      createDetectingLogger(
        bindings
          ? `${name} ${Object.entries(bindings)
              .map(([k, v]) => `${k}=${String(v)}`)
              .join(" ")}`
          : name,
        state,
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
  const state: State = { sawCircuitOpened: false, sawTimeoutThreshold: false };
  const logger = createDetectingLogger("traffic-demo", state);

  getTrafficController({
    maxConcurrent: 3,
    logger: logger as any,
  });

  let modelInvocations = 0;
  const timeoutModel = new MockLanguageModelV3({
    modelId: "mock-timeout-circuit",
    doGenerate: async () => {
      modelInvocations += 1;
      const error = Object.assign(new Error("Request timed out"), { code: "ETIMEDOUT" });
      throw error;
    },
  });

  const agent = new Agent({
    name: "Circuit Timeout Threshold Demo Agent",
    instructions: "You are a test agent.",
    model: timeoutModel as any,
  });

  // Keep sending timeout requests until the circuit blocks us (or we hit a cap).
  let blockedAt: number | undefined;
  for (let i = 1; i <= 10; i += 1) {
    const result = await agent
      .generateText(`timeout request ${i}`, { tenantId: "tenant-1", taskType: "chat" })
      .then(() => ({ kind: "resolved" as const }))
      .catch((error: unknown) => ({ kind: "rejected" as const, error }));

    if (result.kind === "resolved") {
      logger.error(`[${i}] Unexpectedly resolved (BUG): should time out or be blocked.`);
      process.exitCode = 1;
      break;
    }

    if (result.error instanceof CircuitBreakerOpenError) {
      blockedAt = i;
      logger.info(`[${i}] blocked by circuit (expected)`, {
        retryAfterMs: result.error.retryAfterMs,
      });
      break;
    }

    logger.info(`[${i}] timed out as expected`, {
      errorName: (result.error as { name?: unknown } | null)?.name,
      errorCode: (result.error as { code?: unknown } | null)?.code,
      errorMessage: (result.error as { message?: unknown } | null)?.message,
    });
  }

  const invocationsBeforeProbe = modelInvocations;

  if (!state.sawCircuitOpened) {
    logger.error('Did not observe "Circuit opened" log (BUG)');
    process.exitCode = 1;
  } else if (!state.sawTimeoutThreshold) {
    logger.error('Circuit opened but not due to "timeout-threshold" (BUG)');
    process.exitCode = 1;
  }

  if (blockedAt === undefined) {
    logger.error("Did not observe circuit blocking within 10 requests (BUG)");
    process.exitCode = 1;
  }

  const probe = await agent
    .generateText("probe after timeout-open", { tenantId: "tenant-1", taskType: "chat" })
    .then(() => ({ kind: "resolved" as const }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  if (probe.kind === "resolved") {
    logger.error("[probe] Unexpectedly resolved (BUG): should be blocked by circuit.");
    process.exitCode = 1;
  } else if (probe.error instanceof CircuitBreakerOpenError) {
    logger.info("[probe] blocked by circuit as expected", {
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
