/**
 * Goal (one feature):
 * - When both `maxConcurrentPerTenant` and `maxConcurrentPerProviderModel` block a request,
 *   the concurrency limiter should report BOTH reasons.
 *
 * Code under test:
 * - `packages/core/src/traffic/traffic-concurrency-limiter.ts:52` (`resolve` reasons[])
 * - Logged from `packages/core/src/traffic/traffic-controller.ts:1209` (trace "Concurrency gate blocked request")
 *
 * How we test (public API only):
 * - Configure:
 *   - maxConcurrent=10
 *   - maxConcurrentPerTenant=1
 *   - maxConcurrentPerProviderModel=1
 * - Start A: tenant-1 on model=X (holds ~250ms).
 * - Enqueue B: tenant-1 on model=X (should be blocked by BOTH).
 * - Ensure we observe a concurrency log with reasons containing gate=tenant AND gate=providerModel.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/23-concurrency-combined-reasons.ts`
 */

const { getTrafficController } = require("../../dist/index.js");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type State = { sawBothGates: boolean };

function createDetectingLogger(name: string, state: State) {
  const write =
    (level: string) =>
    (msg: string, context?: Record<string, unknown>): void => {
      if (msg === "Concurrency gate blocked request") {
        const reasons = context?.reasons;
        if (Array.isArray(reasons)) {
          const gates = new Set(reasons.map((r) => (r as any)?.gate));
          if (gates.has("tenant") && gates.has("providerModel")) {
            state.sawBothGates = true;
          }
        }
      }
      const prefix = `[${name}] [${level}]`;
      if (context) return void console.info(prefix, msg, context);
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
  const state: State = { sawBothGates: false };
  const logger = createDetectingLogger("traffic-demo", state);
  const controller = getTrafficController({
    maxConcurrent: 10,
    maxConcurrentPerTenant: 1,
    maxConcurrentPerProviderModel: 1,
    logger: logger as any,
  });

  const provider = "mock-provider";
  const model = "combo-X";

  const a = controller.handleText({
    tenantId: "tenant-1",
    metadata: { provider, model, taskType: "chat" },
    execute: async () => {
      await sleep(250);
      return "A ok";
    },
  });

  // Give A a moment to acquire slots.
  await sleep(25);

  const b = controller.handleText({
    tenantId: "tenant-1",
    metadata: { provider, model, taskType: "chat" },
    execute: async () => "B ok",
  });

  await Promise.allSettled([a, b]);

  if (!state.sawBothGates) {
    console.error("Did not observe combined concurrency block reasons (BUG)");
    process.exitCode = 1;
  }

  process.exit(process.exitCode ?? 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
