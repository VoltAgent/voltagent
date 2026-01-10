/**
 * Goal (one feature):
 * - Within a priority, `getNextTenantCandidate()` should round-robin across tenants so one tenant
 *   cannot starve others when both have queued work.
 *
 * How we test (public API only):
 * - Configure TrafficController: maxConcurrent=1.
 * - Create two agents with different modelIds so we can identify starts in logs.
 * - Enqueue 3 requests for tenant-1 and 3 for tenant-2 (same priority by default).
 * - Expect: dispatch order alternates tenants roughly T1/T2/T1/T2... (no long runs of the same tenant).
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/06-tenant-round-robin-fairness.ts`
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
  });

  const finishReason = { unified: "stop", raw: "stop" } as const;
  const usage = {
    inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
    outputTokens: { total: 1, text: 1, reasoning: 0 },
  };

  const startedAt = Date.now();
  const starts: string[] = [];

  const makeModel = (label: "T1" | "T2") =>
    new MockLanguageModelV3({
      modelId: `mock-${label}`,
      doGenerate: async () => {
        starts.push(label);
        logger.info(`[${label}] invoked at +${Date.now() - startedAt}ms`, {
          starts: starts.join(""),
        });
        await sleep(25);
        return {
          finishReason,
          usage,
          content: [{ type: "text", text: `${label} ok` }],
          warnings: [],
        };
      },
    });

  const agentT1 = new Agent({
    name: "Tenant RR Agent T1",
    instructions: "You are a test agent.",
    model: makeModel("T1") as any,
  });

  const agentT2 = new Agent({
    name: "Tenant RR Agent T2",
    instructions: "You are a test agent.",
    model: makeModel("T2") as any,
  });

  const taskType = "chat";
  const promises: Promise<unknown>[] = [];

  // Enqueue in a "lopsided" way: all tenant-1 first, then tenant-2.
  // A fair scheduler should still alternate once both tenants are present.
  for (let i = 0; i < 3; i += 1) {
    promises.push(
      agentT1.generateText(`tenant-1 request ${i}`, { tenantId: "tenant-1", taskType }),
    );
  }
  for (let i = 0; i < 3; i += 1) {
    promises.push(
      agentT2.generateText(`tenant-2 request ${i}`, { tenantId: "tenant-2", taskType }),
    );
  }

  await Promise.allSettled(promises);

  logger.info("Start sequence", { starts: starts.join("") });

  if (starts.length !== 6) {
    logger.error("Expected 6 invocations (BUG)", { starts: starts.length });
    process.exitCode = 1;
  }

  // Fairness heuristic: after both tenants have at least one in the queue,
  // we shouldn't see a run of >2 from the same tenant in this small test.
  let maxRun = 1;
  let currentRun = 1;
  for (let i = 1; i < starts.length; i += 1) {
    if (starts[i] === starts[i - 1]) {
      currentRun += 1;
      maxRun = Math.max(maxRun, currentRun);
    } else {
      currentRun = 1;
    }
  }

  if (maxRun > 2) {
    logger.error("Tenant round-robin looks unfair (BUG): long run detected", {
      starts: starts.join(""),
      maxRun,
    });
    process.exitCode = 1;
  } else {
    logger.info("Tenant round-robin looks reasonable", { maxRun });
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
