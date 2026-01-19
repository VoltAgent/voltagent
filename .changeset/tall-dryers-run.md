---
"@voltagent/core": patch
---

fix: allow `andAgent` schema to accept `Output.*` specs (arrays, choices, json, text)

`andAgent` now supports the same output flexibility as `agent.generateText`, so you can return non-object
structures from workflow steps.

Usage:

```ts
import { Output } from "ai";
import { z } from "zod";
import { Agent, createWorkflowChain } from "@voltagent/core";

const agent = new Agent({
  name: "Tagger",
  model: "openai/gpt-4o-mini",
  instructions: "Return tags only.",
});

const workflow = createWorkflowChain({
  id: "tag-workflow",
  input: z.object({ topic: z.string() }),
}).andAgent(async ({ data }) => `List tags for ${data.topic}`, agent, {
  schema: Output.array({ element: z.string() }),
});

const result = await workflow.run({ topic: "workflows" });
// result: string[]
```
