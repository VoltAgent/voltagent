/**
 * Goal (one feature):
 * - When circuit is `open`, `evaluateCircuitState()` should:
 *   - return `retryAfterMs = min(cooldownRemaining, probeRemaining)` (probe interval is ~5s by default),
 *   - transition to `half-open` when probeRemaining hits 0 (even though cooldown is ~30s),
 *   - allow a trial request and (on success) clear circuit state.
 *
 * How we test (public API only):
 * - Configure fallbackPolicy mode "wait" so open circuits return wait decisions (not reject).
 * - Open the circuit with 5 eligible failures (status=500).
 * - Send one request that should wait while open, then run as soon as half-open is reached.
 * - Validate from logs:
 *   - "Circuit open; waiting per fallback policy" includes a positive retryAfterMs that is
 *     bounded by the probe interval (<= ~5000ms, can be smaller if the circuit opened earlier).
 *   - "Circuit transitioned to half-open" reason is "probe" (not "cooldown").
 * - Validate timing: request resolves in ~5–7s (not ~30s).
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/17-circuit-retryafter-probe-halfopen.ts`
 */

const { getTrafficController } = require("../../dist/index.js");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type State = {
  firstRetryAfterMs?: number;
  sawHalfOpenProbeTransition: boolean;
};

function createDetectingLogger(name: string, state: State) {
  const write =
    (level: string) =>
    (msg: string, context?: Record<string, unknown>): void => {
      if (
        msg === "Circuit open; waiting per fallback policy" &&
        state.firstRetryAfterMs === undefined
      ) {
        const retryAfterMs = context?.retryAfterMs;
        if (typeof retryAfterMs === "number") state.firstRetryAfterMs = retryAfterMs;
      }
      if (msg === "Circuit transitioned to half-open") {
        if (context?.reason === "probe") state.sawHalfOpenProbeTransition = true;
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
  const state: State = { sawHalfOpenProbeTransition: false };
  const logger = createDetectingLogger("traffic-demo", state);

  const provider = "mock-provider";
  const model = "mock-probe-halfopen";
  const metadata = { provider, model, taskType: "chat" };

  const controller = getTrafficController({
    maxConcurrent: 1,
    logger: logger as any,
    fallbackPolicy: {
      defaultPolicyId: "wait-all",
      policies: { "wait-all": { mode: "wait" } },
    },
  });

  // 1) Open the circuit with 5 eligible failures.
  for (let i = 1; i <= 5; i += 1) {
    await controller
      .handleText({
        tenantId: "tenant-1",
        metadata,
        execute: async () => {
          throw Object.assign(new Error("Synthetic 500 error"), { status: 500 });
        },
      })
      .catch(() => {});
  }

  // 2) Issue a request that will be held while open and then allowed at half-open probe time.
  const startedAt = Date.now();
  const result = await controller
    .handleText({
      tenantId: "tenant-1",
      metadata,
      maxQueueWaitMs: 20_000,
      execute: async () => "ok-after-probe",
    })
    .then((value: unknown) => ({ kind: "resolved" as const, value }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));
  const elapsedMs = Date.now() - startedAt;

  if (result.kind === "rejected") {
    logger.error("Unexpected rejection (BUG)", {
      errorName: (result.error as { name?: unknown } | null)?.name,
      errorMessage: (result.error as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  } else {
    logger.info("Resolved", { value: result.value, elapsedMs });
  }

  const retryAfter = state.firstRetryAfterMs;
  if (typeof retryAfter !== "number") {
    logger.error(
      'Did not capture retryAfterMs from "Circuit open; waiting per fallback policy" (BUG)',
    );
    process.exitCode = 1;
  } else {
    logger.info("Captured retryAfterMs", { retryAfterMs: retryAfter });
    if (retryAfter <= 0 || retryAfter > 6000) {
      logger.error("retryAfterMs out of expected probe-range (BUG)", { retryAfterMs: retryAfter });
      process.exitCode = 1;
    }
  }

  if (!state.sawHalfOpenProbeTransition) {
    logger.error('Did not observe "Circuit transitioned to half-open" with reason="probe" (BUG)');
    process.exitCode = 1;
  }

  if (elapsedMs < 2500 || elapsedMs > 9000) {
    logger.error("Request did not resolve around probe interval (BUG)", { elapsedMs });
    process.exitCode = 1;
  }

  // Small delay to allow any trailing logs to flush.
  await sleep(25);

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
