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

## Selector and Map

Use `items` to select an array from the current data and `map` to shape each item before running the step:

```typescript
createWorkflowChain({
  id: "batch-process",
  input: z.object({
    label: z.string(),
    values: z.array(z.number()),
  }),
}).andForEach({
  id: "label-items",
  items: ({ data }) => data.values,
  map: ({ data }, item) => ({ label: data.label, value: item }),
  step: andThen({
    id: "format",
    execute: async ({ data }) => `${data.label}:${data.value}`,
  }),
});
```

## Function Signature

```typescript
.andForEach({
  id: string,
  step: Step,
  concurrency?: number,
  items?: (context) => Item[],
  map?: (context, item, index) => MappedItem,
  retries?: number,
  name?: string,
  purpose?: string
})
```

## Notes

- The current workflow data must be an array unless you provide `items`.
- Results preserve the original order.
- Use `concurrency` to control parallelism.
- Use `map` to keep parent context while reshaping items for the inner step.
