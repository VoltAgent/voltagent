---
title: Overview
slug: /guardrails/overview
---

# Guardrails

Guardrails intercept and modify agent input or output at runtime. They run before user input reaches the model (input guardrails) or after the model generates output (output guardrails). Each guardrail can inspect content, modify it, or block the operation entirely.

Guardrails are created using helper functions `createInputGuardrail()` and `createOutputGuardrail()`, which provide type safety and IDE autocomplete.

## Output Guardrails

Output guardrails process model-generated content before it reaches the application or user. They can modify streaming chunks in real-time and validate the final output.

### When to Use Output Guardrails

Use output guardrails to:

- Redact sensitive information (emails, phone numbers, credit cards) from model output
- Enforce content policies by blocking profanity or inappropriate content
- Limit output length to fit UI constraints or API quotas
- Transform content in real-time during streaming (e.g., replace patterns as they appear)
- Validate that model output meets structural or business requirements

### Core Concepts

#### Handler vs StreamHandler

Output guardrails define two optional functions:

**`handler`** runs once after the model finishes generating. It receives the complete output and returns a result indicating whether to allow, modify, or block it.

```ts
handler: async ({ output, originalOutput, context }) => {
  // Validate or transform complete output
  if (output.length > 1000) {
    return { pass: false, action: "block", message: "Output too long" };
  }
  return { pass: true };
};
```

**`streamHandler`** runs on each chunk as the model streams output. It can modify the chunk, drop it by returning `null`, or abort the entire stream.

```ts
streamHandler: ({ part, state }) => {
  if (part.type !== "text-delta") return part;

  // Access delta property (with text fallback for compatibility)
  const chunk = part.delta ?? part.text ?? "";
  const sanitized = chunk.replace(/\d{4,}/g, "[digits]");

  return { ...part, delta: sanitized, text: undefined };
};
```

Use `streamHandler` when you need to modify content in real-time as it streams to the user. Use `handler` when you need to validate or transform the complete output after streaming finishes.

#### Actions

A guardrail result specifies one of three actions:

- **`allow`**: Pass the content through unchanged
- **`modify`**: Replace the content with `modifiedOutput` or `modifiedInput`
- **`block`**: Reject the operation and throw an error

```ts
handler: async ({ output }) => {
  if (containsPII(output)) {
    return {
      pass: true,
      action: "modify",
      modifiedOutput: redactPII(output),
      message: "PII redacted",
    };
  }
  return { pass: true, action: "allow" };
};
```

If you set `pass: false`, the framework infers `action: "block"` and terminates the operation with a `VoltAgentError`.

#### State Sharing

Both `streamHandler` and `handler` receive the same `state` object. Use this to track information during streaming and reference it in the final handler.

```ts
streamHandler: ({ part, state }) => {
  if (part.type !== "text-delta") return part;

  // Initialize state on first chunk
  state.counter ??= { chunks: 0, redacted: 0 };
  state.counter.chunks++;

  const chunk = part.delta ?? part.text ?? "";
  if (chunk.includes("secret")) {
    state.counter.redacted++;
    return { ...part, delta: chunk.replace(/secret/g, "[redacted]"), text: undefined };
  }
  return part;
};

handler: async ({ output, context }) => {
  const counter = context.context.get("counter") ?? { chunks: 0, redacted: 0 };

  return {
    pass: true,
    metadata: {
      totalChunks: counter.chunks,
      redactedChunks: counter.redacted,
    },
  };
};
```

#### Aborting Streams

Call `abort(reason)` in a `streamHandler` to terminate streaming immediately with an error.

```ts
streamHandler: ({ part, abort }) => {
  if (part.type !== "text-delta") return part;

  const chunk = part.delta ?? part.text ?? "";
  if (chunk.includes("forbidden")) {
    abort("Content policy violation detected");
  }
  return part;
};
```

The framework marks the guardrail span with `SpanStatusCode.ERROR` and throws a `VoltAgentError` with your reason.

### Step-by-Step Tutorial

#### 1. Handler-Only Guardrail: Validate Final Output

This guardrail checks the complete output after the model finishes generating. It blocks responses that don't include a required disclaimer.

```ts
import { createOutputGuardrail } from "@voltagent/core";

const disclaimerGuardrail = createOutputGuardrail({
  id: "require-disclaimer",
  name: "Require Disclaimer",

  handler: async ({ output }) => {
    if (typeof output !== "string") {
      return { pass: true };
    }

    if (!output.includes("Not financial advice")) {
      return {
        pass: false,
        action: "block",
        message: "Response must include disclaimer",
      };
    }

    return { pass: true };
  },
});
```

