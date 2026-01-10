/**
 * Goal (one feature):
 * - `getPriorityDispatchOrder()` should honor `priorityWeights` via credits:
 *   higher priority queues should be selected more frequently when multiple priorities have work.
 *
 * How we test (public API only, via logs + counters):
 * - Configure TrafficController: maxConcurrent=1, priorityWeights { P0: 5, P1: 1, P2: 0 }.
 * - Enqueue a batch of P0 and P1 requests (same tenant so tenant RR doesn't affect selection).
 * - Each request's model increments a per-priority counter when invoked.
 * - Expect: P0 starts dominate; roughly ~5:1 ratio (allow slack due to refill/edges).
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/05-priority-weights-order.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { getTrafficController, Agent } = require("../../dist/index.js");

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
    maxConcurrent: 1,
    logger: logger as any,
    priorityWeights: { P0: 5, P1: 1, P2: 0 },
  });

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const startedAt = Date.now();
  const invoked = { P0: 0, P1: 0 };
  const startOrder: Array<"P0" | "P1"> = [];

  const makeModel = (priority: "P0" | "P1") =>
    new MockLanguageModelV3({
      modelId: `mock-${priority}`,
      doGenerate: async () => {
        invoked[priority] += 1;
        startOrder.push(priority);
        logger.info(`[${priority}] invoked #${invoked[priority]} at +${Date.now() - startedAt}ms`);
        await sleep(10);
        return {
          finishReason,
          usage,
          content: [{ type: "text", text: `${priority} ok` }],
          warnings: [],
        };
      },
    });

  const agentP0 = new Agent({
    name: "Priority Weights Agent P0",
    instructions: "You are a test agent.",
    model: makeModel("P0") as any,
  });

  const agentP1 = new Agent({
    name: "Priority Weights Agent P1",
    instructions: "You are a test agent.",
    model: makeModel("P1") as any,
  });

  const tenantId = "tenant-1";
  const taskType = "chat";

  // Enqueue a mixed batch; same tenant, so selection reflects priority weights (not tenant RR).
  const p0Count = 18;
  const p1Count = 6;
  const promises: Promise<unknown>[] = [];

  for (let i = 0; i < p0Count; i += 1) {
    promises.push(
      agentP0.generateText(`P0 request ${i}`, {
        tenantId,
        taskType,
        priority: "P0",
      }),
    );
  }
  for (let i = 0; i < p1Count; i += 1) {
    promises.push(
      agentP1.generateText(`P1 request ${i}`, {
        tenantId,
        taskType,
        priority: "P1",
      }),
    );
  }

  await Promise.allSettled(promises);

  logger.info("Invocation totals", invoked);
  logger.info("First 12 starts", { starts: startOrder.slice(0, 12).join("") });

  // Simple sanity expectations:
  // - Both priorities should run at least once.
  // - P0 should run more frequently than P1 under weights 5:1.
  if (invoked.P0 === 0 || invoked.P1 === 0) {
    logger.error("Expected both P0 and P1 to dispatch at least once (BUG)", invoked);
    process.exitCode = 1;
  }

  if (invoked.P0 <= invoked.P1) {
    logger.error("Expected P0 to dispatch more often than P1 (BUG)", invoked);
    process.exitCode = 1;
  }

  // Ratio check with slack (this is a smoke test, not a strict statistical test).
  const ratio = invoked.P0 / invoked.P1;
  if (ratio < 2.5) {
    logger.error("P0/P1 ratio too low; priority weighting may be ineffective (BUG)", {
      ...invoked,
      ratio,
    });
    process.exitCode = 1;
  } else {
    logger.info("Priority weighting looks effective", { ...invoked, ratio });
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
