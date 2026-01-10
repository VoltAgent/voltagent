/**
 * Goal (one feature):
 * - Prove queue timeouts work even when the system is fully busy.
 *
 * How we test (public API only):
 * - Create an Agent.
 * - Use a mock model (no OpenAI key needed).
 * - Configure the shared TrafficController: maxConcurrent=1.
 * - Start request A and keep it running ~3s.
 * - Start request B with maxQueueWaitMs=500ms.
 * - Expect: B fails fast with QueueWaitTimeoutError while A is still running.
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/01-agent-stream-queue-timeout.ts`
 */

const { MockLanguageModelV3 } = require("ai/test");
const { QueueWaitTimeoutError, getTrafficController, Agent } = require("../../dist/index.js");

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
  // 1) Logger (we’ll read behavior from logs).
  const logger = createLeanLogger("traffic-demo");

  // 2) Configure the shared traffic controller (central queue).
  //    Important: do this before starting requests, so the singleton is created with these options.
  getTrafficController({
    maxConcurrent: 1,
    logger: logger as any,
  });

  // 3) Mock model that streams slowly (so stream A holds the concurrency slot).
  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };
  const mockModel = new MockLanguageModelV3({
    modelId: "mock-openai-gpt",
    doGenerate: async () => {
      await sleep(3000);
      return {
        finishReason,
        usage,
        content: [{ type: "text", text: "A done" }],
        warnings: [],
      };
    },
  });

  // 4) Create Agent (this is the user-facing API you’ll ship).
  const agent = new Agent({
    name: "Queue Timeout Demo Agent",
    instructions: "You are a test agent.",
    model: mockModel as any,
  });

  // 5) Start request A (occupies the only concurrency slot).
  const startedAt = Date.now();
  const requestA = agent.generateText("request A", {
    tenantId: "tenant-1",
    taskType: "chat",
  });
  logger.info(`[A] started at +${Date.now() - startedAt}ms`);

  // 6) Start request B. It should wait in the queue, then time out after 500ms.
  const requestB = agent.generateText("request B", {
    tenantId: "tenant-1",
    taskType: "chat",
    maxQueueWaitMs: 500,
  });

  const resultB = await requestB
    .then(() => ({ kind: "resolved" as const }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  if (resultB.kind === "resolved") {
    logger.error("[B] Unexpectedly started streaming (BUG): should have timed out in queue.");
  } else if (resultB.error instanceof QueueWaitTimeoutError) {
    logger.info(`[B] Timed out as expected at +${Date.now() - startedAt}ms`, {
      maxQueueWaitMs: resultB.error.maxQueueWaitMs,
      deadlineAt: resultB.error.deadlineAt,
    });
  } else {
    logger.error("[B] Failed with unexpected error", { error: resultB.error });
  }

  // 7) Wait for A to finish so the script can exit cleanly.
  await requestA.catch(() => {});

  logger.info("Done.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
