---
"@voltagent/core": patch
---

feat: add guardrails - #677

## Guardrails overview

- streamText/generateText now run guardrails through a dedicated pipeline
  - streaming handlers can redact or drop chunks in-flight
  - final handlers see the original and sanitized text + provider metadata
- guardrail spans inherit the guardrail name so VoltOps shows human-readable labels
- helper factories: createSensitiveNumberGuardrail, createEmailRedactorGuardrail, createPhoneNumberGuardrail, createProfanityGuardrail, createMaxLengthGuardrail, createDefaultPIIGuardrails, createDefaultSafetyGuardrails

### Usage

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { createSensitiveNumberGuardrail, createDefaultSafetyGuardrails } from "@voltagent/core";

const agent = new Agent({
  name: "Guarded Assistant",
  instructions: "Answer without leaking PII.",
  model: openai("gpt-4o-mini"),
  outputGuardrails: [
    createSensitiveNumberGuardrail(),
    createDefaultSafetyGuardrails({ maxLength: { maxCharacters: 400 } }),
  ],
});

const response = await agent.streamText("Customer card 4242 4242 1234 5678");
console.log(await response.text); // Sanitized output with digits redacted + length capped
```
