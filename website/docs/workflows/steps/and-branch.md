# andBranch

> Run multiple conditional branches. All branches whose condition is true will execute.

## Quick Start

```typescript
import { createWorkflowChain, andBranch, andThen } from "@voltagent/core";
import { z } from "zod";

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
      condition: ({ data }) => data.amount > 500,
      step: andThen({
        id: "flag-review",
        execute: async ({ data }) => ({ ...data, review: true }),
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

## Behavior

- Conditions are evaluated independently; there is no first-match or else behavior.
- All matching branches run concurrently, so multiple branches can execute.
- For if/else logic, make conditions mutually exclusive or use sequential `andWhen` steps.

## Function Signature

```typescript
.andBranch({
  id: string,
  branches: Array<{
    condition: (ctx) => boolean | Promise<boolean>,
    step: Step
  }>,
  retries?: number,
  name?: string,
  purpose?: string
})
```

## Notes

- Conditions are evaluated independently, so multiple branches can run.
- Results are returned as an array aligned to the `branches` order.
- Branches that do not run return `undefined`.
