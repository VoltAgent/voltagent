import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

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

## Step 2. Update custom tools (only if you use advanced tool hooks)

### 2.1 Tool output mapping signature change

If you use `toModelOutput`, it now receives `{ output }`:

```ts
toModelOutput: ({ output }) => ({ type: "text", value: output }),
```

### 2.2 Tool execution options type rename (if you type it)

If you type the second `execute` parameter, use:

```ts
import type { ToolExecutionOptions } from "@ai-sdk/provider-utils";
```

## Step 3. Structured output (if you use generateObject/streamObject)

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

const result = await agent.generateText("Create a profile", {
  output: Output.object({ schema }),
});
console.log(result.output);
```

```ts
const stream = await agent.streamText("Create a profile", {
  output: Output.object({ schema }),
});

for await (const partial of stream.partialOutputStream ?? []) {
  console.log(partial);
}
```

## Step 4. Tests (if you use AI SDK mocks directly)

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

To enable semantic search and working-memory features, add an embedding adapter and a vector adapter. For example, using ai-sdk embeddings and the in-memory vector store:

```ts
import { Memory, AiSdkEmbeddingAdapter, InMemoryVectorAdapter } from "@voltagent/core";
import { openai } from "@ai-sdk/openai"; // or any ai-sdk embedding model

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
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
for await (const evt of response.fullStream!) {
  if (evt.subAgentName && evt.type === "tool-call") {
    console.log(`[${evt.subAgentName}] Using: ${evt.toolName}`);
  }
}
```

Example (streamText):

```ts
const res = await agent.streamText("hi");

// ai-sdk v5 fullStream
if (res.fullStream) {
  for await (const part of res.fullStream) {
    if (part.type === "text-delta") process.stdout.write(part.textDelta);
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
- This overrides VoltAgent's default `stepCountIs(maxSteps)` guard.
- Be cautious: permissive predicates can lead to long-running or looping generations; overly strict ones may stop before tools complete.

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

- Convenience from `@voltagent/core`: `zodSchemaToJsonUI`, `stepCountIs`, `hasToolCall`, `convertUsage`.
- Logger helpers: `LoggerProxy`, `getGlobalLogger`, `getGlobalLogBuffer`. Logger is SSR/Edge-friendly via `globalThis` in Next.js.

### Runtime & TypeScript

- Node >= 20 is recommended/required for 1.x deployments.
- TypeScript 5.x recommended (repo uses 5.9). Typical `tsconfig` basics: `moduleResolution` matching your toolchain (NodeNext/Bundler), `skipLibCheck: true`, and DOM libs only if needed.
