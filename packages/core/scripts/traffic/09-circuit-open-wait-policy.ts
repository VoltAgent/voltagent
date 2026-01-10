/**
 * Goal (one feature):
 * - When the circuit is open and fallback policy is `mode: "wait"`, the request should NOT be rejected.
 *   Instead, it should remain queued and be retried after the circuit's computed wakeup time.
 *
 * How we test (public API only):
 * - Configure TrafficController with `fallbackPolicy` defaultPolicyId that sets `mode: "wait"`.
 * - Trip the circuit open for a model by issuing enough eligible failures (status=500).
 * - Immediately issue one more request while the circuit is open:
 *   - Expect controller logs "Circuit open; waiting per fallback policy"
 *   - Expect the request resolves only after the probe interval (~5s), without a new enqueue.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/09-circuit-open-wait-policy.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { getTrafficController, Agent } = require("../../dist/index.js");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type State = { sawPolicyWaitLog: boolean; sawCircuitOpened: boolean };

function createDetectingLogger(name: string, state: State) {
  const write =
    (level: string) =>
    (msg: string, context?: Record<string, unknown>): void => {
      if (msg === "Circuit open; waiting per fallback policy") {
        state.sawPolicyWaitLog = true;
      }
      if (msg === "Circuit opened") {
        state.sawCircuitOpened = true;
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
  const state: State = { sawPolicyWaitLog: false, sawCircuitOpened: false };
  const logger = createDetectingLogger("traffic-demo", state);

  getTrafficController({
    maxConcurrent: 1,
    logger: logger as any,
    fallbackPolicy: {
      defaultPolicyId: "wait-all",
      policies: {
        "wait-all": { mode: "wait" },
      },
    },
  });

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const startedAt = Date.now();

  // Use two model instances with the same `modelId` so they share a circuit key:
  // - one always fails to open the circuit
  // - one always succeeds for the half-open probe
  let failureInvocations = 0;
  let successInvocations = 0;
  const modelId = "mock-circuit-wait";

  const failingModel = new MockLanguageModelV3({
    modelId,
    doGenerate: async () => {
      failureInvocations += 1;
      throw Object.assign(new Error("Synthetic 500 error"), { status: 500 });
    },
  });

  const successModel = new MockLanguageModelV3({
    modelId,
    doGenerate: async () => {
      successInvocations += 1;
      await sleep(10);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "ok-after-open" }],
        warnings: [],
      };
    },
  });

  const agentFail = new Agent({
    name: "Circuit Wait Policy Demo Agent (fail)",
    instructions: "You are a test agent.",
    model: failingModel as any,
  });

  const agentSuccess = new Agent({
    name: "Circuit Wait Policy Demo Agent (success)",
    instructions: "You are a test agent.",
    model: successModel as any,
  });

  // Trip circuit: make 5 eligible failures (threshold is 5).
  for (let i = 1; i <= 5; i += 1) {
    const result = await agentFail
      .generateText(`trip request ${i}`, { tenantId: "tenant-1", taskType: "chat" })
      .then(() => ({ kind: "resolved" as const }))
      .catch((error: unknown) => ({ kind: "rejected" as const, error }));

    if (result.kind === "resolved") {
      logger.error(`[trip ${i}] Unexpectedly resolved (BUG): should fail.`);
      process.exitCode = 1;
      break;
    }
    logger.info(`[trip ${i}] failed as expected at +${Date.now() - startedAt}ms`);
  }

  if (!state.sawCircuitOpened) {
    logger.error('Did not observe "Circuit opened" log (BUG): circuit may not have opened.');
    process.exitCode = 1;
  }

  // Now the circuit should be open. This request should WAIT (not reject) and later succeed.
  const waitStartedAt = Date.now();
  const waited = await agentSuccess
    .generateText("request while open (should wait)", {
      tenantId: "tenant-1",
      taskType: "chat",
      maxQueueWaitMs: 15_000,
    })
    .then((value: unknown) => ({ kind: "resolved" as const, value }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  const waitedMs = Date.now() - waitStartedAt;

  if (waited.kind === "rejected") {
    logger.error("[wait] Unexpected rejection (BUG)", {
      errorName: (waited.error as { name?: unknown } | null)?.name,
      errorMessage: (waited.error as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  } else {
    logger.info(`[wait] Resolved after ${waitedMs}ms`, { result: waited.value });
  }

  if (!state.sawPolicyWaitLog) {
    logger.error('[wait] Did not observe "Circuit open; waiting per fallback policy" log (BUG)');
    process.exitCode = 1;
  }

  // With default constants, probe interval is ~5000ms; allow slack for scheduling.
  if (waitedMs < 3500) {
    logger.error("[wait] Resolved too quickly; may not have waited for circuit probe (BUG)", {
      waitedMs,
    });
    process.exitCode = 1;
  }

  logger.info("Done.", { failureInvocations, successInvocations });
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