#### 2. Stream-Only Guardrail: Modify Chunks in Real-Time

This guardrail redacts long digit sequences as they stream. Users never see the original digits.

```ts
import { createOutputGuardrail } from "@voltagent/core";

const digitGuardrail = createOutputGuardrail({
  id: "redact-digits",
  name: "Redact Digit Sequences",

  streamHandler: ({ part }) => {
    if (part.type !== "text-delta") {
      return part;
    }

    // Extract chunk text (delta preferred, text fallback)
    const chunk = part.delta ?? part.text ?? "";
    if (!chunk) return part;

    const redacted = chunk.replace(/\d{4,}/g, "[digits]");

    // Return modified part without original text field
    return {
      ...part,
      delta: redacted,
      text: undefined,
    };
  },
});
```

#### 3. Combined Guardrail with State: Stream + Final Handler

This guardrail tracks redactions during streaming and reports them in the final handler.

```ts
import { createOutputGuardrail } from "@voltagent/core";

type RedactionState = { redactions: number };

const trackingGuardrail = createOutputGuardrail({
  id: "track-redactions",
  name: "Track Redactions",

  streamHandler: ({ part, state }) => {
    if (part.type !== "text-delta") {
      return part;
    }

    // Extract chunk text
    const chunk = part.delta ?? part.text ?? "";
    if (!chunk) return part;

    // Initialize state
    const guardState = (state.tracking ??= { redactions: 0 } as RedactionState);

    const redacted = chunk.replace(/\d{4,}/g, (match) => {
      guardState.redactions++;
      return "[digits]";
    });

    return { ...part, delta: redacted, text: undefined };
  },

  handler: async ({ output, originalOutput, context }) => {
    // Access state from streaming phase
    const guardState = context.context.get("tracking") as RedactionState | undefined;

    if (!guardState || guardState.redactions === 0) {
      return { pass: true };
    }

    return {
      pass: true,
      action: "modify",
      modifiedOutput: output,
      message: `Redacted ${guardState.redactions} digit sequence(s)`,
      metadata: {
        redactionCount: guardState.redactions,
        originalLength: originalOutput?.length,
        sanitizedLength: output?.length,
      },
    };
  },
});
```

#### 4. Guardrail with Abort: Terminate on Violation

This guardrail monitors funding amounts during streaming and aborts if any value exceeds a threshold.

```ts
import { createOutputGuardrail } from "@voltagent/core";

const fundingLimitGuardrail = createOutputGuardrail({
  id: "funding-limit",
  name: "Funding Limit Guardrail",

  streamHandler: ({ part, state, abort }) => {
    if (part.type !== "text-delta") {
      return part;
    }

    // Extract chunk text
    const chunk = part.delta ?? part.text ?? "";
    if (!chunk) return part;

    // Check for funding amounts
    const fundingPattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:million|billion)/gi;
    const matches = [...chunk.matchAll(fundingPattern)];

    for (const match of matches) {
      const amount = Number.parseFloat(match[1].replace(/,/g, ""));
      const unit = match[0].toLowerCase().includes("billion") ? 1000 : 1;
      const totalMillions = amount * unit;

      if (totalMillions > 500) {
        abort(`Funding amount ${match[0]} exceeds disclosure limit`);
      }
    }

    return part;
  },

  handler: async ({ output }) => {
    // Final validation
    return { pass: true };
  },
});
```

### Registering Output Guardrails

Add guardrails to the `outputGuardrails` array when constructing an agent:

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Support",
  instructions: "Answer questions concisely",
  model: openai("gpt-4o-mini"),
  outputGuardrails: [digitGuardrail, trackingGuardrail, fundingLimitGuardrail],
});
```

All `generateText`, `streamText`, `generateObject`, and `streamObject` calls will execute these guardrails in order.

### Testing Output Guardrails

```ts
const result = await agent.streamText("What's our customer ID 555544443333?");

let output = "";
for await (const chunk of result.textStream) {
  output += chunk; // Will contain "[digits]" instead of actual numbers
}

