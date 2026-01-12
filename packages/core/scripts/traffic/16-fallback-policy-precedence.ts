/**
 * Goal (one feature):
 * - `resolveFallbackPolicy()` precedence when circuit is open:
 *   1) `metadata.fallbackPolicyId`
 *   2) `fallbackPolicy.taskTypePolicyIds[metadata.taskType]`
 *   3) `fallbackPolicy.defaultPolicyId`
 *   4) else `{ mode: "fallback" }`
 *
 * How we test (public API only):
 * - Use TrafficController directly so we can provide `createFallbackRequest`.
 * - Configure:
 *   - fallbackChains: primary -> secondary
 *   - fallbackPolicy:
 *     - defaultPolicyId: wait-default (mode wait)
 *     - taskTypePolicyIds: { chat: fallback-chat } (mode fallback)
 *     - policies: wait-override (mode wait)
 * - Open the circuit for `primary`.
 * - Then issue three requests (same circuit key), each with a short `maxQueueWaitMs`:
 *   A) taskType=chat, no fallbackPolicyId  => should FALLBACK (succeeds quickly)
 *   B) taskType=chat, fallbackPolicyId=wait-override => should WAIT, then QUEUE TIMEOUT
 *   C) taskType=other, no fallbackPolicyId => should WAIT (default), then QUEUE TIMEOUT
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/16-fallback-policy-precedence.ts`
 */

const { getTrafficController, QueueWaitTimeoutError } = require("../../dist/index.js");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function createLeanLogger(name) {
  const write = (level) => (msg, context) => {
    const prefix = `[${name}] [${level}]`;
    if (context) {
      console.info(prefix, msg, context);
      return;
    }
    console.info(prefix, msg);
  };

  return {
    child: (bindings) =>
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

  const provider = "mock-provider";
  const primary = "policy-primary";
  const secondary = "policy-secondary";
  const chainKey = `${provider}::${primary}`;

  const controller = getTrafficController({
    maxConcurrent: 2,
    logger: logger,
    fallbackChains: {
      [chainKey]: [secondary],
    },
    fallbackPolicy: {
      defaultPolicyId: "wait-default",
      taskTypePolicyIds: { chat: "fallback-chat" },
      policies: {
        "wait-default": { mode: "wait" },
        "fallback-chat": { mode: "fallback" },
        "wait-override": { mode: "wait" },
      },
    },
  });

  const openCircuit = async () => {
    for (let i = 0; i < 5; i += 1) {
      await controller
        .handleText({
          tenantId: "tenant-1",
          metadata: { provider, model: primary, taskType: "chat" },
          execute: async () => {
            throw Object.assign(new Error("Synthetic 500 error"), { status: 500 });
          },
        })
        .catch(() => {});
      await sleep(10);
    }
  };

  await openCircuit();

  const createFallbackRequest = (baseMetadata) => (target) => {
    const targetModel = typeof target === "string" ? target : target?.model;
    if (!targetModel) return undefined;
    return {
      tenantId: "tenant-1",
      metadata: { ...baseMetadata, model: targetModel },
      execute: async () => `ok-${targetModel}`,
      maxQueueWaitMs: 2_000,
    };
  };

  const runCase = async (label, metadata) => {
    const maxQueueWaitMs = 200;
    const result = await controller
      .handleText({
        tenantId: "tenant-1",
        metadata,
        maxQueueWaitMs,
        createFallbackRequest: createFallbackRequest(metadata),
        execute: async () => "should-not-run-primary",
      })
      .then((value) => ({ kind: "resolved", value }))
      .catch((error) => ({ kind: "rejected", error }));

    if (result.kind === "resolved") {
      logger.info(`[${label}] resolved`, { value: result.value });
      return { kind: "resolved", value: result.value };
    }

    if (result.error instanceof QueueWaitTimeoutError) {
      logger.info(`[${label}] queue-timed-out (expected for wait policy)`, {
        waitedMs: result.error.waitedMs,
        maxQueueWaitMs: result.error.maxQueueWaitMs,
      });
      return { kind: "queue-timeout" };
    }

    logger.error(`[${label}] unexpected rejection`, {
      errorName: result.error?.name,
      errorMessage: result.error?.message,
    });
    return { kind: "unexpected" };
  };

  const base = { provider, model: primary, tenantId: "tenant-1" };

  const caseA = await runCase("A taskType=chat (should fallback)", { ...base, taskType: "chat" });
  const caseB = await runCase("B taskType=chat + fallbackPolicyId=wait-override (should wait)", {
    ...base,
    taskType: "chat",
    fallbackPolicyId: "wait-override",
  });
  const caseC = await runCase("C taskType=other (should default-wait)", {
    ...base,
    taskType: "other",
  });

  if (caseA.kind !== "resolved" || String(caseA.value) !== `ok-${secondary}`) {
    logger.error("[A] Expected fallback success to secondary-model (BUG)", { caseA });
    process.exitCode = 1;
  }
  if (caseB.kind !== "queue-timeout") {
    logger.error("[B] Expected queue timeout from wait-override policy (BUG)", { caseB });
    process.exitCode = 1;
  }
  if (caseC.kind !== "queue-timeout") {
    logger.error("[C] Expected queue timeout from default wait policy (BUG)", { caseC });
    process.exitCode = 1;
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
