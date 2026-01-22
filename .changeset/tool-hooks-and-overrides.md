---
"@voltagent/core": minor
---

feat: allow tool-specific hooks and let `onToolEnd` override tool output #975

Tool hooks run alongside agent hooks. `onToolEnd` can now return `{ output }` to replace the tool result (validated again if an output schema exists).

```ts
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const normalizeTool = createTool({
  name: "normalize_text",
  description: "Normalizes and truncates text",
  parameters: z.object({ text: z.string() }),
  execute: async ({ text }) => text,
  hooks: {
    onStart: ({ tool }) => {
      console.log(`[tool] ${tool.name} starting`);
    },
    onEnd: ({ output }) => {
      if (typeof output === "string") {
        return { output: output.slice(0, 1000) };
      }
    },
  },
});

const agent = new Agent({
  name: "ToolHooksAgent",
  instructions: "Use tools as needed.",
  model: myModel,
  tools: [normalizeTool],
  hooks: {
    onToolEnd: ({ output }) => {
      if (typeof output === "string") {
        return { output: output.trim() };
      }
    },
  },
});
```
