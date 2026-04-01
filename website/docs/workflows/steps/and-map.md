# andMap

> Compose a new object from workflow data, input, context, or step outputs.

## Quick Start

```typescript
import { createWorkflowChain, andMap, andThen } from "@voltagent/core";
import { z } from "zod";

const workflow = createWorkflowChain({
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

## Function Signature

```typescript
.andMap({
  id: string,
  map: {
    [key: string]:
      | { source: "value", value: any }
      | { source: "data", path?: string }
      | { source: "input", path?: string }
      | { source: "context", key: string, path?: string }
      | { source: "step", stepId: string, path?: string }
      | { source: "fn", fn: (ctx) => any }
  },
  retries?: number,
  name?: string,
  purpose?: string
})
```

## Notes

- `data` refers to the current step input; `input` refers to the original workflow input.
- `context` reads from `WorkflowRunOptions.context` (either a `Map` or a plain object).
- `path` uses dot notation; use `"."` or omit it to return the full value.
- `step` reads from a step's output when available, otherwise its input.
- Missing `stepId` or invalid `path` throws an error.
- Map entries resolve in definition order and can be async.
