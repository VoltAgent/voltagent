import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migration guide: 2.x → 3.x

VoltAgent 3.x aligns the framework with AI SDK v7. This is a major release, so the runtime boundary is intentionally stricter: Node.js 22 or later and ESM-only packages. The agent, memory, tool, workflow, guardrail, observability, server, MCP, A2A, AG-UI, and VoltOps features remain available, but some AI SDK-facing names and result fields changed.

If you are still on 1.x, follow the **Migration guide: 1.x → 2.x** section first, then come back here.

## What changed

- Runtime: Node.js `>=22` is required.
- Local playground: a configured Node server now also starts an account-free UI on loopback port `3142` outside production/test. Set `playground: false` to retain API-only startup.
- Module format: VoltAgent 3.x is ESM-only. CommonJS `require("@voltagent/core")` is no longer supported.
- AI SDK: `ai` moves to `^7`.
- AI SDK provider packages need v7-compatible majors, for example `@ai-sdk/openai@^4`.
- Zod: `zod` moves to `^4`. Zod 3 is no longer a supported peer dependency in VoltAgent 3.x.
- AI SDK callbacks use `onEnd` and `onStepEnd`.
- `stepCountIs` is now `isStepCount`.
- `streamText` detailed events are exposed as `stream`. `fullStream` remains as a deprecated alias during the transition.
- Structured output uses `output`, not `experimental_output`.
- `generateObject` and `streamObject` are still available as deprecated compatibility wrappers. Prefer `generateText`/`streamText` with `Output.object`.

## Step 1. Upgrade your runtime to Node.js 22

Before installing VoltAgent 3.x, make sure local development, CI, and production all use Node.js 22 or later:

```bash
node --version
```

Update your application package metadata:

```json
{
  "engines": {
    "node": ">=22"
  }
}
```

If you cannot move off Node.js 20 yet, stay on VoltAgent 2.x until your runtime is ready.

## Step 2. Move your app to ESM

VoltAgent 3.x publishes ESM runtime entrypoints. Use ESM imports and mark your package as a module:

```json
{
  "type": "module"
}
```

Before:

```js
const { Agent } = require("@voltagent/core");
const { openai } = require("@ai-sdk/openai");
```

