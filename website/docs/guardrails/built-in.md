---
title: Built-in Guardrails
slug: /guardrails/built-in
---

# Built-in Guardrails

VoltAgent provides helper factories for common output constraints. Each factory returns an `OutputGuardrail<string>` that you can register on an agent. The helpers follow the same streaming/final pattern described in the [Guardrails](./overview.md) guide.

## Sensitive Number Guardrail

```ts
import { createSensitiveNumberGuardrail } from "@voltagent/core";

const guardrail = createSensitiveNumberGuardrail({
  minimumDigits: 6,
  replacement: "[redacted]",
});
```

- Replaces digit runs longer than `minimumDigits` with `replacement` during streaming.
- Final handler returns the sanitized text and records the original and sanitized lengths in guardrail metadata.

## Email Guardrail

```ts
import { createEmailRedactorGuardrail } from "@voltagent/core";

const guardrail = createEmailRedactorGuardrail({
  replacement: "[hidden-email]",
});
```

- Streams hold a small buffer so that addresses split across chunks are still redacted.
- The final handler only modifies the output if an address was detected.

## Phone Number Guardrail

```ts
import { createPhoneNumberGuardrail } from "@voltagent/core";

const guardrail = createPhoneNumberGuardrail({
  replacement: "[hidden-phone]",
});
```

The guardrail treats only numeric content with at least seven digits as a phone number so short IDs are not removed inadvertently.

## Profanity Guardrail

```ts
import { createProfanityGuardrail } from "@voltagent/core";

const guardrail = createProfanityGuardrail({
  mode: "redact",
  replacement: "[censored]",
  bannedWords: ["darn"],
});
```

- `mode: "redact"` replaces matches; `mode: "block"` calls `abort()` instead.
- You can extend the banned word list with the `bannedWords` option.

## Max Length Guardrail

```ts
import { createMaxLengthGuardrail } from "@voltagent/core";

const guardrail = createMaxLengthGuardrail({
  maxCharacters: 280,
  mode: "truncate",
});
```

- Tracks emitted characters during streaming and truncates once `maxCharacters` is reached.
- The final handler records both the original and sanitized lengths so VoltOps displays a completion instead of a pending guardrail span.
- Switch to `mode: "block"` to abort when the threshold is exceeded.

## Bundles

Two helper functions assemble common guardrail sets:

```ts
import { createDefaultPIIGuardrails, createDefaultSafetyGuardrails } from "@voltagent/core";

const piiGuardrails = createDefaultPIIGuardrails();
const safetyGuardrails = createDefaultSafetyGuardrails({
  profanity: { mode: "redact" },
  maxLength: { maxCharacters: 500 },
});

const agent = new Agent({
  name: "Support",
  instructions: "Answer without revealing PII",
  model: openai("gpt-4o-mini"),
  outputGuardrails: [...piiGuardrails, ...safetyGuardrails],
});
```

- `createDefaultPIIGuardrails` combines the sensitive number, email, and phone guardrails.
- `createDefaultSafetyGuardrails` adds the profanity guardrail and optionally the max-length guardrail.

Each helper can be customised through the same options exposed by the individual factories. Register the returned guardrails directly in the agent configuration; no additional wiring is required.
