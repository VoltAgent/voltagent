---
"@voltagent/core": patch
---

feat: add optional outputSchema validation for tools

VoltAgent now supports optional output schema validation for tools, providing runtime type safety and enabling LLM self-correction when tool outputs don't match expected formats.

**Key Features:**

- **Optional Output Schema**: Tools can now define an `outputSchema` using Zod schemas
- **Runtime Validation**: Tool outputs are validated against the schema when provided
- **LLM Error Recovery**: Validation errors are returned to the LLM instead of throwing, allowing it to retry with corrected output
- **Full Backward Compatibility**: Existing tools without output schemas continue to work as before
- **TypeScript Type Safety**: Output types are inferred from schemas when provided

**Usage Example:**

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

// Define output schema
const weatherOutputSchema = z.object({
  temperature: z.number(),
  condition: z.enum(["sunny", "cloudy", "rainy", "snowy"]),
  humidity: z.number().min(0).max(100),
});

// Create tool with output validation
const weatherTool = createTool({
  name: "getWeather",
  description: "Get current weather",
  parameters: z.object({
    location: z.string(),
  }),
  outputSchema: weatherOutputSchema, // Optional
  execute: async ({ location }) => {
    // Return value will be validated
    return {
      temperature: 22,
      condition: "sunny",
      humidity: 65,
    };
  },
});
```

**Validation Behavior:**

When a tool with `outputSchema` is executed:

1. The output is validated against the schema
2. If validation succeeds, the validated output is returned
3. If validation fails, an error object is returned to the LLM:
   ```json
   {
     "error": true,
     "message": "Output validation failed: Expected number, received string",
     "validationErrors": [...],
     "actualOutput": {...}
   }
   ```
4. The LLM can see the error and potentially fix it by calling the tool again

This feature enhances tool reliability while maintaining the flexibility for LLMs to handle validation errors gracefully.
