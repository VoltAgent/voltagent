---
"@voltagent/core": patch
---

feat: add workflow control steps (branch, foreach, loop, map, sleep)

```ts
import {
  createWorkflowChain,
  andThen,
  andBranch,
  andForEach,
  andDoWhile,
  andDoUntil,
  andMap,
  andSleep,
  andSleepUntil,
} from "@voltagent/core";
import { z } from "zod";
```

Branching:

```ts
const workflow = createWorkflowChain({
  id: "branching-flow",
  input: z.object({ amount: z.number() }),
}).andBranch({
  id: "rules",
  branches: [
    {
      condition: ({ data }) => data.amount > 1000,
      step: andThen({
        id: "flag-large",
        execute: async ({ data }) => ({ ...data, large: true }),
      }),
    },
    {
      condition: ({ data }) => data.amount < 0,
      step: andThen({
        id: "flag-invalid",
        execute: async ({ data }) => ({ ...data, invalid: true }),
      }),
    },
  ],
});
```

For-each and loops:

```ts
createWorkflowChain({
  id: "batch-process",
  input: z.array(z.number()),
}).andForEach({
  id: "double-each",
  concurrency: 2,
  step: andThen({
    id: "double",
    execute: async ({ data }) => data * 2,
  }),
});

createWorkflowChain({
  id: "looping-flow",
  input: z.number(),
})
  .andDoWhile({
    id: "increment-until-3",
    step: andThen({
      id: "increment",
      execute: async ({ data }) => data + 1,
    }),
    condition: ({ data }) => data < 3,
  })
  .andDoUntil({
    id: "increment-until-2",
    step: andThen({
      id: "increment-until",
      execute: async ({ data }) => data + 1,
    }),
    condition: ({ data }) => data >= 2,
  });
```

Data shaping:

```ts
createWorkflowChain({
  id: "compose-result",
  input: z.object({ userId: z.string() }),
})
  .andThen({
    id: "fetch-user",
    execute: async ({ data }) => ({ name: "Ada", id: data.userId }),
  })
  .andMap({
    id: "shape-output",
    map: {
      userId: { source: "data", path: "userId" },
      name: { source: "step", stepId: "fetch-user", path: "name" },
      region: { source: "context", key: "region" },
      constant: { source: "value", value: "ok" },
    },
  });
```

Sleep:

```ts
createWorkflowChain({
  id: "delayed-step",
  input: z.object({ id: z.string() }),
})
  .andSleep({
    id: "pause",
    duration: 500,
  })
  .andSleepUntil({
    id: "wait-until",
    date: () => new Date(Date.now() + 60_000),
  })
  .andThen({
    id: "continue",
    execute: async ({ data }) => ({ ...data, resumed: true }),
  });
```

Workflow-level retries:

```ts
createWorkflowChain({
  id: "retry-defaults",
  retryConfig: { attempts: 2, delayMs: 500 },
})
  .andThen({
    id: "fetch-user",
    execute: async ({ data }) => fetchUser(data.userId),
  })
  .andThen({
    id: "no-retry-step",
    retries: 0,
    execute: async ({ data }) => data,
  });
```

Workflow hooks (finish/error/suspend):

```ts
createWorkflowChain({
  id: "hooked-workflow",
  hooks: {
    onSuspend: async (info) => {
      console.log("Suspended:", info.suspension?.reason);
    },
    onError: async (info) => {
      console.error("Failed:", info.error);
    },
    onFinish: async (info) => {
      console.log("Done:", info.status);
    },
    onEnd: async (state, info) => {
      if (info?.status === "completed") {
        console.log("Result:", state.result);
        console.log("Steps:", Object.keys(info.steps));
      }
    },
  },
});
```

Workflow guardrails (input/output + step-level):

```ts
import {
  andGuardrail,
  andThen,
  createInputGuardrail,
  createOutputGuardrail,
  createWorkflowChain,
} from "@voltagent/core";
import { z } from "zod";

const trimInput = createInputGuardrail({
  name: "trim",
  handler: async ({ input }) => ({
    pass: true,
    action: "modify",
    modifiedInput: typeof input === "string" ? input.trim() : input,
  }),
});

const redactOutput = createOutputGuardrail<string>({
  name: "redact",
  handler: async ({ output }) => ({
    pass: true,
    action: "modify",
    modifiedOutput: output.replace(/[0-9]/g, "*"),
  }),
});

createWorkflowChain({
  id: "guarded-workflow",
  input: z.string(),
  result: z.string(),
  inputGuardrails: [trimInput],
  outputGuardrails: [redactOutput],
})
  .andGuardrail({
    id: "sanitize-step",
    outputGuardrails: [redactOutput],
  })
  .andThen({
    id: "finish",
    execute: async ({ data }) => data,
  });
```