console.log(output);
console.log(await result.text); // Same sanitized output
```

### Output Guardrails API Reference

#### OutputGuardrailArgs\<TOutput\>

Properties passed to the `handler` function:

```ts
interface OutputGuardrailArgs<TOutput> {
  output: TOutput; // Current output after any previous guardrail modifications
  outputText?: string; // Plain text representation of output
  originalOutput: TOutput; // Original output before any modifications
  originalOutputText?: string; // Plain text representation of original output
  agent: Agent; // The agent instance
  context: OperationContext; // Operation context with tracing and logging
  operation: AgentEvalOperationType; // "generateText" | "streamText" | etc.
  usage?: unknown; // Token usage statistics
  finishReason?: string | null; // Why the model stopped generating
  warnings?: unknown[] | null; // Model warnings if any
}
```

#### OutputGuardrailResult\<TOutput\>

Return value from the `handler` function:

```ts
interface OutputGuardrailResult<TOutput> {
  pass: boolean; // Whether to allow the output (false triggers block)
  action?: "allow" | "modify" | "block"; // Explicit action (inferred from pass if omitted)
  modifiedOutput?: TOutput; // Replacement output when action is "modify"
  message?: string; // Description of the action taken
  metadata?: Record<string, unknown>; // Additional data for observability
}
```

#### OutputGuardrailStreamArgs

Properties passed to the `streamHandler` function:

```ts
interface OutputGuardrailStreamArgs {
  part: VoltAgentTextStreamPart; // Current stream chunk
  streamParts: VoltAgentTextStreamPart[]; // All parts emitted so far
  state: Record<string, any>; // Shared state object
  abort: (reason?: string) => never; // Function to terminate streaming
  agent: Agent; // The agent instance
  context: OperationContext; // Operation context
  operation: AgentEvalOperationType; // Operation type
}
```

`VoltAgentTextStreamPart` types include:

- `text-delta`: chunk of generated text
- `text-start`, `text-end`: text generation boundaries
- `tool-call`, `tool-result`: tool execution events
- `finish`: generation complete
- Others: see AI SDK documentation for full list

#### OutputGuardrailStreamResult

Return value from the `streamHandler` function:

```ts
type OutputGuardrailStreamResult =
  | VoltAgentTextStreamPart // Modified or original part to emit
  | null // Drop this chunk (don't emit)
  | undefined; // Same as returning the original part
```

### Execution Flow

1. An agent publishes each `text-delta` part to the guardrail runner.
2. Every guardrail with a `streamHandler` is invoked sequentially for that part. The handler can:
   - Return the part (possibly modified) to forward it downstream.
   - Return `null`/`undefined` to drop the chunk.
   - Call `abort(reason)` to terminate streaming with an error.
3. Once the model emits a `finish` chunk, VoltAgent gathers metadata (usage, finish reason, warnings) and invokes each guardrail's `handler`. The handler works with the final text produced by the streaming phase and can override the result that callers see.
4. The sanitized finish chunk is emitted to every consumer (`textStream`, `fullStream`, UI adapters). Observability spans are updated with the guardrail name, action, and metrics.

### Observability

- When `abort()` is used, the guardrail span is marked with `SpanStatusCode.ERROR` and the agent call terminates with a `VoltAgentError` containing the supplied reason.
- All guardrail executions are traced with spans containing action, pass/fail status, and metadata.
- Modifications are tracked by comparing original and modified content lengths.

## Input Guardrails

Input guardrails process user-provided content before it reaches the model. They can validate, modify, or block input based on content policies or business rules.

### When to Use Input Guardrails

Use input guardrails to:

- Block inappropriate user input (profanity, offensive content)
- Validate input format or length before sending to the model
- Sanitize or normalize user input (remove special characters, fix formatting)
- Enforce business rules (e.g., users can't ask about competitors)
- Redact sensitive information from user input

### Core Concepts

#### Handler Only

Input guardrails only have a `handler` function. They don't support `streamHandler` because input is processed as a complete message before being sent to the model.

```ts
handler: async ({ input, inputText, originalInput, context }) => {
  // Validate or modify input
  if (inputText.length > 5000) {
    return { pass: false, action: "block", message: "Input too long" };
  }
  return { pass: true };
};
```

#### Actions

Input guardrails support the same three actions as output guardrails:

- **`allow`**: Pass the input through unchanged
- **`modify`**: Replace the input with `modifiedInput`
- **`block`**: Reject the operation and throw an error

#### Input Types

Input guardrails receive input in three possible formats:

- `string`: Simple text input
- `UIMessage[]`: Vercel AI SDK UI message format
- `BaseMessage[]`: VoltAgent's internal message format

The `inputText` property contains the extracted plain text from any of these formats.

### Step-by-Step Tutorial

#### 1. Simple Blocking Guardrail: Content Filter

This guardrail blocks user input containing prohibited words.

```ts
import { createInputGuardrail } from "@voltagent/core";

const bannedWords = ["badword", "curse", "inappropriate"];

