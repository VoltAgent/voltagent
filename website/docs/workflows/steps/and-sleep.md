# andSleep

> Pause the workflow for a fixed or computed duration (milliseconds).

## Quick Start

```typescript
import { createWorkflowChain, andSleep, andThen } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "delayed-step",
  input: z.object({ id: z.string() }),
})
  .andSleep({
    id: "pause",
    duration: 500,
  })
  .andThen({
    id: "continue",
    execute: async ({ data }) => ({ ...data, resumed: true }),
  });
```

## Function Signature

```typescript
.andSleep({
  id: string,
  duration: number | ((ctx) => number | Promise<number>),
  retries?: number,
  name?: string,
  purpose?: string
})
```

## Notes

- The input data is returned unchanged.
- If a suspend or cancel signal is triggered, the sleep ends early.
