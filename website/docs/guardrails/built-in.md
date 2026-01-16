---
title: Built-in Guardrails
slug: /guardrails/built-in
---

# Built-in Guardrails

VoltAgent provides helper factories for common input and output guardrails. Each factory returns a configured guardrail that you can register on an agent. The helpers follow the same patterns described in the [Guardrails Overview](./overview.md) guide.

## Output Guardrails

Output guardrails process model-generated content before it reaches the application or user.

### Sensitive Number Guardrail

```ts
import { createSensitiveNumberGuardrail } from "@voltagent/core";

const guardrail = createSensitiveNumberGuardrail({
  minimumDigits: 6,
  replacement: "[redacted]",
});
```

- Replaces digit runs longer than `minimumDigits` with `replacement` during streaming
- Default `minimumDigits: 4` catches most credit cards and account numbers
- Final handler returns the sanitized text and records the original and sanitized lengths in guardrail metadata

### Email Guardrail

```ts
import { createEmailRedactorGuardrail } from "@voltagent/core";

const guardrail = createEmailRedactorGuardrail({
  replacement: "[hidden-email]",
});
```

- Streams hold a small buffer so that addresses split across chunks are still redacted
- The final handler only modifies the output if an address was detected
- Default replacement: `[redacted-email]`

### Phone Number Guardrail

```ts
import { createPhoneNumberGuardrail } from "@voltagent/core";

const guardrail = createPhoneNumberGuardrail({
  replacement: "[hidden-phone]",
});
```

- Treats only numeric content with at least seven digits as a phone number so short IDs are not removed inadvertently
- Default replacement: `[redacted-phone]`

### Profanity Guardrail

```ts
import { createProfanityGuardrail } from "@voltagent/core";

const guardrail = createProfanityGuardrail({
  mode: "redact",
  replacement: "[censored]",
  bannedWords: ["darn"],
});
```

- `mode: "redact"` (default) replaces matches with `replacement`
- `mode: "block"` calls `abort()` instead, terminating the stream
- You can extend the banned word list with the `bannedWords` option
- Default replacement: `[censored]`

### Max Length Guardrail

```ts
import { createMaxLengthGuardrail } from "@voltagent/core";

const guardrail = createMaxLengthGuardrail({
  maxCharacters: 280,
  mode: "truncate",
});
```

- Tracks emitted characters during streaming and truncates once `maxCharacters` is reached
- `mode: "truncate"` (default) stops emitting chunks after limit
- `mode: "block"` aborts when the threshold is exceeded
- The final handler records both the original and sanitized lengths so VoltOps displays a completion instead of a pending guardrail span

### Output Bundles

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
  model: "openai/gpt-4o-mini",
  outputGuardrails: [...piiGuardrails, ...safetyGuardrails],
});
```

- `createDefaultPIIGuardrails()` combines the sensitive number, email, and phone guardrails
- `createDefaultSafetyGuardrails()` adds the profanity guardrail and optionally the max-length guardrail

Each helper can be customised through the same options exposed by the individual factories. Register the returned guardrails directly in the agent configuration.

## Input Guardrails

Input guardrails process user-provided content before it reaches the model.

### Profanity Input Guardrail

```ts
import { createProfanityInputGuardrail } from "@voltagent/core";

const guardrail = createProfanityInputGuardrail({
  mode: "mask",
  replacement: "[censored]",
  bannedWords: ["badword", "offensive"],
  message: "Please avoid offensive language.",
});
```

- `mode: "mask"` (default) replaces profanity with `replacement` text
- `mode: "block"` blocks the entire request with the provided `message`
- Custom `bannedWords` array extends the default list
- Default replacement: `[censored]`
- Default message: "Please avoid offensive language and try phrasing your request differently."

### PII Input Guardrail

```ts
import { createPIIInputGuardrail } from "@voltagent/core";

const guardrail = createPIIInputGuardrail({
  replacement: "[redacted]",
  maskEmails: true,
  maskPhones: true,
  message: "Sensitive information detected.",
});
```

- Detects emails, phone numbers, and long digit sequences (4+ digits)
- `maskEmails: true` (default) masks email addresses
- `maskPhones: true` (default) masks phone numbers
- Replaces detected PII with `replacement` text
- Default replacement: `[redacted]`
- Default message: "Sensitive personal information was detected. Please remove it and try again."

### Prompt Injection Guardrail

```ts
import { createPromptInjectionGuardrail } from "@voltagent/core";

const guardrail = createPromptInjectionGuardrail({
  phrases: ["ignore previous instructions", "system prompt:", "forget all your rules"],
  message: "Request blocked for safety reasons.",
});
```

- Detects common prompt injection attempts
- Default phrases include: "ignore previous instructions", "system prompt:", "forget all your rules", "act as system", "override safety"
- Always blocks the request (no mask mode available)
- Custom `phrases` array replaces the default list
- Default message: "The request contains instructions that attempt to override the assistant's safety policies."

### Input Length Guardrail

```ts
import { createInputLengthGuardrail } from "@voltagent/core";

const guardrail = createInputLengthGuardrail({
  maxCharacters: 5000,
  mode: "block",
  message: "Input too long. Please shorten your request.",
});
```

- `maxCharacters` (required) sets the character limit
- `mode: "block"` (default) blocks requests exceeding the limit
- `mode: "truncate"` truncates input to `maxCharacters`
- Default message: "Input exceeds the maximum length of \{maxCharacters\} characters. Please shorten your request."

### HTML Sanitizer Guardrail

```ts
import { createHTMLSanitizerInputGuardrail } from "@voltagent/core";

const guardrail = createHTMLSanitizerInputGuardrail({
  allowBasicFormatting: true,
  message: "HTML tags were removed from your request.",
});
```

- `allowBasicFormatting: true` (default) keeps safe formatting tags (b, strong, i, em, u, code)
- `allowBasicFormatting: false` strips all HTML tags
- Always removes `<script>`, `<style>` tags and HTML comments
- Modifies input by stripping detected markup
- Default message: "Markup was removed from your request to keep things safe."

### Input Bundles

A helper function assembles common input guardrails:

```ts
import { createDefaultInputSafetyGuardrails } from "@voltagent/core";

const inputGuardrails = createDefaultInputSafetyGuardrails();

const agent = new Agent({
  name: "Support",
  instructions: "Answer user questions safely",
  model: "openai/gpt-4o-mini",
  inputGuardrails,
});
```

`createDefaultInputSafetyGuardrails()` returns an array containing:

- Profanity Input Guardrail (mask mode)
- PII Input Guardrail (masks emails and phones)
- Prompt Injection Guardrail
- HTML Sanitizer Guardrail (allows basic formatting)

These guardrails execute in order before the input reaches the model. If any guardrail blocks the input, execution stops and an error is thrown.
