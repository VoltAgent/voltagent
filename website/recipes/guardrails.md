---
id: guardrails
title: Guardrails
slug: guardrails
description: Add input and output safety filters to protect your agents.
---

# Guardrails

Guardrails filter harmful inputs and sanitize sensitive outputs to keep your agents safe.

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import {
  Agent,
  VoltAgent,
  createDefaultInputSafetyGuardrails,
  createMaxLengthGuardrail,
  createSensitiveNumberGuardrail,
} from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

const agent = new Agent({
  name: "Safe Agent",
  instructions: "A helpful but safe assistant",
  model: openai("gpt-4o-mini"),

  // Input guardrails - block harmful prompts
  inputGuardrails: createDefaultInputSafetyGuardrails(),

  // Output guardrails - sanitize responses
  outputGuardrails: [
    createSensitiveNumberGuardrail({ replacement: "[redacted]" }),
    createMaxLengthGuardrail({ maxCharacters: 500 }),
  ],
});

new VoltAgent({
  agents: { agent },
  server: honoServer({ port: 3141 }),
});
```

## Built-in Guardrails

### Input Guardrails

```typescript
import { createDefaultInputSafetyGuardrails, createProfanityInputGuardrail } from "@voltagent/core";

// Block profanity, injection attacks, etc.
inputGuardrails: createDefaultInputSafetyGuardrails();

// Or specific guardrails
inputGuardrails: [createProfanityInputGuardrail()];
```

### Output Guardrails

```typescript
import { createSensitiveNumberGuardrail, createMaxLengthGuardrail } from "@voltagent/core";

outputGuardrails: [
  // Redact credit cards, SSNs, etc.
  createSensitiveNumberGuardrail({ replacement: "[REDACTED]" }),

  // Limit response length
  createMaxLengthGuardrail({ maxCharacters: 1000 }),
];
```

## Custom Guardrails

### Custom Input Guardrail

Block or modify user inputs before they reach the agent:

```typescript
import { createInputGuardrail } from "@voltagent/core";

// Block specific topics
const topicBlocker = createInputGuardrail({
  id: "topic-blocker",
  name: "Topic Blocker",
  description: "Blocks requests about restricted topics",
  handler: async ({ input }) => {
    const blockedTopics = ["illegal", "hacking", "exploit"];
    const inputLower = input.toLowerCase();

    for (const topic of blockedTopics) {
      if (inputLower.includes(topic)) {
        return {
          pass: false,
          message: `Sorry, I can't help with topics related to "${topic}".`,
        };
      }
    }

    return { pass: true };
  },
});

// Modify input before processing
const inputSanitizer = createInputGuardrail({
  id: "input-sanitizer",
  name: "Input Sanitizer",
  description: "Removes PII from user input",
  handler: async ({ input }) => {
    // Remove email addresses
    const sanitized = input.replace(/[\w.-]+@[\w.-]+\.\w+/gi, "[email removed]");

    return {
      pass: true,
      action: "modify",
      modifiedInput: sanitized,
    };
  },
});

const agent = new Agent({
  name: "Safe Agent",
  model: openai("gpt-4o-mini"),
  inputGuardrails: [topicBlocker, inputSanitizer],
});
```

### Custom Output Guardrail

Sanitize or block agent responses:

```typescript
import { createOutputGuardrail } from "@voltagent/core";

const fundingRedactor = createOutputGuardrail({
  id: "funding-redactor",
  name: "Funding Redactor",
  description: "Masks funding amounts",
  handler: async ({ output }) => {
    if (typeof output !== "string") return { pass: true };

    const sanitized = output.replace(/funding:\s*\$\d+/gi, "funding: [redacted]");

    return {
      pass: true,
      action: "modify",
      modifiedOutput: sanitized,
    };
  },
});

// Block responses that contain competitor mentions
const competitorBlocker = createOutputGuardrail({
  id: "competitor-blocker",
  name: "Competitor Blocker",
  description: "Prevents mentioning competitors",
  handler: async ({ output }) => {
    if (typeof output !== "string") return { pass: true };

    const competitors = ["CompetitorA", "CompetitorB"];
    for (const competitor of competitors) {
      if (output.includes(competitor)) {
        return {
          pass: false,
          message: "I cannot discuss competitor products.",
        };
      }
    }

    return { pass: true };
  },
});
```

## Full Example

See the complete example: [with-guardrails on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-guardrails)
