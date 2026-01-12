/**
 * Goal (one feature):
 * - `scheduleDrain()` should coalesce multiple enqueues into a single drain tick.
 *
 * Why this matters:
 * - Users can enqueue many requests in the same call stack; we should avoid scheduling
 *   redundant drain work before the first tick runs.
 *
 * How we test (public API only):
 * - Configure shared TrafficController: maxConcurrent=1.
 * - Enqueue N requests synchronously (same tick).
 * - Expect: exactly 1 "Drain scheduled" log before the first "Drain tick".
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/02-drain-coalescing.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { getTrafficController, Agent } = require("../../dist/index.js");

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function createCountingLogger(name: string) {
  const state = {
    scheduledBeforeFirstTick: 0,
    tickCount: 0,
    beforeFirstTick: true,
  };

  const write =
    (level: string) =>
    (msg: string, context?: object): void => {
      if (msg === "Drain scheduled" && state.beforeFirstTick) {
        state.scheduledBeforeFirstTick += 1;
      }
      if (msg === "Drain tick") {
        state.tickCount += 1;
        state.beforeFirstTick = false;
      }

      const prefix = `[${name}] [${level}]`;
      if (context) {
        console.info(prefix, msg, context);
        return;
      }
      console.info(prefix, msg);
    };

  return {
    state,
    child: (bindings?: Record<string, unknown>) =>
      createCountingLogger(
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
  const logger = createCountingLogger("traffic-demo");

  getTrafficController({
    maxConcurrent: 1,
    logger: logger as any,
  });

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const mockModel = new MockLanguageModelV3({
    modelId: "mock-drain-coalesce",
    doGenerate: async () => {
      await sleep(250);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "ok" }],
        warnings: [],
      };
    },
  });

  const agent = new Agent({
    name: "Drain Coalescing Demo Agent",
    instructions: "You are a test agent.",
    model: mockModel as any,
  });

  const enqueueCount = 10;
  const requests: Promise<unknown>[] = [];

  // Enqueue synchronously in the same call stack.
  for (let i = 0; i < enqueueCount; i += 1) {
    requests.push(
      agent.generateText(`request ${i}`, {
        tenantId: "tenant-1",
        taskType: "chat",
      }),
    );
  }

  // Allow the drain microtask to run and log its first tick.
  await sleep(25);

  const { scheduledBeforeFirstTick, tickCount } = logger.state;

  if (tickCount < 1) {
    logger.error("Expected at least 1 Drain tick (BUG)");
    process.exitCode = 1;
  }

  if (scheduledBeforeFirstTick !== 1) {
    logger.error("Drain scheduling was not coalesced (BUG)", {
      scheduledBeforeFirstTick,
      enqueueCount,
    });
    process.exitCode = 1;
  } else {
    logger.info("Drain scheduling coalesced as expected", {
      scheduledBeforeFirstTick,
      enqueueCount,
    });
  }

  await Promise.allSettled(requests);
  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
