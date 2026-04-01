# andSleepUntil

> Pause the workflow until a specific Date.

## Quick Start

```typescript
import { createWorkflowChain, andSleepUntil, andThen } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "scheduled-step",
  input: z.object({ id: z.string() }),
})
  .andSleepUntil({
    id: "wait-until",
    date: new Date(Date.now() + 60_000),
  })
  .andThen({
    id: "continue",
    execute: async ({ data }) => ({ ...data, resumed: true }),
  });
```

## Function Signature

```typescript
.andSleepUntil({
  id: string,
  date: Date | ((ctx) => Date | Promise<Date>),
  retries?: number,
  name?: string,
  purpose?: string
})
```

## Notes

- The input data is returned unchanged.
- If the date is in the past, the step continues immediately.
