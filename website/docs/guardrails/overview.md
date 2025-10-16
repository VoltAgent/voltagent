---
title: Overview
slug: /guardrails/overview
---

# Guardrails

Guardrails restrict or transform agent input and output before it reaches the caller. The framework evaluates two entry points:

- `streamHandler` runs on each streamed chunk and can modify, drop, or abort that chunk.
- `handler` runs once the stream finishes and can validate or rewrite the final result.

Both hooks receive the same execution context, so work performed during streaming can be referenced when the final handler executes. The sections below show how to implement and register a custom output guardrail.

## Execution Flow

1. An agent publishes each `text-delta` part to the guardrail runner.
2. Every guardrail with a `streamHandler` is invoked sequentially for that part. The handler can:
   - Return the part (possibly modified) to forward it downstream.
   - Return `null`/`undefined` to drop the chunk.
   - Call `abort(reason)` to terminate streaming with an error.
3. Once the model emits a `finish` chunk, VoltAgent gathers metadata (usage, finish reason, warnings) and invokes each guardrail's `handler`. The handler works with the final text produced by the streaming phase and can override the result that callers see.
4. The sanitized finish chunk is emitted to every consumer (`textStream`, `fullStream`, UI adapters). Observability spans are updated with the guardrail name, action, and metrics.

## Building A Custom Output Guardrail

The example below censors four consecutive digits and records whether any truncation happened during streaming. The state captured in the streaming phase is propagated into the final handler.

```ts title="custom-guardrail.ts"
import type { OutputGuardrail } from "@voltagent/core";
import type { VoltAgentTextStreamPart } from "@voltagent/core/agent/subagent";

type MaxLengthState = { emitted: number; truncated: boolean };

export const redactDigitsGuardrail: OutputGuardrail<string> = {
  id: "redact-digits",
  name: "Redact Long Digit Runs",

  handler: async ({ output, originalOutput, metadata, context }) => {
    if (typeof originalOutput !== "string") {
      return { pass: true };
    }

    if (originalOutput === output) {
      return { pass: true };
    }

    return {
      pass: true,
      action: "modify",
      modifiedOutput: output,
      message: "Digit sequences longer than four characters were redacted.",
      metadata: {
        originalLength: originalOutput.length,
        sanitizedLength: output.length,
        finishReason: metadata.finishReason,
        traceId: context.traceContext.traceId,
      },
    };
  },

  streamHandler: ({ part, state }) => {
    if (part.type !== "text-delta") {
      return part;
    }

    const chunk = part.delta ?? part.text ?? "";
    if (!chunk) {
      return part;
    }

    const redacted = chunk.replace(/\d{4,}/g, "[digits]");
    const guardState = (state.redactDigits ??= { redactions: 0 } as { redactions: number });
    if (redacted !== chunk) {
      guardState.redactions += 1;
    }

    const cloned: VoltAgentTextStreamPart = { ...part };
    delete (cloned as { text?: string }).text;
    cloned.delta = redacted;
    return cloned;
  },
};
```

### Register The Guardrail

Add the guardrail to the `outputGuardrails` array when constructing the agent. Every call to `generateText`, `streamText`, `generateObject`, or `streamObject` will execute the guardrail.

```ts title="agent.ts"
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { redactDigitsGuardrail } from "./custom-guardrail";

export const agent = new Agent({
  name: "Support",
  instructions: "Answer concisely and exclude sensitive identifiers.",
  model: openai("gpt-4o-mini"),
  outputGuardrails: [redactDigitsGuardrail],
});
```

### Validate Streaming Behaviour

When a guardrail rewrites streamed output, the sanitized content is the only text observed by downstream consumers. The `textStream` below never exposes the original digits.

```ts
const result = await agent.streamText("Customer ID 555544443333");

let log = "";
for await (const chunk of result.textStream) {
  log += chunk;
}

console.log(log); // "Customer ID [digits]"
console.log(await result.text); // Same sanitized value
```

## Observability Notes

- When `abort()` is used, the guardrail span is marked with `SpanStatusCode.ERROR` and the agent call terminates with a `VoltAgentError` containing the supplied reason.

## Input Guardrails

Input guardrails share the same contract but operate on the user-provided messages before the model receives them. The handler receives both the original and the current mutation of the input, allowing multiple guardrails to apply incremental changes. See `InputGuardrailArgs` in `packages/core/src/agent/types.ts` for the full shape.

Next, review the ready-made guardrail helpers in [Built-in Guardrails](./built-in.md).