After:

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
```

For TypeScript projects, use a module resolution mode that matches your toolchain. `NodeNext` and `Bundler` are both common choices:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

## Step 3. Update packages

### 3.1 Update VoltAgent packages

While VoltAgent 3 is in prerelease, explicitly select the `next` channel:

```bash
pnpm add @voltagent/core@next @voltagent/server-hono@next @voltagent/logger@next
# If you use LibSQL memory:
pnpm add @voltagent/libsql@next
```

`@latest` follows the stable channel and does not select the v3 prerelease. After the stable v3 release, use the Volt CLI if your project already has it:

```bash
npm run volt update
```

Or update the stable packages manually:

```bash
pnpm add @voltagent/core@latest @voltagent/server-hono@latest @voltagent/logger@latest
```

Update your memory, storage, server, and protocol packages to compatible versions from the same release channel. Package majors are not identical across the project: for example, the CLI has its own version series. Check each package's peer dependencies rather than forcing every `@voltagent/*` package to the same major.

### 3.2 Update AI SDK packages

Install AI SDK v7 and v7-compatible provider packages:

```bash
pnpm add ai@^7 @ai-sdk/openai@^4
pnpm add @ai-sdk/provider@^4 @ai-sdk/provider-utils@^5
pnpm add zod@^4
```

If you use AI SDK UI helpers:

```bash
pnpm add @ai-sdk/react@^4
```

Provider package majors vary by provider. Common upgrades:

| Package                     | Use with AI SDK v7 |
| --------------------------- | ------------------ |
| `@ai-sdk/openai`            | `^4`               |
| `@ai-sdk/anthropic`         | `^4`               |
| `@ai-sdk/google`            | `^4`               |
| `@ai-sdk/azure`             | `^4`               |
| `@ai-sdk/groq`              | `^4`               |
| `@ai-sdk/mistral`           | `^4`               |
| `@ai-sdk/perplexity`        | `^4`               |
| `@ai-sdk/openai-compatible` | `^3`               |
| `@ai-sdk/amazon-bedrock`    | `^5`               |
| `@ai-sdk/google-vertex`     | `^5`               |

After changing dependencies, reinstall and refresh the lockfile:

```bash
pnpm install
```

### 3.3 Update Zod

VoltAgent 3.x is Zod 4-only. Remove Zod 3 pins from your app and templates:

```bash
pnpm add zod@^4
```

Use the public Zod 4 API for schemas passed to VoltAgent or AI SDK. A third-party integration that still requires Zod 3 can use `zod/v3` inside its own adapter, but must not pass those schemas to VoltAgent. For example, the ad-creator example accepts a serializable field definition through a Zod 4 tool schema, then constructs a separate Zod 3 schema for Stagehand 2 inside `execute`.

## Step 4. Keep using the AI SDK-style agent call shape

The object-style call shape introduced in 2.x remains the preferred API. Keep AI SDK generation settings at the top level and VoltAgent runtime options under `voltagent`:

VoltAgent 3.x derives public generation options from the corresponding AI SDK v7 method. Settings such as `timeout`, `headers`, `include`, `activeTools`, `toolOrder`, and `experimental_download` can be used directly on the agent call. Streaming-only options such as `onChunk` belong on `streamText`, not `generateText`.

`@voltagent/core` also re-exports common AI SDK primitives and types such as `generateText`, `streamText`, `generateObject`, `streamObject`, `embed`, `embedMany`, `Output`, `ToolSet`, and `LanguageModel`. Direct function exports keep native AI SDK behavior. Use `agent.generateText()` and `agent.streamText()` when you want VoltAgent orchestration features such as memory, guardrails, middleware, retries, fallbacks, tracing, and tool routing.

The rule for 3.x is:

- Use top-level AI SDK fields for model-call behavior.
- Use `voltagent` for VoltAgent runtime state and framework features.
- Use direct AI SDK function exports when you want native AI SDK behavior without agent orchestration.

```ts
const result = await agent.generateText({
  prompt: "Summarize this ticket",
  temperature: 0.2,
  maxOutputTokens: 500,
  voltagent: {
    memory: {
      userId: "user-123",
      conversationId: "ticket-456",
    },
    context: {
      requestId: "req-789",
    },
  },
});
```

The same shape works for `streamText`:

```ts
const result = await agent.streamText({
  prompt: "Write a short release note",
  timeout: {
    totalMs: 30_000,
    chunkMs: 5_000,
  },
  include: {
    rawChunks: true,
  },
  onChunk: async ({ chunk }) => {
    // Native AI SDK stream callback.
  },
  voltagent: {
    memory: {
      userId: "user-123",
      conversationId: "release-456",
    },
  },
});
```

VoltAgent composes only the fields it must own for framework behavior: `model`, `prompt`/`messages`, `tools`, `abortSignal`, and `maxRetries`. Tool execution callbacks are composed with VoltAgent preparation and cleanup while preserving native event payloads. Call-level AI SDK callbacks such as `onStart`, `onStepStart`, `onChunk`, `onAbort`, `onStepEnd`, `onEnd`/`onFinish`, and `onError` are still passed at the top level and receive raw AI SDK events. Use `hooks.*` when you need VoltAgent's post-memory, post-middleware, post-guardrail, or tracing context.

Top-level AI SDK `runtimeContext`, `toolsContext`, `telemetry`, and `experimental_telemetry` pass through on VoltAgent calls. Use `toolsContext` for native AI SDK tools that declare `contextSchema`. Use `voltagent.context` for VoltAgent runtime state that should be visible to memory, hooks, guardrails, middleware, and tools through VoltAgent's operation context.

See [AI SDK Compatibility Boundaries](/docs/agents/overview#ai-sdk-compatibility-boundaries) for the full pass-through and VoltAgent-owned field matrix.

Legacy positional calls are still accepted:

```ts
const result = await agent.generateText("Summarize this ticket", {
  memory: {
    userId: "user-123",
    conversationId: "ticket-456",
  },
});
```

For new code, prefer the object-style form because it matches AI SDK field names and keeps VoltAgent-specific runtime concerns explicit.

## Step 5. Rename `stepCountIs` to `isStepCount`

AI SDK v7 renamed `stepCountIs` to `isStepCount`. VoltAgent re-exports `isStepCount` for convenience.

Before:

```ts
import { stepCountIs } from "ai";

const result = await agent.generateText({
  prompt: "Research and summarize",
  stopWhen: stepCountIs(5),
});
```

After:

```ts
import { isStepCount } from "@voltagent/core";

const result = await agent.generateText({
  prompt: "Research and summarize",
  stopWhen: isStepCount(5),
});
```

You can also import `isStepCount` directly from `ai`.

## Step 6. Rename stream result access from `fullStream` to `stream`

AI SDK v7 exposes detailed stream parts on `stream`. VoltAgent follows that name. `fullStream` remains available as a deprecated alias, but new code should use `stream`.

Before:

```ts
const result = await agent.streamText("Write a changelog");

for await (const part of result.fullStream) {
  if (part.type === "text-delta") {
    process.stdout.write(part.text);
  }
}
```

After:

```ts
const result = await agent.streamText("Write a changelog");

for await (const part of result.stream) {
  if (part.type === "text-delta") {
    process.stdout.write(part.text);
  }
}
```

`textStream`, `toUIMessageStream`, `toUIMessageStreamResponse`, `pipeTextStreamToResponse`, and `toTextStreamResponse` remain available on stream results.

## Step 7. Rename lifecycle callbacks

AI SDK v7 uses `onEnd` and `onStepEnd`. Update callback names in per-call options. VoltAgent hooks use the same names, but they are a separate framework hook surface with VoltAgent hook arguments.

Before:

```ts
const result = await agent.streamText({
  prompt: "Plan the task",
  onFinish: async (event) => {
    console.log(event.finishReason);
  },
  hooks: {
    onStepFinish: async ({ step }) => {
      console.log(step.finishReason);
    },
  },
});
```

After:

```ts
const result = await agent.streamText({
  prompt: "Plan the task",
  onEnd: async (event) => {
    console.log(event.finishReason);
  },
  hooks: {
    onStepEnd: async ({ step }) => {
      console.log(step.finishReason);
    },
  },
});
```

Agent-level hooks use the same names:

```ts
const agent = new Agent({
  name: "assistant",
  model,
  instructions: "You are a helpful assistant.",
  hooks: {
    onEnd: async ({ output, error }) => {
      // Persist metadata, emit logs, or update your own analytics.
    },
    onStepEnd: async ({ step }) => {
      // Inspect each AI SDK step.
    },
  },
});
```

Call-level `onEnd` and `onStepEnd` receive the original AI SDK callback payloads. Agent-level `hooks.onEnd` and `hooks.onStepEnd` receive VoltAgent hook payloads, including `agent`, `context`, and VoltAgent's processed output/error state.

## Step 8. Use `instructions` for system prompts

AI SDK v7 separates instructions from regular model messages. For VoltAgent agents, keep using the `instructions` field:

```ts
const agent = new Agent({
  name: "support",
  model,
  instructions: "Answer support questions with short, direct replies.",
});
```

For per-call overrides, prefer `instructions`:

```ts
const result = await agent.generateText({
  prompt: "Draft a reply",
  instructions: "Write in a calm support tone.",
});
```

VoltAgent normalizes older system-message input where possible, but new code should not add `{ role: "system" }` messages to the request message list.

## Step 9. Update structured output

Use AI SDK v7 `output` with `Output.object`. Do not use `experimental_output`.

Before:

```ts
const result = await agent.generateText({
  prompt: "Create a user profile",
  experimental_output: Output.object({ schema }),
});
```

After:

```ts
import { Output } from "@voltagent/core";

const result = await agent.generateText({
  prompt: "Create a user profile",
  output: Output.object({ schema }),
});

console.log(result.output);
```

`generateObject` and `streamObject` still work as compatibility wrappers, but they are deprecated. Prefer:

```ts
const result = await agent.generateText({
  prompt: "Create a user profile",
  output: Output.object({ schema }),
});
```

For streaming structured output:

```ts
const result = await agent.streamText({
  prompt: "Create a user profile",
  output: Output.object({ schema }),
});

for await (const partial of result.partialOutputStream ?? []) {
  console.log(partial);
}
```

## Step 10. Prefer AI SDK-style tools for new custom tools

VoltAgent 3.x accepts AI SDK-style `ToolSet` records directly on agents. Raw tools created with `tool()` from `ai` are first-class. For new tools that need VoltAgent metadata inline, import AI SDK-compatible `tool()` from `@voltagent/core`. The tool name comes from the `tools` object key and the schema field is `inputSchema`.

Before:

```ts
import { createTool } from "@voltagent/core";
import { z } from "zod";

const weatherTool = createTool({
  name: "get_weather",
  description: "Get weather for a city",
  parameters: z.object({
    city: z.string(),
  }),
  execute: async ({ city }) => {
    return { city, temperature: 72 };
  },
});
```

After:

```ts
import { Agent } from "@voltagent/core";
import { tool } from "ai";
import { z } from "zod";

const agent = new Agent({
  name: "assistant",
  model,
  instructions: "You are a helpful assistant.",
  tools: {
    get_weather: tool({
      description: "Get weather for a city",
      inputSchema: z.object({
        city: z.string(),
      }),
      execute: async ({ city }) => {
        return { city, temperature: 72 };
      },
    }),
  },
});
```

Native AI SDK tool features such as `contextSchema` and call-level `toolsContext` pass through unchanged:

```ts
import { Agent } from "@voltagent/core";
import { tool } from "ai";
import { z } from "zod";

const agent = new Agent({
  name: "assistant",
  model,
  instructions: "You are a helpful assistant.",
  tools: {
    get_weather: tool({
      description: "Get weather for a city",
      inputSchema: z.object({
        city: z.string(),
      }),
      contextSchema: z.object({
        apiKey: z.string(),
        defaultUnit: z.enum(["celsius", "fahrenheit"]),
      }),
      execute: async ({ city }, { context }) => {
        return fetchWeather(city, {
          apiKey: context.apiKey,
          unit: context.defaultUnit,
        });
      },
    }),
  },
});

await agent.generateText({
  prompt: "What is the weather in San Francisco?",
  toolsContext: {
    get_weather: {
      apiKey: process.env.WEATHER_API_KEY!,
      defaultUnit: "fahrenheit",
    },
  },
});
```

VoltAgent-specific tool metadata is optional and additive. For new tools, import `tool()` from `@voltagent/core` and add VoltAgent-only metadata under the `voltagent` namespace:

```ts
import { tool } from "@voltagent/core";
import { z } from "zod";

const refundCustomer = tool({
  description: "Refund a customer order",
  inputSchema: z.object({
    orderId: z.string(),
    reason: z.string(),
  }),
  contextSchema: z.object({
    actorId: z.string(),
    permissions: z.array(z.string()),
  }),
  execute: async ({ orderId, reason }, { context }) => {
    if (!context.permissions.includes("refund:write")) {
      throw new Error("Not allowed to refund orders");
    }

    return issueRefund({
      orderId,
      reason,
      actorId: context.actorId,
    });
  },
  voltagent: {
    name: "Refund Customer",
    purpose: "Issue customer refunds",
    tags: ["billing", "dangerous", "customer-support"],
    metadata: {
      owner: "payments-team",
      riskLevel: "high",
    },
  },
});
```

If a tool already comes from `ai` or another package, decorate it with `enhanceTool()` instead of rebuilding it:

```ts
import { enhanceTool } from "@voltagent/core";

const externalWeatherTool = getWeatherToolFromSomePackage();

const weather = enhanceTool(externalWeatherTool, {
  name: "Weather lookup",
  tags: ["weather", "external"],
  metadata: {
    owner: "platform-team",
  },
});
```

For new approval flows, prefer AI SDK v7's native call-level `toolApproval` option. It takes precedence over tool-level `needsApproval`:

```ts
import { tool } from "@voltagent/core";

const result = await agent.generateText({
  prompt: "Delete the stale report",
  tools: {
    delete_file: tool({
      description: "Delete a file",
      inputSchema: z.object({
        path: z.string(),
      }),
      execute: async ({ path }) => deleteFile(path),
    }),
  },
  toolApproval: {
    delete_file: "user-approval",
  },
});
```

`createTool` is now a legacy compatibility helper for existing class-style tools. New custom tools should use `tool()`. When migrating from `createTool` to `tool()`:

- move `name` to the `tools` object key.
- rename `parameters` to `inputSchema`.
- move `tags`, `hooks`, and other VoltAgent-only metadata to the `voltagent` namespace, or to `enhanceTool()` when decorating an existing AI SDK tool.
- use VoltAgent metadata `name` only as display metadata. Telemetry and tool calls keep using the ToolSet key as canonical `tool.name`; metadata `name` is exposed as `tool.display_name`.
- keep `execute`, `outputSchema`, `providerOptions`, and `toModelOutput` in the AI SDK tool definition. Add `voltagent.validateOutput: true` if you relied on automatic output validation or schema transformations.
- keep AI SDK `contextSchema` in the tool definition and pass matching per-tool values through call-level `toolsContext`.
- use `runtimeContext`, `toolsContext`, telemetry, and other AI SDK options at the top level when you want native AI SDK behavior.
- use `voltagent.context` on the agent call for VoltAgent runtime state that should be visible to memory, guardrails, middleware, hooks, and VoltAgent-managed tools.

The `tool()` helper matches AI SDK's overloads. Client-side tools can omit both `execute` and `outputSchema`; handle their calls in the browser and return an output or error with `addToolResult`. When a definition includes `execute`, the returned tool retains a directly callable, typed `execute` function. These inference fixes do not change tool execution behavior.

`PlanAgent` still accepts an array of named `createTool()` tools. Keep that format for `PlanAgent`; the `Agent` ToolSet migration does not apply to its `tools` option.

Use call-level `toolApproval` when approval should be controlled per request, per user, or per runtime context. Use `voltagent.needsApproval` only for static tool metadata or compatibility with existing VoltAgent tool policies.

If you type the AI SDK tool execution options, import the v7-compatible type from `@ai-sdk/provider-utils`:

```ts
import type { ToolExecutionOptions } from "@ai-sdk/provider-utils";
```

If you use `toModelOutput`, keep the AI SDK v7 argument object shape:

```ts
const screenshotTool = tool({
  description: "Capture a screenshot",
  inputSchema: z.object({
    url: z.string(),
  }),
  execute: async ({ url }) => captureScreenshot(url),
  toModelOutput: ({ output }) => ({
    type: "content",
    value: [
      {
        type: "media",
        data: output.imageBase64,
        mediaType: "image/png",
      },
    ],
  }),
});
```

`tool()` from `@voltagent/core` is AI SDK-compatible and is the recommended import when defining new VoltAgent tools. Raw AI SDK tools are still first-class and do not require a VoltAgent wrapper. Use `enhanceTool()` only when you want VoltAgent metadata around a prebuilt raw AI SDK tool.

Provider-defined AI SDK tools can also be passed in the same `tools` object. Provider-owned tools are still passed through to AI SDK unchanged; use `enhanceTool()` when VoltAgent should apply hooks, preserve tags, or attach approval/API metadata around a user-executed AI SDK tool created elsewhere.

### Tool execution behavior changes

These changes apply to native tools: raw `ai.tool()`, `tool()` from `@voltagent/core`, and tools decorated with `enhanceTool()`. Existing `createTool` tools retain their legacy execution context, automatic output validation, and serialized error results.

| Behavior                                    | Native tools in VoltAgent 3.x                                                                                             | Migration action                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Thrown errors and rejected promises         | SDK `tool-error`; model messages carry an error output and UI streams emit `tool-output-error`.                           | Read errors from `result.content` / each step's `content`, or stream events, rather than looking for `output.error` in `toolResults`. |
| `onToolError` returns `{ output }`          | Explicit recovery produces a normal tool result. Returning nothing preserves the original exception.                      | Keep existing recovery hooks if you intentionally return fallback or structured error data.                                           |
| `toModelOutput`                             | Runs for successful/recovered results, not unrecovered exceptions.                                                        | Move exception formatting to explicit recovery if your converter depended on VoltAgent's old error object.                            |
| `outputSchema`                              | Does not implicitly validate, trim, transform, apply defaults, or remove fields.                                          | Enable `voltagent.validateOutput: true` to validate final outputs and replacements.                                                   |
| `AsyncIterable` outputs                     | Every yield is preliminary and the last yield is also the final result, including ordinary functions returning iterables. | Handle preliminary results if your UI previously saw only the final value.                                                            |
| `Promise<AsyncIterable>` outputs            | The resolved iterable is an ordinary output value; the SDK does not consume it as a stream.                               | Return an iterable directly, using an async generator for asynchronous setup.                                                         |
| VoltAgent end hooks / validation on streams | One-value lookahead keeps the final value available for transformation or validation.                                     | Use SDK `onToolExecutionEnd` for observation without buffering. Final schemas are not applied to progress values.                     |
| Start-hook / guardrail timeout coverage     | Preparation finishes before the SDK starts `timeout.toolMs` or a per-tool timeout.                                        | Give long-running hooks their own deadline and honor the operation abort signal.                                                      |

An ordinary thrown tool error does not inherently terminate the agent: the SDK can send it to the model and continue according to the stop conditions. An explicit `return { error: true }` remains a normal result.

Update error consumers:

```ts
const result = await agent.generateText({ prompt: "Check the order" });

for (const step of result.steps) {
  for (const part of step.content) {
    if (part.type === "tool-error") {
      console.error(part.toolName, part.error);
    }
  }
}
```

Native validation failures use the SDK schema-validation error shape. If you inspected legacy `validationErrors` or `actualOutput` fields, update that handling when migrating.

Enable validation explicitly when moving from `createTool` or an earlier `next` build:

```ts
import { tool, enhanceTool } from "@voltagent/core";
import { z } from "zod";

const lookup = tool({
  inputSchema: z.object({ id: z.string() }),
  outputSchema: z.object({ name: z.string().trim() }),
  execute: async ({ id }) => lookupRecord(id),
  voltagent: { validateOutput: true },
});

// For a tool created by another package:
const validatedExternalTool = enhanceTool(externalTool, { validateOutput: true });
```

With `validateOutput` enabled, validation covers the successful final output, output-changing end hooks, and explicit error-recovery output. Progress values are not checked against the final output schema. If you relied on the earlier wrapper validating every yield, validate progress explicitly inside your generator. Recovery output must now satisfy the schema too.

Move asynchronous stream setup into the generator body:

```ts
// Before: resolves to an iterable; earlier VoltAgent wrappers consumed it.
const before = tool({
  inputSchema: z.object({ id: z.string() }),
  execute: async ({ id }) => {
    const report = await openReport(id);
    return report.updates();
  },
});

// After: returns an iterable directly, as required for native SDK streaming.
const after = tool({
  inputSchema: z.object({ id: z.string() }),
  async *execute({ id }) {
    const report = await openReport(id);
    yield* report.updates();
  },
});
```

Tracing, tool/agent hooks, explicit recovery, approval, parallel input guardrails, and legacy workspace/memory access remain available. VoltAgent start hooks are awaited before native `execute`; start hooks use the operation abort signal, while `execute` and end hooks receive the SDK's per-tool signal. Disabling SDK telemetry does not disable guardrail enforcement.

Start hooks and the parallel guardrail wait now run outside the SDK's per-tool timeout. Use an explicit deadline for long-running hook work if you previously relied on `timeout.toolMs` or `timeout.tools` covering it. Pass the hook's `options.toolContext.abortSignal` to cancellable operations; an abort signal alone cannot stop code that ignores it.

`prepareStep` updates to `toolsContext` and `runtimeContext` also reach routed tools. Routing still uses the legacy outer `callTool`: hidden tool progress is consumed inside that call, and its error envelope remains the legacy one.

### Model retry and fallback changes

`maxRetries` now applies to each provider call within the SDK loop. Earlier VoltAgent versions could restart the entire generation, replay completed tools, and omit earlier successful steps from the returned result when a later model call failed. Retries and fallback now reuse the current step's prepared prompt and retain completed tools, step results, and memory records.

| Behavior                          | VoltAgent 3.x                                                                                                   | Migration action                                                                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Retry scope                       | Only the failed provider call is repeated; the retry counter resets per step.                                   | Expect `onRetry.attempt` to restart at `1` for a new model step.                                                                                                        |
| Model fallback                    | Continues with the current prompt and tool results; subsequent steps stay on the successful fallback.           | Ensure fallback models accept the same prepared inputs, tools, and output format.                                                                                       |
| Streaming                         | Recovery is possible before content starts in the current step, even after earlier steps streamed successfully. | After the current step emits content, handle the error without expecting VoltAgent to replay that stream.                                                               |
| Missing/invalid structured output | Parsing and validation failures after a successful provider call do not retry or fall back automatically.       | Handle the validation failure explicitly. For tools plus structured output, allow a final model step or use a separate formatting call with the completed tool results. |
| `prepareStep` model overrides     | The selected model receives call/agent retries, without falling through to the configured agent model list.     | Keep explicit per-step model selection intentional; the callback runs once per SDK step, not per retry.                                                                 |
| Invalid retry counts              | Negative, fractional, `NaN`, and infinite `maxRetries` values are rejected.                                     | Supply a non-negative integer.                                                                                                                                          |

`onRetry`, `onFallback`, per-model retry settings, dynamic model references, `Retry-After` backoff, and tracing remain available. Abort and SDK step/total timeouts interrupt backoff. Provider stream-start/response metadata are buffered until the attempt begins producing content; text/reasoning start events and tool input commit that attempt.

Middleware retries remain a separate, explicit full-pipeline restart and can replay tools. Likewise, a model can request the same business action again in a later response; this change prevents replay caused by provider retry, not all duplicate business actions. See [Retries and Fallbacks](/docs/agents/retries-fallback) for details.

### Native call inputs and method-specific options

`generateText` and `streamText` now accept a call-level `model` and `prompt: ModelMessage[]`:

```ts
await agent.generateText({
  model: "openai/gpt-4o-mini",
  prompt: [{ role: "user", content: "Hello" }],
});
```

The override replaces the constructor model/fallback list for one invocation and participates in retries and tracing. It does not change later calls. Previously, the public types rejected `model`, and forcing it through JavaScript could bypass provider retries.

Review these input behavior changes:

- Supplying both `prompt` and `messages` now throws `InvalidPromptError`; previously, `prompt` silently won.
- `instructions` now takes precedence over deprecated `system`; previously, both were concatenated. An empty `instructions` string also suppresses the alias. Agent-level instructions remain additive.
- Caller-provided system messages require `allowSystemInMessages: true`, including positional calls and deprecated object methods. Prefer moving application-owned system text into `instructions`. Only enable the flag for trusted histories; allowed system messages retain their position.
- Empty message arrays are rejected before memory can fill them. Input validation runs before context validation and generation hooks.
- `generateText` no longer accepts stream-only options such as `onChunk`, `onError`, and `experimental_transform`. Use `streamText` for native streaming callbacks, or `voltagent.hooks.onError` for framework failures.
- Native callback signatures follow the installed SDK version. Upgrade AI SDK before using newer features such as `streamRetries` and an `onError` retry decision; older SDK types no longer imply support for them.

### Typed and validated context

Add an optional `contextSchema` to an agent to type and validate the existing `context` Map. Continue using dynamic `instructions`, `model`, and `tools` functions. Inline agent hooks and generation results also infer declared context fields. No separate invocation-data field or preparation callback is required.

Plain-object constructor and call inputs use the schema's input types; callbacks read validated output types. Inputs may be partial because defaults and parent context are merged first. Missing required fields are checked at runtime on that merged context. Invalid context throws `AgentContextValidationError` (`INVALID_CONTEXT`, HTTP `400` through server adapters) before generation hooks run.

Explicit Maps and parent context retain their shared identity; successful validation writes parsed values/defaults into them. Unknown entries and symbols remain available. Constructor-only defaults are copied per invocation when a schema is configured. Agents without `contextSchema` keep their existing behavior. Runtime mutations are not revalidated automatically, and typed `get()` still includes `undefined` because Map entries can be deleted.

See [Schema Validation and Types](/docs/agents/context#schema-validation-and-types) for precedence, transforms, subagents, and HTTP examples.

### Generated result changes

`agent.generateText()` now keeps `result.output` consistent with the final `result.text` after output middleware and guardrails. Previously, `text` could be redacted while `output` still contained the original model value.

- Changed text is parsed with the same `Output` specification. Keep transformations compatible with the schema; invalid transformed output now rejects the call before VoltAgent's success hook and invokes error hooks. It does not trigger provider retries, fallback, or tool replay.
- Without an explicit `output`, the result infers a string. Empty replacements remain empty. Subagent early termination (`bail`) also supplies a parsed `output` and validates structured replacements.
- Unchanged text preserves the native parsed value. Custom parsers and schema transforms run a second time only when the final text changed. The SDK still parses the original model response before output middleware and guardrails run.
- `runtimeContext` retains its inferred type in `steps` and `finalStep` instead of being widened to `any`.
- Native SDK callbacks and diagnostic fields (`content`, `steps`, `finalStep`, `response`, and `responseMessages`) retain original records. Use `text` and `output` for processed content displayed to users.

See [Generated Output With Middleware and Guardrails](/docs/agents/structured-output#generated-output-with-middleware-and-guardrails) for details.

### Streaming result and callback changes

`agent.streamText()` now retains the native AI SDK result interface, including `output`, `elementStream`, `content`, `warnings`, `finalStep`, `responseMessages`, provider metadata, and tool-call/result aggregates. Structured output, tool types, and `runtimeContext` are inferred in the result. VoltAgent's `context` and `feedback` remain available.

| Surface                                  | VoltAgent 3.x behavior                                                                                                                      | Migration action                                                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `stream` / `fullStream`                  | Both async iterable and `ReadableStream`; separate getter accesses create independent branches. VoltAgent subagent events remain available. | Existing `for await` loops keep working. Use `getReader()`, `pipeTo()`, or `consumeStream()` when useful.               |
| Structured values with output guardrails | `output`, partial values, and elements wait for final validation and are parsed from sanitized final-step text.                             | Expect delayed partial/element delivery when guardrails are enabled. Keep redactions compatible with the output schema. |
| Final guarded text                       | Uses the final model step and excludes abandoned native stream-retry attempts. Filtering all text preserves an empty result.                | Do not rely on final text including earlier tool-step narration or restoring filtered text.                             |
| Diagnostic result fields                 | Preserve original SDK records, including unredacted content and response messages.                                                          | Display guarded `text`, `output`, or text/UI streams; treat diagnostic records separately.                              |
| UI stream `onEnd`                        | Runs with the delivered guarded message, including parallel input-block replacements. Takes precedence over deprecated `onFinish`.          | Prefer `onEnd` in `toUIMessageStream()` and response helper options.                                                    |
| Native stream retries                    | `streamRetries` and call-level `onError` return values reach the SDK. Recovered errors do not end the VoltAgent trace.                      | Use an SDK release supporting this API (verified with 7.0.137); 7.0.18 does not support it. Opt in explicitly.          |

For example, you can now consume typed elements and then read the completed array:

```ts
const result = await agent.streamText({
  prompt: "List three cities",
  output: Output.array({ element: z.object({ city: z.string() }) }),
});

for await (const item of result.elementStream) {
  console.log(item.city);
}
const cities = await result.output;
```

Native `streamRetries` can recover after content starts, independently of VoltAgent's pre-content provider retry/fallback policy. Failed-attempt text already delivered to consumers cannot be retracted. See [Retries and Fallbacks](/docs/agents/retries-fallback#native-sdk-stream-retries) and [Structured Output](/docs/agents/structured-output#structured-output-with-guardrails).

## Step 11. Update direct AI SDK tests and mocks

If your tests import AI SDK mocks directly, update them to the v7 mock names and result shapes:

```ts
import { MockLanguageModelV3 } from "ai/test";
```

Also update assertions that read AI SDK stream results:

```ts
expect(result.stream).toBeDefined();
```

Use `result.output` for structured output assertions instead of `result.experimental_output`.

## Local playground startup

A Node server configured through `new VoltAgent()` now also starts the local playground on `http://localhost:3142` in development. The API keeps its existing port and routes.

```ts
new VoltAgent({
  agents: { assistant },
  server: honoServer({ port: 3141 }),
  playground: { enabled: true, port: 3142 },
});
```

Use `playground: false` or `{ enabled: false }` to disable it. Omitted configuration defaults off when `NODE_ENV` is `production` or `test`; explicit `true` or an options object enables it. Serverless providers do not start the UI. If port `3142` is busy, only playground startup fails and the API remains running. Each simultaneously running project should use a different playground port.

`stopPlayground()` leaves the API running; `startPlayground()` starts it again. `stopServer()` and `shutdown()` stop both listeners. UI settings and chat copies stay in browser storage; traces continue to use your configured observability adapter. See [Local Playground](../observability/local-playground.md) for usage and limitations.

The playground’s live traces/logs use the existing observability WebSocket endpoint, with HTTP polling as a fallback. A custom proxy should forward WebSocket upgrades. Chat reconnection is opt-in in run settings and still requires a server resumable-stream adapter; adding the playground does not configure one. The new tool tests and workspace explorer use existing API endpoints and require no application migration.

Console-style execution cards and the local SpanDetailsAI inspector also use existing trace attributes. No application changes are needed for message views, instructions/context, token details, or memory/guardrail diffs; fields appear when recorded. The inspector does not require a VoltOps account. See [SpanDetailsAI](../observability/local-playground.md#spandetailsai) for supported details and data availability.

The playground distinguishes pending approvals and client results from completed requests using local conversation state. Retry/fallback explanations, iteration labels, collapsible groups, run comparisons and local debug exports require no API migration. Replay controls select top-level steps and preview the rerun scope. Reload existing tabs once to load this UI; subsequent builds display an update notice. The header’s **Refresh API data** button does not reload frontend code. The simplified layout keeps Structure focused on code configuration and execution statuses in Execution. Workflow **New run** opens a separate draft; **Back to result** preserves the previous run. Detailed cards, step search, history filters and compare/export remain available through their controls. These layout changes require no application or API migration.

Playground navigation exposes **Chat/Run**, **Result**, and **Tests**; Memory, Tools, Workspace and API remain under **Utilities**. Selecting a historical run opens its recorded result. **Run again** prepares a fresh execution and keeps the previous output as its comparison baseline; **Result → Compare runs** opens the comparison. **Steps** replaces the separate step strip, finder and overview list. **View** collects layout, logs, detailed cards, framing and previous-run visibility. Replay moves from every workflow card into the selected step's inspector. Continued runs label timing as **this segment**, with previous-run and lifecycle details available through a collapsed link. Successful results omit empty diagnostic sections, and passing test checks start collapsed; failed, pending or unavailable checks remain expanded. Checks support execution status, output text and recorded tool calls. Existing cases, names, pins and baselines continue to work. Names, pins and debug export are under **Result → Compare runs → Organize & export**. Reruns do not restore server memory, external state or historical code. No application or API migration is required. Reload the UI to pick up the layout. See [test cases](../observability/local-playground.md#save-and-repeat-test-cases).

Playground cards now expose type-specific facts and expandable input/output by default. Model titles use the recorded model name; call order and retry attempts remain separate. **View → Extra metadata** adds secondary metadata. Wider cards use a new browser-local position layout; old saved positions are left in storage but are not applied to this layout. Historical traces remain unchanged, and missing per-call usage is not filled from agent totals. No API or application changes are required.

Playground readability updates require no API migration. **Overview** uses concise summaries; selecting a step restores the full card at readable zoom. Completed runs start at the beginning, while failures and waiting operations retain targeted focus. **Steps** includes query/input previews and model call numbers. The inspector opens Input and Output, expands small JSON results, and keeps configuration/telemetry below; full messages, schemas and IDs remain accessible. Model cards prioritize the latest request message and outcome. Usage labels distinguish run/agent totals, individual calls and context estimates. Recent runs show status, duration and tool count instead of repeating similar response previews. Reload the frontend to pick up these changes; stored traces, cases, pins and detailed-card positions are preserved.

The local playground also adds read-only Memory browsing, API usage examples/OpenAPI inspection, local Monaco JSON editing, panel resizing, trace/span links, inline subagent output and richer middleware/scorer/workflow cards. These consume existing local APIs and attributes; no change to agent calls or context is required. Presentation cards do not become telemetry spans.

Workspace operations and PlanAgent filesystem tools now record metadata on each call's tool span, including parallel calls. Update core to populate workspace event categories and details in new traces; previously recorded traces are unchanged. No application changes are required.

Voice is optional: configure an agent's `voice` provider to enable dictation, speech playback and turn-based voice conversation. Updated Hono/server-core packages add `/agents/:id/voice/{listener,voices,listen,speak}` routes under the existing agent authentication rules. No voice provider is created automatically. Custom server providers need equivalent routes to enable these controls. See [Voice in the playground](../observability/local-playground.md#voice) for limits and behavior.

## Step 12. Validate the migration

### Workflow runtime corrections

Workflow Zod input schemas now parse fresh-run input before executing steps. Defaults, coercions and transforms take effect; invalid input produces an error execution. `andThen` input/output schemas also parse at runtime, including steps inside parallel branches. Normal workflow completion parses the configured result schema. Resume checkpoints are not re-parsed as fresh input; early `bail` exits retain their existing output behavior.

Review schemas that were previously used only for TypeScript inference. Zod object parsing removes unknown keys by default: declare fields that must survive, or use `z.looseObject(...)` when extra fields are intentional. A workflow with `input: z.object({ value: z.number().default(2) })` now receives `value: 2` for `{}`. A step returning a string against a boolean output schema now fails visibly. Check `status`/`error` on execution results; streamed validation failures are reported in workflow error events.

`andRace` now proceeds as soon as the first branch settles and signals cancellation to losing branches. Pass `state.signal` into cancellable I/O or check it in long tasks; JavaScript work that ignores the signal may continue in the background. A first-settling rejection still fails the race. Use `andAll` when every branch must finish.

Nested workflows use their own execution ID and fail the parent step when the child does not complete successfully. Code that assumed a shared parent/child execution ID should use conversation IDs and trace relationships for correlation. This does not add transparent nested suspension/resumption.

The local playground scenario lab exercises these paths without provider credentials; see [Local Playground](../observability/local-playground.md#develop-the-playground-in-this-repository).

Run your normal checks after the package and code changes:

```bash
pnpm lint
pnpm build
pnpm test
```

For VoltAgent monorepos, also validate package boundaries and docs/examples if applicable:

```bash
pnpm build:all
pnpm test:all
pnpm publint:all
pnpm --dir website build
```

## Quick checklist

- [ ] Node.js is `>=22` everywhere.
- [ ] The app is ESM (`"type": "module"` or ESM output from your framework).
- [ ] `ai` is `^7`.
- [ ] AI SDK provider packages are v7-compatible.
- [ ] `@ai-sdk/react` is `^4` if used.
- [ ] `zod` is `^4`.
- [ ] CommonJS `require()` imports are replaced with ESM imports.
- [ ] `stepCountIs` is replaced with `isStepCount`.
- [ ] `result.fullStream` is replaced with `result.stream` in new code.
- [ ] `onFinish`/`onStepFinish` usages are replaced with `onEnd`/`onStepEnd`.
- [ ] `experimental_output` is replaced with `output`.
- [ ] New custom tools use `tool()` from `@voltagent/core` + `inputSchema`; external AI SDK tools use `enhanceTool()` when VoltAgent metadata is needed.
- [ ] New approval flows use call-level `toolApproval` where possible.
- [ ] New structured output code uses `generateText`/`streamText` with `Output.object`.

---

# Migration guide: 1.x → 2.x

VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. There are no breaking changes in VoltAgent APIs. If you only use VoltAgent APIs, follow the steps below. If your app calls AI SDK functions directly, also review the upstream AI SDK v6 migration guide.

If you are still on 0.1.x, scroll down to the **Migration guide: 0.1.x → 1.x** section first, then come back here for the 1.x → 2.x upgrade.

## Step 1. Update packages

### 1.1 Use the Volt CLI to update VoltAgent packages (recommended)

If you already have the Volt CLI installed, use:

```bash
npm run volt update
```

This command updates only `@voltagent/*` dependencies. You still need to align `ai` and `@ai-sdk/*` packages in the next step.

If you do not have the CLI yet, install it and add a script:

<Tabs>
  <TabItem value="automatic" label="Automatic (CLI)" default>

```bash
npx @voltagent/cli init
```

This command installs `@voltagent/cli`, adds the `volt` script, and creates the `.voltagent` folder in your project.

  </TabItem>
  <TabItem value="manual" label="Manual">

```bash
npm install --save-dev @voltagent/cli
```

```json
"scripts": {
  "volt": "volt"
}
```

  </TabItem>
</Tabs>

Then run:

```bash
npm run volt update
```

### 1.2 Align AI SDK packages

If you ran `npm run volt update`, you can skip the `@voltagent/*` line below. Otherwise, update both VoltAgent and AI SDK packages:

```bash
pnpm add @voltagent/core@latest @voltagent/server-hono@latest @voltagent/libsql@latest @voltagent/logger@latest
pnpm add ai@^6 @ai-sdk/openai@^3 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4
```

Notes:

- If you use other providers, upgrade them to `@ai-sdk/*@^3` (e.g., `@ai-sdk/anthropic`, `@ai-sdk/google`, `@ai-sdk/azure`).
- If you use `useChat` or other UI helpers, upgrade `@ai-sdk/react` to `^3`.
- If you are in a monorepo, update the `@voltagent/*` packages together to compatible versions, checking their peer dependencies. CLI and internal package majors may differ from the framework major.

## Step 2. Adopt object-style agent calls (recommended)

Existing positional calls still work:

```ts
const result = await agent.generateText("Summarize this ticket", {
  temperature: 0.2,
  memory: {
    userId: "user-123",
    conversationId: "ticket-456",
  },
  context: {
    requestId: "req-789",
  },
});
```

For new code, prefer the AI SDK-style object shape. Keep model generation settings at the top level and move VoltAgent runtime options under `voltagent`:

```ts
const result = await agent.generateText({
  prompt: "Summarize this ticket",
  temperature: 0.2,
  voltagent: {
    memory: {
      userId: "user-123",
      conversationId: "ticket-456",
    },
    context: {
      requestId: "req-789",
    },
  },
});
```

The same shape works for `streamText`. REST requests use the same namespace inside `options.voltagent`:

```json
{
  "input": "Summarize this ticket",
  "options": {
    "temperature": 0.2,
    "voltagent": {
      "memory": {
        "userId": "user-123",
        "conversationId": "ticket-456"
      },
      "context": {
        "requestId": "req-789"
      }
    }
  }
}
```

Legacy top-level runtime options such as `memory`, `userId`, `conversationId`, `context`, `feedback`, `hooks`, `guardrails`, and `requestHeaders` are still accepted during the transition. If both legacy fields and `voltagent.*` are provided, `voltagent.*` takes precedence.

## Step 3. Update custom tools (only if you use advanced tool hooks)

### 3.1 Tool output mapping signature change

If you use `toModelOutput`, it now receives `{ output }`:

```ts
toModelOutput: ({ output }) => ({ type: "text", value: output }),
```

### 3.2 Tool execution options type rename (if you type it)

If you type the second `execute` parameter, use:

```ts
import type { ToolExecutionOptions } from "@ai-sdk/provider-utils";
```

## Step 4. Structured output (if you use generateObject/streamObject)

VoltAgent 2.x deprecates `generateObject` and `streamObject`. Migrate to `generateText`/`streamText` with `Output.object`.

Before (1.x):

```ts
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

const result = await agent.generateObject("Create a profile", schema);
console.log(result.object);
```

```ts
const stream = await agent.streamObject("Create a profile", schema);

for await (const partial of stream.partialObjectStream) {
  console.log(partial);
}
```

After (2.x):

```ts
import { Output } from "@voltagent/core";
import { z } from "zod";

const schema = z.object({
  name: z.string(),
  age: z.number(),
});

const result = await agent.generateText({
  prompt: "Create a profile",
  output: Output.object({ schema }),
});
console.log(result.output);
```

```ts
const stream = await agent.streamText({
  prompt: "Create a profile",
  output: Output.object({ schema }),
});

for await (const partial of stream.partialOutputStream ?? []) {
  console.log(partial);
}
```

## Step 5. Tests (if you use AI SDK mocks directly)

Update V2 mocks to V3 mocks:

```ts
import { MockLanguageModelV3 } from "ai/test";
```

---

# Migration guide: 0.1.x → 1.x

Welcome to VoltAgent 1.x! This release brings the architectural improvements you've been asking for - native ai-sdk integration, truly modular components, and production-ready observability. Your agents are about to get a serious upgrade.

This guide is built for real-world migrations. Copy-paste the commands, follow the checklists, ship your update. No fluff, just the changes you need to know.

**Need help?** Hit a snag during migration? We've got you covered:

- Open an issue on [GitHub](https://github.com/VoltAgent/voltagent/issues) - we're tracking migration experiences closely
- Join our [Discord](https://s.voltagent.dev/discord) for real-time help from the community and core team

Here's what we'll cover:

- What changed and why (high-level rationale)
- Quick migration steps (copy-paste friendly)
- Detailed changes (API-by-API, with examples)

## Overview: What changed and why

VoltAgent 1.x is a complete architectural refinement. We stripped away unnecessary abstractions, embraced native ai-sdk integration, and made everything pluggable:

- Native ai-sdk integration: The custom LLM provider layer and `@voltagent/vercel-ai` are removed. Apps pass ai-sdk models directly (works with any ai-sdk provider).
- Modular server: The built-in HTTP server is removed from core. Use pluggable providers (recommended: `@voltagent/server-hono`).
- Memory V2: A clean adapter-based architecture for storage/embeddings/vector search and structured working memory.
- Observability (OpenTelemetry): Legacy telemetry exporter is removed. Observability now uses OpenTelemetry with optional span/log processors and storage.
- Developer ergonomics: Clear peer dependency on `ai`, improved logger support in SSR/Edge (via `globalThis`), and convenience exports.

Benefits:

- Smaller surface area in core, better portability (Node/Edge/Workers).
- First-class ai-sdk support and predictable results/streams.
- Composable memory: scale from in-memory to LibSQL/PostgreSQL/Supabase, plus semantic search.
- Standardized observability (OTel) with optional web socket streaming/logging.

## Step 1. Update Packages (@1)

Uninstall legacy provider/UI packages and install the new modular server + memory packages. Also add the base `ai` library and a provider.

Uninstall (legacy):

```bash
npm uninstall @voltagent/vercel-ai @voltagent/vercel-ui
# yarn remove @voltagent/vercel-ai @voltagent/vercel-ui
# pnpm remove @voltagent/vercel-ai @voltagent/vercel-ui
```

Upgrade/install (required):

```bash
npm install @voltagent/core@latest @voltagent/server-hono@latest @voltagent/libsql@latest @voltagent/logger@latest ai
# yarn add @voltagent/core@latest @voltagent/server-hono@latest @voltagent/libsql@latest @voltagent/logger@latest ai@latest
# pnpm add @voltagent/core@latest @voltagent/server-hono@latest @voltagent/libsql@latest @voltagent/logger@latest ai@latest
```

- `ai`: Base Vercel AI SDK library used by VoltAgent 1.x (peer of `@voltagent/core`)
- `@ai-sdk/openai`: Example provider; choose any compatible provider (`@ai-sdk/anthropic`, `@ai-sdk/google`, etc.)
- `@voltagent/server-hono`: New pluggable HTTP server provider (replaces built-in server)
- `@voltagent/libsql`: LibSQL/Turso memory adapter (replaces built-in LibSQL in core)

Optional adapters:

- `@voltagent/postgres`: PostgreSQL storage adapter
- `@voltagent/supabase`: Supabase storage adapter

Note: `@voltagent/core@1.x` declares `ai@^5` as a peer dependency. Your application must install `ai`. If you want to import ai-sdk providers directly, install those packages too. If `ai` is missing, you will get a module resolution error at runtime when calling generation methods.

Node runtime requirement:

- The repo targets Node >= 20. Please ensure your deployment matches.

## Step 2. Update Code

Update your code as follows (highlighted lines are new in 1.x). Note: logger usage isn't new; keep your existing logger setup or use the example below.

```ts
// REMOVE (0.1.x):
// import { VercelAIProvider } from "@voltagent/vercel-ai";

// highlight-start
import { VoltAgent, Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { honoServer } from "@voltagent/server-hono";
// highlight-end
import { createPinoLogger } from "@voltagent/logger";

const logger = createPinoLogger({ name: "my-app", level: "info" });

// highlight-start
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
});
// highlight-end

const agent = new Agent({
  name: "my-app",
  instructions: "Helpful assistant",
  // REMOVE (0.1.x): llm: new VercelAIProvider(),
  model: "openai/gpt-4o-mini",
  // highlight-next-line
  memory,
});

// highlight-start
new VoltAgent({
  agents: { agent },
  server: honoServer(),
  logger,
});
// highlight-end
```

Remove in your existing code (0.1.x):

- `import { VercelAIProvider } from "@voltagent/vercel-ai";`
- `llm: new VercelAIProvider(),`
- Built-in server options on `VoltAgent` (e.g., `port`, `enableSwaggerUI`, `autoStart`)

Add to your app (1.x):

- `import { Memory } from "@voltagent/core";`
- `import { LibSQLMemoryAdapter } from "@voltagent/libsql";`
- `import { honoServer } from "@voltagent/server-hono";`
- Configure `memory: new Memory({ storage: new LibSQLMemoryAdapter({ url }) })`
- Pass `server: honoServer()` to `new VoltAgent({...})`

Summary of changes:

- Delete: `VercelAIProvider` import and `llm: new VercelAIProvider()`
- Delete: Built-in server options (`port`, `enableSwaggerUI`, `autoStart`, custom endpoints on core)
- Add: `Memory` + `LibSQLMemoryAdapter` for persistent LibSQL/Turso-backed memory
- Add: `honoServer()` as the server provider
- Keep: `model: "openai/..."` (or any ai-sdk provider), or use `model: "provider/model"`

Custom routes and auth (server):

```ts
new VoltAgent({
  agents: { agent },
  server: honoServer({
    port: 3141, // default
    enableSwaggerUI: true, // optional
    configureApp: (app) => {
      app.get("/api/health", (c) => c.json({ status: "ok" }));
    },
    // Auth (optional)
    // authNext: {
    //   provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
    //   publicRoutes: ["GET /health", "GET /metrics"],
    // },
  }),
});
```

## Detailed Changes

### Observability (OpenTelemetry)

What changed:

- Legacy `telemetry/*` and the telemetry exporter were removed from core.
- Observability now uses OpenTelemetry and can be enabled for production with only environment variables. No code changes are required.

New APIs (from `@voltagent/core`):

- `VoltAgentObservability` (created automatically unless you pass your own)
- Optional processors: `LocalStorageSpanProcessor`, `WebSocketSpanProcessor`, `WebSocketLogProcessor`
- In-memory adapter and OTel helpers (`Span`, `SpanKind`, `SpanStatusCode`, etc.)

Minimal usage (recommended):

1. Add keys to your `.env`:

```bash
# .env
VOLTAGENT_PUBLIC_KEY=pk_...
VOLTAGENT_SECRET_KEY=sk_...
```

2. Run your app normally. Remote export auto-enables when valid keys are present. Local, real-time debugging via the VoltOps Console stays available either way.

[Learn more](../observability//developer-console.md)

Notes:

- If you previously used the deprecated `telemetryExporter` or wired observability via `VoltOpsClient`, remove that code. The `.env` keys are sufficient.
- When keys are missing/invalid, VoltAgent continues with local debugging only (no remote export).

Advanced (optional):

- Provide a custom `VoltAgentObservability` to tune sampling/batching or override defaults. This is not required for typical setups.

### Remove `llm` provider and `@voltagent/vercel-ai`

VoltAgent no longer uses a custom provider wrapper. The `@voltagent/vercel-ai` package has been removed, and the `llm` prop on `Agent` is no longer supported. VoltAgent now integrates directly with the Vercel AI SDK (`ai`) and is fully compatible with all ai-sdk providers.

### What changed

- Removed: `@voltagent/vercel-ai` package and `VercelAIProvider` usage
- Removed: `llm` prop on `Agent`
- Kept: `model` prop on `Agent` (now pass an ai-sdk `LanguageModel` directly)
- Call settings: pass ai-sdk call settings (e.g., `temperature`, `maxOutputTokens`) in method options as before

### Before (0.1.x)

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

const agent = new Agent({
  name: "my-app",
  instructions: "Helpful assistant",
  llm: new VercelAIProvider(),
  model: "openai/gpt-4o-mini",
});
```

### After (1.x)

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-app",
  instructions: "Helpful assistant",
  // VoltAgent uses ai-sdk directly - just provide a model
  model: "openai/gpt-4o-mini",
});
```

You can swap `openai/...` for any provider string, e.g. `"anthropic/claude-3-5-sonnet"`, `"google/gemini-1.5-pro"`, etc.

Or use a model string:

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "my-app",
  instructions: "Helpful assistant",
  model: "openai/gpt-4o-mini",
});
```

### Package changes

- Uninstall legacy provider:
  - npm: `npm uninstall @voltagent/vercel-ai`
  - yarn: `yarn remove @voltagent/vercel-ai`
  - pnpm: `pnpm remove @voltagent/vercel-ai`
- Install the ai base library:
  - npm: `npm install ai`
  - yarn: `yarn add ai`
  - pnpm: `pnpm add ai`
- Install provider packages only if you plan to import them:
  - npm: `npm install @ai-sdk/openai`
  - yarn: `yarn add @ai-sdk/openai`
  - pnpm: `pnpm add @ai-sdk/openai`

> Note: `@voltagent/core@1.x` declares `ai@^5` as a peer dependency. Your application must install `ai`. If you want to import ai-sdk providers directly, install those packages too. If `ai` is missing, you will get a module resolution error at runtime when calling generation methods.

### Code changes checklist

- Remove `import { VercelAIProvider } from "@voltagent/vercel-ai"` from all files
- Remove `llm: new VercelAIProvider()` from `Agent` configuration
- Keep `model: ...` and either import the appropriate ai-sdk provider or use a `provider/model` string
- Move `provider: { ... }` call settings to top-level options (e.g., `temperature`, `maxOutputTokens`, `topP`, `stopSequences`)
- Put provider-specific knobs under `providerOptions` if needed
- Remove deprecated `memoryOptions` from Agent constructor; configure limits on your `Memory` instance (e.g., `storageLimit`) or adapter

Example call settings (unchanged style):

```ts
const res = await agent.generateText("Hello", {
  temperature: 0.3,
  maxOutputTokens: 256,
  providerOptions: {
    someProviderSpecificOption: {
      foo: "bar",
    },
  },
});
```

### Common errors after upgrade

- Type error: "Object literal may only specify known properties, and 'llm' does not exist..." → Remove the `llm` prop
- Module not found: `@voltagent/vercel-ai` → Uninstall the package and remove imports

### Environment variables

Your existing provider keys still apply (e.g., `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.). Configure them as required by ai-sdk providers.

### Change: Default memory is now InMemory; new `Memory` class

VoltAgent 1.x introduces a new `Memory` class that unifies conversation history, optional vector search, and working-memory features. By default, if you do not configure `memory`, the agent uses in-memory storage.

### What changed

- Default memory: In-memory storage by default (no persistence)
- New API: `memory: new Memory({ storage: <Adapter> })`
- Legacy `LibSQLStorage` usage is replaced with `LibSQLMemoryAdapter` as a storage adapter
- Optional adapters: `InMemoryStorageAdapter` (core), `PostgreSQLMemoryAdapter` (`@voltagent/postgres`), `SupabaseMemoryAdapter` (`@voltagent/supabase`), `LibSQLMemoryAdapter` (`@voltagent/libsql`)
- New capabilities: Embedding-powered vector search and working-memory support (optional)

### Before (0.1.x)

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { LibSQLStorage } from "@voltagent/libsql";

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that answers questions without using tools",
  llm: new VercelAIProvider(),
  model: "openai/gpt-4o-mini",
  // Persistent memory
  memory: new LibSQLStorage({
    url: "file:./.voltagent/memory.db",
  }),
});
```

### After (1.x)

```ts
import { Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that answers questions without using tools",
  model: "openai/gpt-4o-mini",
  // Optional: persistent memory (remove to use default in-memory)
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),
});
```

### Optional: Vector search and working memory

To enable semantic search and working-memory features, add an embedding model string and a vector adapter. For example, using ai-sdk embeddings and the in-memory vector store:

```ts
import { Memory, InMemoryVectorAdapter } from "@voltagent/core";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: "openai/text-embedding-3-small",
  vector: new InMemoryVectorAdapter(),
  // optional working-memory config
  workingMemory: {
    schema: {
      /* zod-like schema or config */
    },
  },
});
```

Pick the storage adapter that best fits your deployment: in-memory (development), LibSQL/Turso (file or serverless SQLite), PostgreSQL, or Supabase.

Supabase users:

- If you use `@voltagent/supabase`, run the database setup SQL in the Supabase SQL editor. See: [https://voltagent.dev/docs/agents/memory/supabase/#database-setup](https://voltagent.dev/docs/agents/memory/supabase/#database-setup)

### Change: ai-sdk v5 result passthrough + `context`

VoltAgent methods now return ai-sdk v5 results directly. We only add a `context` property to carry the `OperationContext` map alongside the result. This applies to:

- `generateText`
- `streamText`
- `generateObject`
- `streamObject`

### Before (0.1.x)

- Responses could differ per provider wrapper.
- `fullStream` availability and event types were provider-dependent.

### After (1.x)

- Result objects match ai-sdk v5. Use ai-sdk docs for fields/methods.
- `context: Map<string | symbol, unknown>` is added by VoltAgent.
- `fullStream` is the ai-sdk stream; event shapes depend on your chosen model/provider.

### streamObject rename

- The partial stream from `streamObject` is now exposed as `partialObjectStream` (ai-sdk v5).
- Replace any `response.objectStream` usages with `response.partialObjectStream`.

### Change: Subagent fullStream forwarding config

The `addSubAgentPrefix` option on `supervisorConfig.fullStreamEventForwarding` has been removed.

### Before (0.1.x)

```ts
supervisorConfig: {
  fullStreamEventForwarding: {
    types: ["tool-call", "tool-result", "text-delta"],
    addSubAgentPrefix: true,
  },
}
```

### After (1.x)

```ts
supervisorConfig: {
  fullStreamEventForwarding: {
    types: ["tool-call", "tool-result", "text-delta"],
  },
}
```

If you want prefixed labels, use the stream metadata from ai-sdk and add it yourself:

```ts
for await (const evt of response.stream) {
  if (evt.subAgentName && evt.type === "tool-call") {
    console.log(`[${evt.subAgentName}] Using: ${evt.toolName}`);
  }
}
```

Example (streamText):

```ts
const res = await agent.streamText("hi");

