import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Memory } from "../../memory";
import { InMemoryStorageAdapter } from "../../memory/adapters/storage/in-memory";
import { ServerlessVoltAgentObservability } from "../../observability";
import { createMockWorkflowExecuteContext } from "../../test-utils";
import { createWorkflow } from "../core";
import { WorkflowTraceContext } from "../open-telemetry/trace-context";
import { andRace } from "./and-race";
import { andThen } from "./and-then";

function gate() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function beforeLoserSettles<T>(run: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Race waited for the losing step")), 1000);
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("andRace", () => {
  it.each(["completed", "error", "suspended", "cancelled"] as const)(
    "should settle a public workflow with %s before the losing step settles",
    async (status) => {
      const globals = globalThis as typeof globalThis & {
        ___voltagent_get_active_span?: () => unknown;
      };
      // Restore the bridge after exercising the actual serverless implementation.
      for (const key of [
        "___voltagent_get_active_span",
        "___voltagent_push_span",
        "___voltagent_pop_span",
        "___voltagent_otel_logger_provider",
        "___voltagent_otel_api",
      ]) {
        vi.stubGlobal(key, Reflect.get(globalThis, key));
      }
      const observability = new ServerlessVoltAgentObservability({
        flushOnFinishStrategy: "never",
      });
      const loser = gate();
      const loserStarted = gate();
      const failure = new Error("First step failed");
      const createSpan = vi.spyOn(WorkflowTraceContext.prototype, "createStepSpan");
      const endSpan = vi.spyOn(WorkflowTraceContext.prototype, "endStepSpan");
      const nextStep = vi.fn(async ({ data }: { data: string }) => data);
      const workflow = createWorkflow(
        {
          id: `race-${status}`,
          name: "Race completion",
          input: z.object({}),
          result: z.string(),
          memory: new Memory({ storage: new InMemoryStorageAdapter() }),
          observability,
        },
        andRace({
          id: "race",
          steps: [
            andThen({
              id: "winner",
              execute: async ({ suspend, abort }) => {
                await loserStarted.promise;
                if (status === "error") throw failure;
                if (status === "suspended") return suspend("Wait for approval");
                if (status === "cancelled") return abort();
                return "winner";
              },
            }),
            andThen({
              id: "loser",
              execute: async () => {
                loserStarted.resolve();
                await loser.promise;
                throw new Error("Late losing rejection");
              },
            }),
          ],
        }),
        andThen({ id: "next", execute: nextStep }),
      );
      const run = workflow.run({});
      try {
        const result = await beforeLoserSettles(run);
        expect(result.status).toBe(status);
        if (status === "completed") {
          expect(result.result).toBe("winner");
          expect(nextStep).toHaveBeenCalledOnce();
        } else {
          if (status === "error") expect(result.error).toBe(failure);
          else expect(result.error).toBeUndefined();
          expect(nextStep).not.toHaveBeenCalled();
        }

        const childSpans = createSpan.mock.calls.flatMap((args, index) =>
          args[3]?.parentStepId === "race" ? [createSpan.mock.results[index].value] : [],
        );
        expect(childSpans).toHaveLength(2);
        const expectedWinnerEnd =
          status === "completed"
            ? [childSpans[0], status, { output: "winner" }]
            : status === "error"
              ? [childSpans[0], status, { error: failure }]
              : [childSpans[0], status];
        expect(endSpan.mock.calls.filter(([span]) => span === childSpans[0])).toEqual([
          expectedWinnerEnd,
        ]);
        expect(endSpan.mock.calls.filter(([span]) => span === childSpans[1])).toEqual([
          [childSpans[1], "skipped", { skippedReason: "Another step won the race" }],
        ]);
        expect(globals.___voltagent_get_active_span?.()).toBeUndefined();
        const callsAtCompletion = endSpan.mock.calls.length;
        loser.resolve();
        // Let the losing rejection and its handlers settle after the workflow has returned.
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(endSpan).toHaveBeenCalledTimes(callsAtCompletion);
      } finally {
        loser.resolve();
        await run;
        await observability.shutdown();
      }
    },
  );

  it.each([false, true])(
    "should preserve first-settlement semantics without workflow context (%s)",
    async (rejectFirst) => {
      const loser = gate();
      const failure = new Error("First rejection");
      const step = andRace({
        id: "context-free-race",
        steps: [
          andThen({
            id: "winner",
            execute: async () => {
              if (rejectFirst) throw failure;
              return "winner";
            },
          }),
          andThen({
            id: "loser",
            execute: async () => {
              await loser.promise;
              return "loser";
            },
          }),
        ],
      });
      const run = step.execute(createMockWorkflowExecuteContext());
      try {
        if (rejectFirst) await expect(beforeLoserSettles(run)).rejects.toBe(failure);
        else await expect(beforeLoserSettles(run)).resolves.toBe("winner");
      } finally {
        loser.resolve();
      }
    },
  );
});