const profanityGuardrail = createInputGuardrail({
  id: "profanity-filter",
  name: "Profanity Filter",
  description: "Blocks user prompts that contain banned language.",
  severity: "warning",

  handler: async ({ inputText }) => {
    const text = (inputText || "").toLowerCase();
    if (!text) {
      return { pass: true };
    }

    const match = bannedWords.find((word) => text.includes(word));
    if (match) {
      return {
        pass: false,
        action: "block",
        message: "Please rephrase your request to avoid inappropriate language.",
        metadata: { bannedWord: match },
      };
    }

    return { pass: true };
  },
});
```

#### 2. Input Modification Guardrail: Sanitize User Input

This guardrail removes or replaces patterns in user input before sending to the model.

```ts
import { createInputGuardrail } from "@voltagent/core";

const sanitizeGuardrail = createInputGuardrail({
  id: "sanitize-input",
  name: "Sanitize User Input",
  description: "Removes email addresses and URLs from user input.",

  handler: async ({ inputText }) => {
    if (!inputText) {
      return { pass: true };
    }

    // Remove emails and URLs
    let sanitized = inputText;
    sanitized = sanitized.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      "[email]"
    );
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, "[url]");

    if (sanitized === inputText) {
      return { pass: true };
    }

    return {
      pass: true,
      action: "modify",
      modifiedInput: sanitized,
      message: "Email addresses and URLs were removed from input",
      metadata: {
        originalLength: inputText.length,
        sanitizedLength: sanitized.length,
      },
    };
  },
});
```

#### 3. Validation Guardrail: Enforce Input Constraints

This guardrail validates input length and format before processing.

```ts
import { createInputGuardrail } from "@voltagent/core";

const validationGuardrail = createInputGuardrail({
  id: "input-validation",
  name: "Input Validation",
  description: "Validates input length and format requirements.",
  severity: "critical",

  handler: async ({ inputText }) => {
    if (!inputText || !inputText.trim()) {
      return {
        pass: false,
        action: "block",
        message: "Input cannot be empty",
      };
    }

    if (inputText.length > 10000) {
      return {
        pass: false,
        action: "block",
        message: "Input exceeds maximum length of 10,000 characters",
        metadata: {
          inputLength: inputText.length,
          maxLength: 10000,
        },
      };
    }

    // Check for minimum meaningful content
    const wordCount = inputText.split(/\s+/).filter((word) => word.length > 0).length;
    if (wordCount < 2) {
      return {
        pass: false,
        action: "block",
        message: "Input must contain at least 2 words",
        metadata: { wordCount },
      };
    }

    return { pass: true };
  },
});
```

### Registering Input Guardrails

Add guardrails to the `inputGuardrails` array when constructing an agent:

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Support",
  instructions: "Answer user questions",
  model: openai("gpt-4o-mini"),
  inputGuardrails: [profanityGuardrail, validationGuardrail, sanitizeGuardrail],
});
```

Input guardrails execute in order before the input reaches the model. If any guardrail blocks the input, execution stops and an error is thrown.

### Testing Input Guardrails

```ts
// This will be blocked by the profanity filter
try {
  await agent.generateText("badword in my input");
} catch (error) {
  console.log(error.message); // "Please rephrase your request..."
}

// This will be sanitized
const result = await agent.generateText("Contact me at user@example.com");
// The model receives: "Contact me at [email]"
```

### Input Guardrails API Reference

#### InputGuardrailArgs

Properties passed to the `handler` function:

```ts
interface InputGuardrailArgs {
  input: string | UIMessage[] | BaseMessage[]; // Current input after previous modifications
  inputText: string; // Extracted plain text from input
  originalInput: string | UIMessage[] | BaseMessage[]; // Original input before modifications
  originalInputText: string; // Extracted plain text from original input
  agent: Agent; // The agent instance
  context: OperationContext; // Operation context with tracing and logging
  operation: AgentEvalOperationType; // "generateText" | "streamText" | etc.
}
```

#### InputGuardrailResult

Return value from the `handler` function:

```ts
interface InputGuardrailResult {
  pass: boolean; // Whether to allow the input (false triggers block)
  action?: "allow" | "modify" | "block"; // Explicit action (inferred from pass if omitted)
  modifiedInput?: string | UIMessage[] | BaseMessage[]; // Replacement input when action is "modify"
  message?: string; // Description of the action taken
  metadata?: Record<string, unknown>; // Additional data for observability
}
```

## Next Steps

Review the ready-made guardrail helpers in [Built-in Guardrails](./built-in.md).
