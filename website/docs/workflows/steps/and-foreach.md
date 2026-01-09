# andForEach

> Run a step for each item in an array and return all results.

## Quick Start

```typescript
import { createWorkflowChain, andForEach, andThen } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
  id: "batch-process",
  input: z.array(z.number()),
}).andForEach({
  id: "double-each",
  step: andThen({
    id: "double",
    execute: async ({ data }) => data * 2,
  }),
});
```

## Function Signature

```typescript
.andForEach({
  id: string,
  step: Step,
  concurrency?: number,
  retries?: number,
  name?: string,
  purpose?: string
})
```

## Notes

- The current workflow data must be an array.
- Results preserve the original order.
- Use `concurrency` to control parallelism.
