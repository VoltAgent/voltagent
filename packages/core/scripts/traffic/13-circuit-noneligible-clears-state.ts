/**
 * Goal (one feature):
 * - A non-eligible failure (e.g. status=400) should clear circuit state for the key.
 *
 * What we test:
 * 1) Open the circuit by triggering eligible failures (status=500).
 * 2) Confirm a request is blocked by the open circuit (`CircuitBreakerOpenError`).
 * 3) Trigger a non-eligible failure (status=400) and confirm the circuit-breaker logs:
 *    "Failure not eligible for circuit breaker; cleared circuit state".
 * 4) Confirm the next request is no longer blocked by the circuit (it executes).
 *
 * Notes:
 * - We use `TrafficController.handleText()` directly so we can fully control thrown errors + statuses.
 * - We set fallbackPolicy to `mode: "fallback"` (default behavior) and provide no fallback chain,
 *   so open circuits reject with `CircuitBreakerOpenError` (fast and obvious).
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/13-circuit-noneligible-clears-state.ts`
 */

const { getTrafficController, CircuitBreakerOpenError } = require("../../dist/index.js");

type State = { sawClearedLog: boolean };

function createDetectingLogger(name: string, state: State) {
  const write =
    (level: string) =>
    (msg: string, context?: Record<string, unknown>): void => {
      if (msg === "Failure not eligible for circuit breaker; cleared circuit state") {
        state.sawClearedLog = true;
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
  const state: State = { sawClearedLog: false };
  const logger = createDetectingLogger("traffic-demo", state);

  const provider = "mock-provider";
  const model = "mock-clear-state";
  const metadata = { provider, model, taskType: "chat" };

  const controller = getTrafficController({
    maxConcurrent: 2,
    logger: logger as any,
  });

  // 1) Open circuit with 5 eligible failures (status=500).
  for (let i = 1; i <= 5; i += 1) {
    const result = await controller
      .handleText({
        tenantId: "tenant-1",
        metadata,
        execute: async () => {
          throw Object.assign(new Error("Synthetic 500 error"), { status: 500 });
        },
      })
      .then(() => ({ kind: "resolved" as const }))
      .catch((error: unknown) => ({ kind: "rejected" as const, error }));

    if (result.kind === "resolved") {
      logger.error(`[open ${i}] Unexpectedly resolved (BUG)`);
      process.exitCode = 1;
      break;
    }
    if (result.error instanceof CircuitBreakerOpenError) {
      logger.error(`[open ${i}] Circuit opened earlier than expected (BUG)`, {
        retryAfterMs: result.error.retryAfterMs,
      });
      process.exitCode = 1;
      break;
    }
  }

  // 2) Confirm circuit blocks a request now.
  let invokedWhileOpen = false;
  const blocked = await controller
    .handleText({
      tenantId: "tenant-1",
      metadata,
      execute: async () => {
        invokedWhileOpen = true;
        return "should-not-run";
      },
    })
    .then(() => ({ kind: "resolved" as const }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  if (blocked.kind === "resolved") {
    logger.error("[blocked-check] Unexpectedly resolved (BUG): circuit should be open.");
    process.exitCode = 1;
  } else if (blocked.error instanceof CircuitBreakerOpenError) {
    logger.info("[blocked-check] Blocked by circuit as expected", {
      retryAfterMs: blocked.error.retryAfterMs,
    });
  } else {
    logger.error("[blocked-check] Unexpected error (BUG)", {
      errorName: (blocked.error as { name?: unknown } | null)?.name,
      errorMessage: (blocked.error as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  }

  if (invokedWhileOpen) {
    logger.error("[blocked-check] execute() ran while circuit open (BUG)");
    process.exitCode = 1;
  }

  // 3) Send a non-eligible failure (status=400) which should clear circuit state.
  const nonEligible = await controller
    .handleText({
      tenantId: "tenant-1",
      metadata,
      execute: async () => {
        throw Object.assign(new Error("Synthetic 400 error"), { status: 400 });
      },
    })
    .then(() => ({ kind: "resolved" as const }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  if (nonEligible.kind === "resolved") {
    logger.error("[400] Unexpectedly resolved (BUG): should fail.");
    process.exitCode = 1;
  } else if (nonEligible.error instanceof CircuitBreakerOpenError) {
    logger.error(
      "[400] Unexpectedly blocked by circuit (BUG): open state should be cleared on 400.",
    );
    process.exitCode = 1;
  } else {
    logger.info("[400] Failed as expected (non-eligible)", {
      status: (nonEligible.error as { status?: unknown } | null)?.status,
    });
  }

  if (!state.sawClearedLog) {
    logger.error(
      'Did not observe "Failure not eligible for circuit breaker; cleared circuit state" (BUG)',
    );
    process.exitCode = 1;
  }

  // 4) Next request should no longer be blocked by circuit; it should execute.
  let executedAfterClear = false;
  const afterClear = await controller
    .handleText({
      tenantId: "tenant-1",
      metadata,
      execute: async () => {
        executedAfterClear = true;
        return "ok-after-clear";
      },
    })
    .then((value: unknown) => ({ kind: "resolved" as const, value }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  if (afterClear.kind === "rejected") {
    logger.error("[after-clear] Unexpected rejection (BUG)", {
      errorName: (afterClear.error as { name?: unknown } | null)?.name,
      errorMessage: (afterClear.error as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  } else {
    logger.info("[after-clear] Resolved as expected", { value: afterClear.value });
  }

  if (!executedAfterClear) {
    logger.error("[after-clear] execute() did not run (BUG)");
    process.exitCode = 1;
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
