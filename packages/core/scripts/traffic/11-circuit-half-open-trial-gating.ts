/**
 * Goal (one feature):
 * - Half-open trial gating:
 *   - when a circuit transitions to `half-open`, only ONE request should be allowed as the probe.
 *   - while that probe is in-flight (`trialInFlight`), additional requests for the same circuit key
 *     should wait (not dispatch).
 *
 * How we test (public API only):
 * - Use TrafficController directly so we can control failures and timings precisely.
 * - Configure:
 *   - maxConcurrent=2 (so concurrency doesn't prevent dispatching the 2nd request).
 *   - fallbackPolicy mode "wait" (so open/half-open wait doesn't reject).
 * - Trip the circuit open with 5 eligible failures (status=500).
 * - Wait ~5.2s so the probe interval elapses and the next evaluation transitions to half-open.
 * - Enqueue two "success" requests back-to-back for the same circuit key.
 * - Expect:
 *   - only the first success request starts immediately (marks trial in flight),
 *   - the second does not start until after the first completes.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/11-circuit-half-open-trial-gating.ts`
 */

const { getTrafficController } = require("../../dist/index.js");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type State = {
  sawHalfOpenTransition: boolean;
  sawMarkedTrial: boolean;
  sawWaitDuringHalfOpen: boolean;
};

function createDetectingLogger(name: string, state: State) {
  const write =
    (level: string) =>
    (msg: string, context?: Record<string, unknown>): void => {
      if (msg === "Circuit transitioned to half-open") {
        state.sawHalfOpenTransition = true;
      }
      if (msg === "Marked half-open trial in flight") {
        state.sawMarkedTrial = true;
      }
      if (msg === "Circuit open; waiting per fallback policy") {
        // In half-open + trialInFlight, this log still occurs (evaluation.allowRequest=false).
        // We'll treat it as a signal that the second request was blocked by the circuit.
        if (context?.circuitKey === "mock-provider::mock-half-open::taskType=chat") {
          state.sawWaitDuringHalfOpen = true;
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
  const state: State = {
    sawHalfOpenTransition: false,
    sawMarkedTrial: false,
    sawWaitDuringHalfOpen: false,
  };
  const logger = createDetectingLogger("traffic-demo", state);

  const provider = "mock-provider";
  const model = "mock-half-open";
  const circuitKey = `${provider}::${model}::taskType=chat`;

  const controller = getTrafficController({
    maxConcurrent: 2,
    logger: logger as any,
    fallbackPolicy: {
      defaultPolicyId: "wait-all",
      policies: {
        "wait-all": { mode: "wait" },
      },
    },
  });

  const startedAt = Date.now();

  // 1) Trip the circuit open (threshold=5 failures).
  for (let i = 1; i <= 5; i += 1) {
    const result = await controller
      .handleText({
        tenantId: "tenant-1",
        metadata: { provider, model, taskType: "chat" },
        execute: async () => {
          throw Object.assign(new Error("Synthetic 500 error"), { status: 500 });
        },
      })
      .then(() => ({ kind: "resolved" as const }))
      .catch((error: unknown) => ({ kind: "rejected" as const, error }));

    if (result.kind === "resolved") {
      logger.error(`[trip ${i}] Unexpectedly resolved (BUG)`);
      process.exitCode = 1;
      break;
    }
    logger.info(`[trip ${i}] failed as expected at +${Date.now() - startedAt}ms`);
  }

  // 2) Wait long enough that the circuit's probe interval elapses (default ~5000ms).
  logger.info("Waiting for probe interval (~5s)...");
  await sleep(5200);

  // 3) Enqueue two success requests back-to-back.
  let firstInvokedAt: number | null = null;
  let firstFinishedAt: number | null = null;
  let secondInvokedAt: number | null = null;

  const successExecute = async (label: "first" | "second") => {
    const now = Date.now();
    if (label === "first") {
      firstInvokedAt = now;
      logger.info(`[${label}] invoked at +${now - startedAt}ms`);
      await sleep(800);
      firstFinishedAt = Date.now();
      logger.info(`[${label}] finished at +${firstFinishedAt - startedAt}ms`);
      return "first ok";
    }
    secondInvokedAt = now;
    logger.info(`[${label}] invoked at +${now - startedAt}ms`);
    return "second ok";
  };

  const req1 = controller.handleText({
    tenantId: "tenant-1",
    metadata: { provider, model, taskType: "chat" },
    maxQueueWaitMs: 20_000,
    execute: () => successExecute("first"),
  });

  const req2 = controller.handleText({
    tenantId: "tenant-1",
    metadata: { provider, model, taskType: "chat" },
    maxQueueWaitMs: 20_000,
    execute: () => successExecute("second"),
  });

  const [r1, r2] = await Promise.allSettled([req1, req2]);

  if (r1.status !== "fulfilled") {
    logger.error("[first] did not fulfill (BUG)", {
      errorName: (r1.reason as { name?: unknown } | null)?.name,
      errorMessage: (r1.reason as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  }
  if (r2.status !== "fulfilled") {
    logger.error("[second] did not fulfill (BUG)", {
      errorName: (r2.reason as { name?: unknown } | null)?.name,
      errorMessage: (r2.reason as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  }

  if (!state.sawHalfOpenTransition) {
    logger.error('Did not observe "Circuit transitioned to half-open" (BUG)');
    process.exitCode = 1;
  }

  if (!state.sawMarkedTrial) {
    logger.error('Did not observe "Marked half-open trial in flight" (BUG)');
    process.exitCode = 1;
  }

  if (firstInvokedAt === null || firstFinishedAt === null || secondInvokedAt === null) {
    logger.error("Missing invoke/finish timestamps (BUG)", {
      firstInvokedAt,
      firstFinishedAt,
      secondInvokedAt,
    });
    process.exitCode = 1;
  } else if (secondInvokedAt < firstFinishedAt) {
    logger.error("Second request invoked before first trial finished (BUG)", {
      circuitKey,
      firstInvokedAtMs: firstInvokedAt - startedAt,
      firstFinishedAtMs: firstFinishedAt - startedAt,
      secondInvokedAtMs: secondInvokedAt - startedAt,
    });
    process.exitCode = 1;
  } else {
    logger.info("Half-open trial gating looks correct", {
      circuitKey,
      firstInvokedAtMs: firstInvokedAt - startedAt,
      firstFinishedAtMs: firstFinishedAt - startedAt,
      secondInvokedAtMs: secondInvokedAt - startedAt,
    });
  }

  // Optional: if we saw the "waiting per policy" log, it's extra confidence the second was blocked.
  if (!state.sawWaitDuringHalfOpen) {
    logger.warn("Did not observe circuit wait log for second request (may still be OK).");
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
