import {
  QueueWaitTimeoutError,
  TrafficController,
} from "../../packages/core/src/traffic/traffic-controller";

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

function createConsoleLogger(name: string, level: LogLevel = "debug") {
  const order: LogLevel[] = ["trace", "debug", "info", "warn", "error", "fatal"];
  const minLevelIndex = order.indexOf(level);

  const shouldLog = (msgLevel: LogLevel) => order.indexOf(msgLevel) >= minLevelIndex;
  const base = (msgLevel: LogLevel, message: string, context?: object) => {
    if (!shouldLog(msgLevel)) return;
    const timestamp = new Date().toISOString();
    const payload =
      context && typeof context === "object"
        ? { ...(context as Record<string, unknown>) }
        : undefined;
    const prefix = `[${timestamp}] [${name}] [${msgLevel}]`;
    const writer =
      msgLevel === "warn"
        ? console.warn
        : msgLevel === "error" || msgLevel === "fatal"
          ? console.error
          : console.info;

    if (payload) {
      writer(prefix, message, payload);
      return;
    }
    writer(prefix, message);
  };

  const child = (bindings?: Record<string, unknown>) => {
    const suffix =
      bindings && Object.keys(bindings).length > 0
        ? ` ${Object.entries(bindings)
            .map(([k, v]) => `${k}=${String(v)}`)
            .join(" ")}`
        : "";
    return createConsoleLogger(`${name}${suffix}`, level);
  };

  return {
    level,
    child,
    trace: (message: string, context?: object) => base("trace", message, context),
    debug: (message: string, context?: object) => base("debug", message, context),
    info: (message: string, context?: object) => base("info", message, context),
    warn: (message: string, context?: object) => base("warn", message, context),
    error: (message: string, context?: object) => base("error", message, context),
    fatal: (message: string, context?: object) => base("fatal", message, context),
  };
}

async function main() {
  const logger = createConsoleLogger("traffic-demo", "debug");
  const controller = new TrafficController({
    maxConcurrent: 1,
    logger,
  });

  const startedAt = Date.now();
  const requestA = controller.handleText({
    tenantId: "tenant-1",
    metadata: {
      provider: "openai",
      model: "gpt-4o",
      priority: "P1",
      taskType: "chat",
    },
    execute: async () => {
      logger.info(`[A] execute() started at +${Date.now() - startedAt}ms`);
      await sleep(2000);
      logger.info(`[A] execute() finished at +${Date.now() - startedAt}ms`);
      return { ok: true, from: "A" };
    },
  });

  await sleep(50);

  const requestB = controller.handleText({
    tenantId: "tenant-1",
    metadata: {
      provider: "openai",
      model: "gpt-4o",
      priority: "P1",
      taskType: "chat",
    },
    maxQueueWaitMs: 200,
    execute: async () => {
      logger.error("[B] BUG: execute() ran but should have timed out in queue");
      return { ok: true, from: "B" };
    },
  });

  const resultB = await requestB
    .then(() => ({ kind: "resolved" as const }))
    .catch((error: unknown) => ({ kind: "rejected" as const, error }));

  const elapsedB = Date.now() - startedAt;
  if (resultB.kind === "resolved") {
    logger.error(`[B] Unexpectedly resolved at +${elapsedB}ms`);
  } else if (resultB.error instanceof QueueWaitTimeoutError) {
    logger.info(`[B] Timed out in queue at +${elapsedB}ms`, {
      maxQueueWaitMs: resultB.error.maxQueueWaitMs,
      deadlineAt: resultB.error.deadlineAt,
    });
  } else {
    logger.error(`[B] Rejected with unexpected error at +${elapsedB}ms`, { error: resultB.error });
  }

  await requestA;
  logger.info("Done.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
