import {
  Agent,
  andThen,
  createInputGuardrail,
  createOutputGuardrail,
  createWorkflow,
  createWorkflowChain,
} from "@voltagent/core";
import { z } from "zod";
import { delay, demoModel } from "./models";

const tripInput = z.object({
  city: z.string().min(1).default("Istanbul"),
  approval: z.boolean().default(false),
});
const numberInput = z.object({ value: z.number().default(2) });

export function createDemoWorkflows() {
  const exit = createWorkflow(
    {
      id: "demo-w-exit",
      name: "15 · Early exit / abort",
      purpose:
        'Try mode="complete", "bail", and "abort". Bail returns an early result; abort cancels the workflow. The final step runs only in complete mode.',
      input: z.object({ mode: z.enum(["complete", "bail", "abort"]).default("complete") }),
      result: z.object({ message: z.string() }),
    },
    andThen({
      id: "decide-exit",
      execute: async ({ data, bail, abort }) => {
        if (data.mode === "bail") bail({ message: "Early result" });
        if (data.mode === "abort") abort();
        return data;
      },
    }),
    andThen({ id: "final-step", execute: async () => ({ message: "All steps completed" }) }),
  );
  const trip = createWorkflowChain({
    id: "trip-plan",
    name: "01 · Sequential / resume / replay",
    purpose:
      'Run the default input. Set approval=true to suspend, then resume with {"approved":true} or {"approved":false}. Replay create-itinerary with a different city.',
    input: tripInput,
    result: z.object({ city: z.string(), itinerary: z.string() }),
  })
    .andThen({
      id: "validate-destination",
      execute: async ({ data }) => {
        await delay(150);
        return data;
      },
    })
    .andThen({
      id: "review-plan",
      resumeSchema: z.object({ approved: z.boolean() }),
      execute: async ({ data, suspend, resumeData }) => {
        if (data.approval && !resumeData) await suspend("Approve this trip to continue");
        if (resumeData?.approved === false) throw new Error("Trip declined");
        return data;
      },
    })
    .andThen({
      id: "create-itinerary",
      execute: async ({ data }) => ({
        city: data.city,
        itinerary: `Explore ${data.city} on foot.`,
      }),
    });

  const parallel = createWorkflowChain({
    id: "demo-w-parallel",
    name: "02 · Parallel / all",
    purpose:
      "Both branches overlap; the join must wait for both. Inspect separate lanes and compare timing in Waterfall.",
    input: numberInput,
    result: z.object({ total: z.number() }),
  })
    .andAll({
      id: "two-sources",
      steps: [
        andThen({
          id: "fast-source",
          execute: async ({ data }: { data: { value: number } }) => {
            await delay(100);
            return data.value * 2;
          },
        }),
        andThen({
          id: "slow-source",
          execute: async ({ data }: { data: { value: number } }) => {
            await delay(350);
            return data.value * 3;
          },
        }),
      ],
    })
    .andThen({
      id: "join-results",
      execute: async ({ data }) => ({ total: data.reduce((sum, value) => sum + value, 0) }),
    });

  const race = createWorkflowChain({
    id: "demo-w-race",
    name: "03 · Parallel / race",
    purpose:
      "The cache wins; the slower branch is cancelled. The final step must not wait for the loser.",
    input: z.object({}),
    result: z.object({ source: z.string() }),
  })
    .andRace({
      id: "first-result",
      steps: [
        andThen({
          id: "cache",
          execute: async () => {
            await delay(80);
            return { source: "cache" };
          },
        }),
        andThen({
          id: "slow-api",
          execute: async ({ state }) => {
            await delay(700);
            state.signal?.throwIfAborted();
            return { source: "api" };
          },
        }),
      ],
    })
    .andThen({ id: "use-winner", execute: async ({ data }) => data });

  const conditional = createWorkflowChain({
    id: "demo-w-conditional",
    name: "04 · Condition / skip",
    purpose:
      "Run with value=2 and value=0. A conditional step executes for positive values and skips zero.",
    input: numberInput,
    result: z.object({ value: z.number() }),
  })
    .andWhen({
      id: "only-positive",
      condition: async ({ data }) => data.value > 0,
      step: andThen({
        id: "double-positive",
        execute: async ({ data }: { data: { value: number } }) => ({ value: data.value * 2 }),
      }),
    })
    .andThen({ id: "finish-condition", execute: async ({ data }) => data });

  const branch = createWorkflowChain({
    id: "demo-w-branch",
    name: "05 · Conditional branches",
    purpose:
      'Try route="left", "right", "both", or "none". Matching branches execute and non-matching branches stay skipped.',
    input: z.object({ route: z.enum(["left", "right", "both", "none"]).default("both") }),
    result: z.array(z.string()),
  })
    .andBranch({
      id: "choose-routes",
      branches: [
        {
          condition: async ({ data }) => data.route === "left" || data.route === "both",
          step: andThen({ id: "left-route", execute: async () => "left" }),
        },
        {
          condition: async ({ data }) => data.route === "right" || data.route === "both",
          step: andThen({ id: "right-route", execute: async () => "right" }),
        },
      ],
    })
    .andThen({
      id: "selected-routes",
      execute: async ({ data }) => data.filter((item): item is string => item !== undefined),
    });

  const foreach = createWorkflowChain({
    id: "demo-w-foreach",
    name: "06 · For each / concurrency",
    purpose:
      "Run items=[1,2,3] or an empty array. Results preserve input order despite different durations and concurrency=2.",
    input: z.object({ items: z.array(z.number()).default([1, 2, 3]) }),
    result: z.array(z.number()),
  }).andForEach({
    id: "double-items",
    items: async ({ data }) => data.items,
    concurrency: 2,
    step: andThen({
      id: "double-item",
      execute: async ({ data }: { data: number }) => {
        await delay(data === 1 ? 240 : 60);
        return data * 2;
      },
    }),
  });

  const loop = createWorkflowChain({
    id: "demo-w-loop",
    name: "07 · Do while / do until",
    purpose:
      "Starts at zero, increments to three with doWhile, then to five with doUntil. Inspect repeated step instances.",
    input: z.object({}),
    result: z.number(),
  })
    .andThen({ id: "zero", execute: async () => 0 })
    .andDoWhile({
      id: "to-three",
      condition: async ({ data }) => data < 3,
      step: andThen({
        id: "increment-while",
        execute: async ({ data }: { data: number }) => {
          await delay(60);
          return data + 1;
        },
      }),
    })
    .andDoUntil({
      id: "to-five",
      condition: async ({ data }) => data >= 5,
      step: andThen({
        id: "increment-until",
        execute: async ({ data }: { data: number }) => data + 1,
      }),
    });

  const state = createWorkflowChain({
    id: "demo-w-state",
    name: "08 · Map / tap / shared state",
    purpose:
      "Tap records state without replacing data; Map combines original input, an earlier step and a constant. Inspect step I/O and workflow state.",
    input: numberInput,
    result: z.object({ original: z.number(), doubled: z.number(), label: z.string() }),
  })
    .andTap({
      id: "audit-input",
      execute: async ({ data, setWorkflowState, logger }) => {
        setWorkflowState({ audited: data.value });
        logger.info("Demo input audited");
      },
    })
    .andThen({ id: "double", execute: async ({ data }) => ({ value: data.value * 2 }) })
    .andMap({
      id: "map-result",
      map: {
        original: { source: "input", path: "value" },
        doubled: { source: "step", stepId: "double", path: "value" },
        label: { source: "value", value: "mapped" },
      },
    });

  const retry = createWorkflowChain({
    id: "demo-w-retry",
    name: "09 · Step retry",
    purpose:
      "The first two attempts throw; the third succeeds. Verify retry counts and final success. A new run starts fresh.",
    input: z.object({}),
    result: z.object({ attempts: z.number() }),
  }).andThen({
    id: "flaky-step",
    retries: 2,
    execute: async ({ retryCount = 0 }) => {
      if (retryCount < 2) throw new Error(`Demo transient failure ${retryCount + 1}`);
      return { attempts: retryCount + 1 };
    },
  });

  const failure = createWorkflowChain({
    id: "demo-w-failure",
    name: "10 · Failure / schema validation",
    purpose:
      'mode="throw" intentionally fails inside a step; mode="schema" returns an invalid result. Inspect errors. Change mode to "ok" for a successful run.',
    input: z.object({ mode: z.enum(["throw", "schema", "ok"]).default("throw") }),
    result: z.object({ ok: z.boolean() }),
  }).andThen({
    id: "may-fail",
    outputSchema: z.object({ ok: z.boolean() }),
    execute: async ({ data }) => {
      if (data.mode === "throw") throw new Error("Demo workflow failure (intentional)");
      return data.mode === "schema" ? { ok: "invalid" as unknown as boolean } : { ok: true };
    },
  });

  const control = createWorkflowChain({
    id: "demo-w-control",
    name: "11 · Sleep / suspend / cancel",
    purpose:
      "Start the 5-second wait, then Suspend or Cancel. Resume a suspension. Let a fresh run finish to inspect sleep and sleepUntil steps.",
    input: z.object({ waitMs: z.number().min(0).max(15000).default(5000) }),
    result: z.object({ done: z.boolean() }),
  })
    .andSleep({ id: "waiting", duration: async ({ data }) => data.waitMs })
    .andSleepUntil({ id: "until-deadline", date: async () => new Date(Date.now() + 60) })
    .andThen({ id: "after-wait", execute: async () => ({ done: true }) });

  const guardrail = createWorkflowChain({
    id: "demo-w-guardrail",
    name: "12 · Workflow guardrails",
    purpose:
      'The default text is trimmed and digits are redacted. text="block" fails the input guardrail.',
    input: z.object({ text: z.string().default("  Code 123  ") }),
    result: z.string(),
  })
    .andThen({ id: "extract-text", execute: async ({ data }) => data.text })
    .andGuardrail({
      id: "input-policy",
      inputGuardrails: [
        createInputGuardrail({
          name: "Trim or block",
          handler: async ({ input }) =>
            String(input).includes("block")
              ? { pass: false, action: "block", message: "Demo workflow input blocked" }
              : { pass: true, action: "modify", modifiedInput: String(input).trim() },
        }),
      ],
    })
    .andGuardrail({
      id: "redact",
      outputGuardrails: [
        createOutputGuardrail<string>({
          name: "Redact digits",
          handler: async ({ output }) => ({
            pass: true,
            action: "modify",
            modifiedOutput: output.replace(/\d/g, "*"),
          }),
        }),
      ],
    });

  const child = createWorkflowChain({
    id: "demo-child-workflow",
    name: "Demo child",
    input: numberInput,
    result: numberInput,
  }).andThen({ id: "child-double", execute: async ({ data }) => ({ value: data.value * 2 }) });
  const nested = createWorkflowChain({
    id: "demo-w-nested",
    name: "13 · Nested workflow",
    purpose:
      "Runs a child workflow and then increments its output. Expect parent/child traces with inspectable nested steps.",
    input: numberInput,
    result: numberInput,
  })
    .andWorkflow(child.toWorkflow())
    .andThen({ id: "parent-increment", execute: async ({ data }) => ({ value: data.value + 1 }) });

  const classifier = new Agent({
    id: "demo-classifier",
    name: "Demo classifier",
    instructions: "Return structured classification.",
    memory: false,
    model: demoModel("demo-json", () => ({ text: '{"category":"support","priority":"high"}' })),
  });
  const structured = createWorkflowChain({
    id: "demo-w-agent",
    name: "14 · Agent / structured output",
    purpose:
      "Calls an agent with generateText + Output.object, validates the classification, then maps it into a workflow result.",
    input: z.object({ message: z.string().default("Please help with my account") }),
    result: z.object({ category: z.string(), priority: z.string(), routed: z.boolean() }),
  })
    .andAgent(async ({ data }) => data.message, classifier, {
      schema: z.object({ category: z.string(), priority: z.string() }),
    })
    .andThen({
      id: "route-classification",
      execute: async ({ data }) => ({ ...data, routed: true }),
    });
  return {
    trip,
    parallel,
    race,
    conditional,
    branch,
    foreach,
    loop,
    state,
    retry,
    failure,
    control,
    guardrail,
    nested,
    structured,
    exit,
  };
}