// ai-sdk v7 stream
if (res.stream) {
  for await (const part of res.stream) {
    if (part.type === "text-delta") process.stdout.write(part.text);
    else if (part.type === "tool-call") console.log("tool:", part.toolName);
    else if (part.type === "tool-result") console.log("done:", part.toolName);
    else if (part.type === "finish") console.log("usage:", part.usage);
  }
}

// VoltAgent extra
console.log("context keys:", [...res.context.keys()]);
```

Example (generateText):

```ts
const out = await agent.generateText("hello");
console.log(out.text); // ai-sdk property
console.log(out.usage); // ai-sdk property
console.log(out.context); // VoltAgent Map
```

### stopWhen override (advanced)

- You can pass a custom ai-sdk `stopWhen` predicate in method options to control when to stop step execution.
- This overrides VoltAgent's default `isStepCount(maxSteps)` guard.
- Be cautious: permissive predicates can lead to long-running or looping generations; overly strict ones may stop before tools complete.

### prepareStep callback (advanced)

- You can pass an ai-sdk `prepareStep` callback in `AgentOptions` or in per-call method options to control tool availability, tool choice, and other settings before each step.
- Per-call `prepareStep` overrides the agent-level default.
- Example: force text-only output after the first step:
  ```ts
  const agent = new Agent({
    name: "my-agent",
    model,
    prepareStep: ({ steps }) => (steps.length > 0 ? { toolChoice: "none" } : {}),
  });
  ```

### Built-in server removed; use `@voltagent/server-hono`

VoltAgent 1.x decouples the HTTP server from `@voltagent/core`. The built-in server is removed in favor of pluggable server providers. The recommended provider is `@voltagent/server-hono` (powered by Hono). Default port remains `3141`.

### What changed

- Removed from core: `port`, `enableSwaggerUI`, `autoStart`, custom endpoint registration
- New: `server` option accepts a server provider (e.g., `honoServer()`)
- Custom routes: use `configureApp` callback on the server provider
- New: Optional authentication support (JWT) in `@voltagent/server-hono`

### Install

- npm: `npm install @voltagent/server-hono`
- yarn: `yarn add @voltagent/server-hono`
- pnpm: `pnpm add @voltagent/server-hono`

### Before (0.1.x)

```ts
import { VoltAgent } from "@voltagent/core";

