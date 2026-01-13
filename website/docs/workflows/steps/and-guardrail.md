# andGuardrail

> Apply guardrails to the current workflow data to validate or sanitize it.

## Quick Start

```typescript
import { createWorkflowChain, andGuardrail, createOutputGuardrail } from "@voltagent/core";
import { z } from "zod";

const redactNumbers = createOutputGuardrail<string>({
  name: "redact-numbers",
  handler: async ({ output }) => ({
    pass: true,
    action: "modify",
    modifiedOutput: output.replace(/\d/g, "*"),
  }),
});

const workflow = createWorkflowChain({
  id: "guarded-flow",
  input: z.string(),
  result: z.string(),
})
  .andGuardrail({
    id: "sanitize-input",
    outputGuardrails: [redactNumbers],
  })
  .andThen({
    id: "finish",
    execute: async ({ data }) => data,
  });

const result = await workflow.run("Order #123");
// Result: "Order ###"
```

## How It Works

- `inputGuardrails` run first and only accept string or message inputs.
- `outputGuardrails` run after and can validate/modify structured data.
- If a guardrail blocks, the workflow throws an error (like agent guardrails).
- If your guardrails need agent APIs or metadata, pass `guardrailAgent` on the workflow config or run options.

```typescript
.andGuardrail({
  id: "check-text",
  inputGuardrails: [myInputGuardrail],
  outputGuardrails: [myOutputGuardrail],
})
```

## Input Guardrails (string/messages only)

```typescript
import { createInputGuardrail } from "@voltagent/core";

const trimGuardrail = createInputGuardrail({
  name: "trim-input",
  handler: async ({ input }) => ({
    pass: true,
    action: "modify",
    modifiedInput: typeof input === "string" ? input.trim() : input,
  }),
});

createWorkflowChain({
  id: "trim-flow",
  input: z.string(),
  result: z.string(),
})
  .andGuardrail({
    id: "trim",
    inputGuardrails: [trimGuardrail],
  })
  .andThen({
    id: "echo",
    execute: async ({ data }) => data,
  });
```

If your data is an object, prefer `outputGuardrails` to inspect or mutate fields.

## Structured Data Guardrails

```typescript
const maskEmail = createOutputGuardrail<{ email: string }>({
  name: "mask-email",
  handler: async ({ output }) => ({
    pass: true,
    action: "modify",
    modifiedOutput: {
      ...output,
      email: output.email.replace(/@.*/, "@***"),
    },
  }),
});

createWorkflowChain({
  id: "profile-guard",
  input: z.object({ email: z.string() }),
  result: z.object({ email: z.string() }),
})
  .andGuardrail({
    id: "mask",
    outputGuardrails: [maskEmail],
  })
  .andThen({
    id: "finish",
    execute: async ({ data }) => data,
  });
```
