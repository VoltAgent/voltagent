---
"@voltagent/core": patch
---

feat: support streaming tool outputs by returning an AsyncIterable from `execute`, emitting preliminary results before the final output.

```ts
import { createTool } from "@voltagent/core";
import { z } from "zod";

const weatherTool = createTool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string(),
  }),
  async *execute({ location }) {
    yield { status: "loading" as const, text: `Getting weather for ${location}` };

    await new Promise((resolve) => setTimeout(resolve, 3000));

    const temperature = 72;
    yield {
      status: "success" as const,
      text: `The weather in ${location} is ${temperature}F`,
      temperature,
    };
  },
});
```