new VoltAgent({
  agents: { agent },
  port: 3141,
  enableSwaggerUI: true,
  // server auto-started
});
```

### After (1.x)

```ts
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents: { agent },
  server: honoServer({
    port: 3141, // default
    enableSwaggerUI: true, // optional
  }),
});
```

### Custom routes

```ts
new VoltAgent({
  agents: { agent },
  server: honoServer({
    configureApp: (app) => {
      app.get("/api/health", (c) => c.json({ status: "ok" }));
    },
  }),
});
```

### Authentication (optional)

Use `authNext` to separate public, console, and user routes:

```ts
import { honoServer } from "@voltagent/server-hono";
import { jwtAuth } from "@voltagent/server-core";

new VoltAgent({
  agents: { agent },
  server: honoServer({
    authNext: {
      provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
      publicRoutes: ["GET /health", "GET /metrics"],
    },
  }),
});
```

Within agents, you can read the authenticated user from the `OperationContext` (`context.get("user")`) inside hooks.

### `abortController` option renamed to `abortSignal`

Agent methods now accept `abortSignal` (an `AbortSignal`) instead of `abortController`.

Before (0.1.x):

```ts
const ac = new AbortController();
const res = await agent.generateText("...", { abortController: ac });
```

After (1.x):

```ts
const ac = new AbortController();
const res = await agent.generateText("...", { abortSignal: ac.signal });
```

Notes:

- Tools still access an internal `operationContext.abortController` and its signal.
- You only need to pass `abortSignal` to agent calls; propagation is handled internally.

### Message helpers now use UIMessage (breaking)

What changed:

- Message-level helpers now accept and return `UIMessage` (ai-sdk UI message type) instead of `BaseMessage`:
  - `addTimestampToMessage(message: UIMessage, ...) => UIMessage`
  - `prependToMessage(message: UIMessage, ...) => UIMessage`
  - `appendToMessage(message: UIMessage, ...) => UIMessage`
  - `hasContent(message: UIMessage) => boolean`
  - `mapMessageContent(message: UIMessage, transformer) => UIMessage`
- Content-level helpers are unchanged and still operate on `MessageContent` (`string | parts[]`).

Why:

- The Agent pipeline and hooks operate on ai-sdk `UIMessage[]`. Aligning helpers eliminates type mismatches and extra conversions in hooks (e.g., `onPrepareMessages`).

Before (0.1.x):

```ts
import { addTimestampToMessage, mapMessageContent } from "@voltagent/core/utils";
import type { BaseMessage } from "@voltagent/core";

