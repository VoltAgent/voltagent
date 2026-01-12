/**
 * Goal (one feature):
 * - If a wakeup is already scheduled earlier, a later wakeup request should not push it out.
 *
 * Scenario:
 * - Request A has retry-after ~200ms => schedules an early wakeup.
 * - Shortly after, request B has retry-after ~2s => scheduler should keep the earlier wakeup.
 *
 * Expectations:
 * - A dispatches around ~200ms (not delayed towards ~2s).
 *
 * Run:
 * - `pnpm ts-node scripts/traffic/29-rate-limit-wakeup-skip-later.ts`
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
  const controller = getTrafficController({
    maxConcurrent: 10,
    logger: logger as any,
  });

  const startedAt = Date.now();

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const modelAId = "mock-rl-skip-A";
  const modelBId = "mock-rl-skip-B";

  controller.updateRateLimitFromHeaders(
    {
      tenantId: "tenant-1",
      provider: "mock-provider",
      model: modelAId,
      taskType: "chat",
      priority: "P1",
    },
    { "retry-after": "0.2" },
  );

  controller.updateRateLimitFromHeaders(
    {
      tenantId: "tenant-1",
      provider: "mock-provider",
      model: modelBId,
      taskType: "chat",
      priority: "P1",
    },
    { "retry-after": "2" },
  );

  let invokedAAt: number | null = null;
  let invokedBAt: number | null = null;

  const modelA = new MockLanguageModelV3({
    modelId: modelAId,
    doGenerate: async () => {
      invokedAAt = Date.now();
      logger.info(`[A] model invoked at +${invokedAAt - startedAt}ms`);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "A ok" }],
        warnings: [],
      };
    },
  });

  const modelB = new MockLanguageModelV3({
    modelId: modelBId,
    doGenerate: async () => {
      invokedBAt = Date.now();
      logger.info(`[B] model invoked at +${invokedBAt - startedAt}ms`);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "B ok" }],
        warnings: [],
      };
    },
  });

  const agentA = new Agent({
    name: "Rate Limit Skip Later Agent A",
    instructions: "You are a test agent.",
    model: modelA as any,
  });
  const agentB = new Agent({
    name: "Rate Limit Skip Later Agent B",
    instructions: "You are a test agent.",
    model: modelB as any,
  });

  const reqA = agentA.generateText("request A (retry-after 200ms)", {
    tenantId: "tenant-1",
    taskType: "chat",
  });
  logger.info(`[A] enqueued at +${Date.now() - startedAt}ms`);

  await sleep(10);

  const reqB = agentB.generateText("request B (retry-after 2s)", {
    tenantId: "tenant-1",
    taskType: "chat",
  });
  logger.info(`[B] enqueued at +${Date.now() - startedAt}ms`);

  await Promise.allSettled([reqA, reqB]);

  if (invokedAAt === null) {
    logger.error("[A] did not invoke model (BUG)");
    process.exitCode = 1;
  }
  if (invokedAAt !== null) {
    const aMs = invokedAAt - startedAt;
    if (aMs > 1200) {
      logger.error(
        "[A] invoked too late (BUG): earlier wakeup was pushed out by later scheduling.",
        {
          invokedAAtMs: aMs,
          invokedBAtMs: invokedBAt ? invokedBAt - startedAt : null,
          expectedAWakeupMsApprox: 200,
        },
      );
      process.exitCode = 1;
    } else {
      logger.info("[ok] earlier wakeup was not pushed out by a later one", { invokedAAtMs: aMs });
    }
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
