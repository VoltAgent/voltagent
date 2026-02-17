# andLoop

> Repeat one or more steps with do-while or do-until semantics.

## Quick Start

### Do-While

```typescript
import { createWorkflowChain, andDoWhile, andThen } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "retry-loop",
  input: z.number(),
}).andDoWhile({
  id: "increment-until-3",
  steps: [
    andThen({
      id: "increment",
      execute: async ({ data }) => data + 1,
    }),
    andThen({
      id: "double",
      execute: async ({ data }) => data * 2,
    }),
  ],
  condition: ({ data }) => data < 3,
});
```

### Do-Until

```typescript
import { createWorkflowChain, andDoUntil, andThen } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "until-loop",
  input: z.number(),
}).andDoUntil({
  id: "increment-until-2",
  step: andThen({
    id: "increment",
    execute: async ({ data }) => data + 1,
  }),
  condition: ({ data }) => data >= 2,
});
```

## Function Signature

```typescript
.andDoWhile({
  id: string,
  step?: Step,
  steps?: Step[],
  condition: (ctx) => boolean | Promise<boolean>,
  retries?: number,
  name?: string,
  purpose?: string
})

.andDoUntil({
  id: string,
  step?: Step,
  steps?: Step[],
  condition: (ctx) => boolean | Promise<boolean>,
  retries?: number,
  name?: string,
  purpose?: string
})
```

## Notes

- Provide either `step` (single step) or `steps` (multiple sequential steps).
- The configured step(s) run at least once.
- When `steps` is provided, steps run in order on each iteration.
- The loop continues until the condition fails (do-while) or succeeds (do-until).