const msg: BaseMessage = { role: "user", content: "hello" };
const stamped = addTimestampToMessage(msg, "10:30"); // returns BaseMessage
```

After (1.x):

```ts
import { addTimestampToMessage, mapMessageContent } from "@voltagent/core/utils";
import type { UIMessage } from "ai";

const msg: UIMessage = {
  id: "m1",
  role: "user",
  parts: [{ type: "text", text: "hello" }],
  metadata: {},
} as UIMessage;
const stamped = addTimestampToMessage(msg, "10:30"); // returns UIMessage
```

Notes:

- If you were calling helpers with `BaseMessage`, update those call sites to construct `UIMessage` objects (id, role, parts, metadata). Agent `onPrepareMessages` already provides `UIMessage[]`.
- No changes needed for `transformTextContent`, `extractText`, etc. — they still operate on `MessageContent`.

### Hook arg rename: onHandoff `source` → `sourceAgent` (breaking)

What changed:

- `onHandoff` hook argument object renamed the source agent field from `source` to `sourceAgent` for clarity and consistency with internal APIs.

Before (0.1.x):

```ts
onHandoff: ({ agent, source }) => {
  console.log(`${source.name} → ${agent.name}`);
};
```

After (1.x):

```ts
onHandoff: ({ agent, sourceAgent }) => {
  console.log(`${sourceAgent.name} → ${agent.name}`);
};
```

Action:

- Update all `onHandoff` usages in your code and docs to use `sourceAgent`.
-

### Server Core (typed routes, schemas, handlers)

The core HTTP surface moved into `@voltagent/server-core` and is consumed by `@voltagent/server-hono`:

- Typed route definitions and schemas for agents/workflows/logs/observability
- WebSocket utilities (log/observability streaming)
- Auth helpers and server utilities

If you previously relied on core’s internal server exports (custom endpoints, registry), migrate to `@voltagent/server-core` types and helpers, then run via `@voltagent/server-hono`.

### Convenience exports & logger

- Convenience from `@voltagent/core`: `zodSchemaToJsonUI`, `isStepCount`, `hasToolCall`, `convertUsage`.
- Logger helpers: `LoggerProxy`, `getGlobalLogger`, `getGlobalLogBuffer`. Logger is SSR/Edge-friendly via `globalThis` in Next.js.

### Runtime & TypeScript

- Node >= 20 is recommended/required for 1.x deployments.
- TypeScript 5.x recommended (repo uses 5.9). Typical `tsconfig` basics: `moduleResolution` matching your toolchain (NodeNext/Bundler), `skipLibCheck: true`, and DOM libs only if needed.

### Playground diagnostics and suspended cancellation

Conversation summarization now passes its system prompt through AI SDK 7’s `instructions` option. No configuration change is required. Invalid tool inputs produce a `tool-validation` span with `tool.executed=false`; dashboards counting executed tools should count `tool` spans rather than every span with `tool.name`. Non-matching `andBranch` branches now produce skipped spans with a recorded reason; workflow results are unchanged.

The workflow cancel API now persists cancellation for suspended executions, including when no in-memory controller remains. Such executions can no longer resume. Their earlier trace spans retain the historical checkpoint state; the local playground also reads the persisted execution state. Context validation errors now include field paths in the message; rely on the `INVALID_CONTEXT` code rather than matching the full error text.
