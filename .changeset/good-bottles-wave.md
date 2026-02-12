---
"@voltagent/core": minor
---

feat: add `onToolError` hook for customizing tool error payloads before serialization

Example:

```ts
import { Agent, createHooks } from "@voltagent/core";

const agent = new Agent({
  name: "Assistant",
  instructions: "Use tools when needed.",
  model: "openai/gpt-4o-mini",
  hooks: createHooks({
    onToolError: async ({ originalError, error }) => {
      const maybeAxios = (originalError as any).isAxiosError === true;
      if (!maybeAxios) {
        return;
      }

      return {
        output: {
          error: true,
          name: error.name,
          message: originalError.message,
          code: (originalError as any).code,
          status: (originalError as any).response?.status,
        },
      };
    },
  }),
});
```
