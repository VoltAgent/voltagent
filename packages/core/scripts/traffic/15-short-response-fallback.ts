/**
 * Goal (one feature):
 * - Short-response fallback should be selected from fallbackChains and executed via createFallbackRequest.
 *
 * What we test:
 * - Configure fallbackChains for a model to include:
 *   [{ kind: "short-response", text: "hi-from-fallback" }]
 * - Open the circuit for the primary model.
 * - Enqueue a request with `createFallbackRequest` that recognizes the short-response target and returns
 *   a fallback request that resolves immediately with that text (without invoking any model).
 *
 * Run:
 * - `pnpm -C packages/core ts-node scripts/traffic/15-short-response-fallback.ts`
 */

const { getTrafficController } = require("../../dist/index.js");

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

  const provider = "mock-provider";
  const primaryModel = "model-short-primary";
  const shortText = "hi-from-fallback";

  const controller = getTrafficController({
    maxConcurrent: 2,
    logger: logger as any,
    fallbackChains: {
      [`${provider}::${primaryModel}`]: [{ kind: "short-response", text: shortText }],
    },
  });

  const metadata = { provider, model: primaryModel, taskType: "chat" };

  // Open the circuit with 5 eligible failures (status=500).
  for (let i = 0; i < 5; i += 1) {
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

  let modelInvoked = false;

  const result = await controller
    .handleText({
      tenantId: "tenant-1",
      metadata,
      maxQueueWaitMs: 15_000,
      createFallbackRequest: (target: unknown) => {
        if (
          typeof target === "object" &&
          target !== null &&
          (target as any).kind === "short-response" &&
          typeof (target as any).text === "string"
        ) {
          const text = (target as any).text;
          return {
            tenantId: "tenant-1",
            // Important: use a different model key so the fallback request is not re-blocked
            // by the original model's open circuit.
            metadata: { provider, model: "short-response", taskType: "chat" },
            execute: async () => text,
            maxQueueWaitMs: 15_000,
          };
        }
        return undefined;
      },
      execute: async () => {
        modelInvoked = true;
        return "should-not-run";
      },
    })
    .then((value: unknown) => ({ kind: "resolved" as const, value }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  if (result.kind === "rejected") {
    logger.error("Unexpected rejection (BUG)", {
      errorName: (result.error as { name?: unknown } | null)?.name,
      errorMessage: (result.error as { message?: unknown } | null)?.message,
    });
    process.exitCode = 1;
  } else {
    logger.info("Resolved", { value: result.value });
    if (result.value !== shortText) {
      logger.error("Unexpected short-response value (BUG)", {
        expected: shortText,
        got: result.value,
      });
      process.exitCode = 1;
    }
  }

  if (modelInvoked) {
    logger.error("Primary execute() was invoked despite short-response fallback (BUG)");
    process.exitCode = 1;
  }

  logger.info("Done.");
  process.exit(process.exitCode ?? 0);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
