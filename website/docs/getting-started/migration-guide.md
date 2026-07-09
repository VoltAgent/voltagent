import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Migration guide: 2.x → 3.x

VoltAgent 3.x aligns the framework with AI SDK v7. This is a major release, so the runtime boundary is intentionally stricter: Node.js 22 or later and ESM-only packages. The agent, memory, tool, workflow, guardrail, observability, server, MCP, A2A, AG-UI, and VoltOps features remain available, but some AI SDK-facing names and result fields changed.

If you are still on 1.x, follow the **Migration guide: 1.x → 2.x** section first, then come back here.

## What changed

- Runtime: Node.js `>=22` is required.
- Module format: VoltAgent 3.x is ESM-only. CommonJS `require("@voltagent/core")` is no longer supported.
- AI SDK: `ai` moves to `^7`.
- AI SDK provider packages need v7-compatible majors, for example `@ai-sdk/openai@^4`.
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

Use the Volt CLI if your project already has it:

```bash
npm run volt update
```

Or update the packages manually:

```bash
pnpm add @voltagent/core@latest @voltagent/server-hono@latest @voltagent/logger@latest
```

If you use memory/storage/server/protocol packages, update all `@voltagent/*` packages to the same major version.

### 3.2 Update AI SDK packages

Install AI SDK v7 and v7-compatible provider packages:

```bash
pnpm add ai@^7 @ai-sdk/openai@^4
pnpm add @ai-sdk/provider@^4 @ai-sdk/provider-utils@^5
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

## Step 4. Keep using the AI SDK-style agent call shape

The object-style call shape introduced in 2.x remains the preferred API. Keep AI SDK generation settings at the top level and VoltAgent runtime options under `voltagent`:

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
  voltagent: {
    memory: {
      userId: "user-123",
      conversationId: "release-456",
    },
  },
});
```

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

AI SDK v7 uses `onEnd` and `onStepEnd`. Update callback names in per-call options and hooks.

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
import { Output } from "ai";

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

VoltAgent 3.x accepts AI SDK-style `ToolSet` records directly on agents. For new code, prefer `tool()` from `@voltagent/core`. It follows the AI SDK shape: the tool name comes from the `tools` object key and the schema field is `inputSchema`.

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
import { Agent, tool } from "@voltagent/core";
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

VoltAgent-specific tool features now live under a `voltagent` namespace so they do not collide with AI SDK fields or leak to model providers:

```ts
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
      voltagent: {
        tags: ["weather", "external-api"],
        hooks: {
          onStart: async ({ args }) => {
            console.log("Calling weather tool", args);
          },
        },
      },
    }),
  },
});
```

For new approval flows, prefer AI SDK v7's native call-level `toolApproval` option. It takes precedence over tool-level `needsApproval`:

```ts
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

Existing `createTool` definitions still work as compatibility API. Keep them if you rely on the class-style VoltAgent tool shape or if migration is not worth the churn yet. When migrating from `createTool` to `tool()`:

- move `name` to the `tools` object key.
- rename `parameters` to `inputSchema`.
- move `tags`, `hooks`, and other VoltAgent-only metadata under `voltagent`.
- keep `execute`, `outputSchema`, `providerOptions`, and `toModelOutput` in the AI SDK tool definition.

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

Provider-defined AI SDK tools can also be passed in the same `tools` object. Provider-owned tools are still passed through to AI SDK unchanged; use `tool()` when VoltAgent should run the execute handler, apply hooks, preserve tags, or attach approval metadata.

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

## Step 12. Validate the migration

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
- [ ] CommonJS `require()` imports are replaced with ESM imports.
- [ ] `stepCountIs` is replaced with `isStepCount`.
- [ ] `result.fullStream` is replaced with `result.stream` in new code.
- [ ] `onFinish`/`onStepFinish` usages are replaced with `onEnd`/`onStepEnd`.
- [ ] `experimental_output` is replaced with `output`.
- [ ] New custom tools use `tool()` + `inputSchema`, with VoltAgent-only fields under `voltagent`.
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
- If you are in a monorepo, update all `@voltagent/*` packages to the same major version.

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
import { Output } from "ai";
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
