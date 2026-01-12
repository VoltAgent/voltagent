/**
 * Goal (one feature):
 * - A rate limit wait for one key should not prevent dispatch of another key (when queue selection
 *   can choose a different tenant).
 *
 * Scenario:
 * - Tenant-1 request A is rate-limited via retry-after (~1s) for model A.
 * - Tenant-2 request B has no cooldown for model B.
 *
 * Expectations:
 * - B dispatches quickly while A is waiting.
 *
 * Run:
 * - `pnpm ts-node scripts/traffic/28-rate-limit-per-key-isolation.ts`
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
    maxConcurrent: 5,
    logger: logger as any,
  });

  const startedAt = Date.now();

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const modelAId = "mock-rl-isolation-A";
  const modelBId = "mock-rl-isolation-B";

  // Only model A is rate-limited.
  controller.updateRateLimitFromHeaders(
    {
      tenantId: "tenant-1",
      provider: "mock-provider",
      model: modelAId,
      taskType: "chat",
      priority: "P1",
    },
    { "retry-after": "1" },
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
      await sleep(30);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "B ok" }],
        warnings: [],
      };
    },
  });

  const agentA = new Agent({
    name: "Rate Limit Isolation Agent A",
    instructions: "You are a test agent.",
    model: modelA as any,
  });
  const agentB = new Agent({
    name: "Rate Limit Isolation Agent B",
    instructions: "You are a test agent.",
    model: modelB as any,
  });

  const reqA = agentA.generateText("request A (should wait 1s)", {
    tenantId: "tenant-1",
    taskType: "chat",
  });
  logger.info(`[A] enqueued at +${Date.now() - startedAt}ms`);

  // B is different tenant so round-robin can pick it even while A is waiting.
  const reqB = agentB.generateText("request B (should dispatch immediately)", {
    tenantId: "tenant-2",
    taskType: "chat",
  });
  logger.info(`[B] enqueued at +${Date.now() - startedAt}ms`);

  await Promise.allSettled([reqA, reqB]);

  if (invokedBAt === null) {
    logger.error("[B] did not invoke model (BUG): should not be blocked by A's rate limit.", {
      invokedAAtMs: invokedAAt ? invokedAAt - startedAt : null,
    });
    process.exitCode = 1;
  } else {
    const bMs = invokedBAt - startedAt;
    if (bMs > 250) {
      logger.error("[B] invoked too late (BUG): expected near-immediate dispatch.", {
        invokedBAtMs: bMs,
      });
      process.exitCode = 1;
    } else {
      logger.info("[ok] B dispatched quickly while A was rate-limited", {
        invokedBAtMs: bMs,
        invokedAAtMs: invokedAAt ? invokedAAt - startedAt : null,
      });
    }
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
