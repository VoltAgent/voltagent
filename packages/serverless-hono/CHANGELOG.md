# @voltagent/serverless-hono

## 2.0.5

### Patch Changes

- [#921](https://github.com/VoltAgent/voltagent/pull/921) [`c4591fa`](https://github.com/VoltAgent/voltagent/commit/c4591fa92de6df75a22a758b0232669053bd2b62) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add resumable streaming support via @voltagent/resumable-streams, with server adapters that let clients reconnect to in-flight streams.

  ```ts
  import { openai } from "@ai-sdk/openai";
  import { Agent, VoltAgent } from "@voltagent/core";
  import {
    createResumableStreamAdapter,
    createResumableStreamRedisStore,
  } from "@voltagent/resumable-streams";
  import { honoServer } from "@voltagent/server-hono";

  const streamStore = await createResumableStreamRedisStore();
  const resumableStream = await createResumableStreamAdapter({ streamStore });

  const agent = new Agent({
    id: "assistant",
    name: "Resumable Stream Agent",
    instructions: "You are a helpful assistant.",
    model: openai("gpt-4o-mini"),
  });

  new VoltAgent({
    agents: { assistant: agent },
    server: honoServer({
      resumableStream: { adapter: resumableStream },
    }),
  });

  await fetch("http://localhost:3141/agents/assistant/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: `{"input":"Hello!","options":{"conversationId":"conv-1","userId":"user-1","resumableStream":true}}`,
  });

  // Resume the same stream after reconnect/refresh
  const resumeResponse = await fetch(
    "http://localhost:3141/agents/assistant/chat/conv-1/stream?userId=user-1"
  );

  const reader = resumeResponse.body?.getReader();
  const decoder = new TextDecoder();
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    console.log(chunk);
  }
  ```

  AI SDK client (resume on refresh):

  ```tsx
  import { useChat } from "@ai-sdk/react";
  import { DefaultChatTransport } from "ai";

  const { messages, sendMessage } = useChat({
    id: chatId,
    messages: initialMessages,
    resume: true,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          message: messages[messages.length - 1],
          options: { conversationId: id, userId },
        },
      }),
      prepareReconnectToStreamRequest: ({ id }) => ({
        api: `/api/chat/${id}/stream?userId=${encodeURIComponent(userId)}`,
      }),
    }),
  });
  ```

- Updated dependencies [[`c4591fa`](https://github.com/VoltAgent/voltagent/commit/c4591fa92de6df75a22a758b0232669053bd2b62)]:
  - @voltagent/resumable-streams@2.0.1
  - @voltagent/server-core@2.1.2

## 2.0.4

### Patch Changes

- [#911](https://github.com/VoltAgent/voltagent/pull/911) [`975831a`](https://github.com/VoltAgent/voltagent/commit/975831a852ea471adb621a1d87990a8ffbc5ed31) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: expose Cloudflare Workers `env` bindings in serverless contexts

  When using `@voltagent/serverless-hono` on Cloudflare Workers, the runtime `env` is now injected into the
  context map for agent requests, workflow runs, and tool executions. `@voltagent/core` exports
  `SERVERLESS_ENV_CONTEXT_KEY` so you can access bindings like D1 from `options.context` (tools) or
  `state.context` (workflow steps). Tool execution also accepts `context` as a `Map`, preserving
  `userId`/`conversationId` when provided that way.

  `@voltagent/core` is also marked as side-effect free so edge bundlers can tree-shake the PlanAgent
  filesystem backend, avoiding Node-only dependency loading when it is not used.

  Usage:

  ```ts
  import { createTool, SERVERLESS_ENV_CONTEXT_KEY } from "@voltagent/core";
  import type { D1Database } from "@cloudflare/workers-types";
  import { z } from "zod";

  type Env = { DB: D1Database };

  export const listUsers = createTool({
    name: "list-users",
    description: "Fetch users from D1",
    parameters: z.object({}),
    execute: async (_args, options) => {
      const env = options?.context?.get(SERVERLESS_ENV_CONTEXT_KEY) as Env | undefined;
      const db = env?.DB;
      if (!db) {
        throw new Error("D1 binding is missing (env.DB)");
      }

      const { results } = await db.prepare("SELECT id, name FROM users").all();
      return results;
    },
  });
  ```

- Updated dependencies [[`975831a`](https://github.com/VoltAgent/voltagent/commit/975831a852ea471adb621a1d87990a8ffbc5ed31)]:
  - @voltagent/server-core@2.1.1

## 2.0.3

### Patch Changes

- [`c9bd810`](https://github.com/VoltAgent/voltagent/commit/c9bd810ac71972eb7e9e6e01c9ca15b6e9cfc9f0) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: allow Console dev headers in CORS and add a /ws probe response for serverless runtimes without WebSocket support

## 2.0.2

### Patch Changes

- [`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`f6ffb8a`](https://github.com/VoltAgent/voltagent/commit/f6ffb8ae0fd95fbe920058e707d492d8c21b2505)]:
  - @voltagent/internal@1.0.2
  - @voltagent/server-core@2.0.2

## 2.0.1

### Patch Changes

- [`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

- Updated dependencies [[`c3943aa`](https://github.com/VoltAgent/voltagent/commit/c3943aa89a7bee113d99404ecd5a81a62bc159c2)]:
  - @voltagent/internal@1.0.1
  - @voltagent/server-core@2.0.1

## 2.0.0

### Major Changes

- [#894](https://github.com/VoltAgent/voltagent/pull/894) [`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: VoltAgent 2.x (AI SDK v6)

  VoltAgent 2.x aligns the framework with AI SDK v6 and adds new features. VoltAgent APIs are compatible, but if you call AI SDK directly, follow the upstream v6 migration guide.

  Migration summary (1.x -> 2.x):
  1. Update VoltAgent packages
  - `npm run volt update`
  - If the CLI is missing: `npx @voltagent/cli init` then `npm run volt update`
  2. Align AI SDK packages
  - `pnpm add ai@^6 @ai-sdk/provider@^3 @ai-sdk/provider-utils@^4 @ai-sdk/openai@^3`
  - If you use UI hooks, upgrade `@ai-sdk/react` to `^3`
  3. Structured output
  - `generateObject` and `streamObject` are deprecated in VoltAgent 2.x
  - Use `generateText` / `streamText` with `Output.object(...)`

  Full migration guide: https://voltagent.dev/docs/getting-started/migration-guide/

### Patch Changes

- Updated dependencies [[`ee05549`](https://github.com/VoltAgent/voltagent/commit/ee055498096b1b99015a8362903712663969677f)]:
  - @voltagent/server-core@2.0.0
  - @voltagent/core@2.0.0
  - @voltagent/internal@1.0.0

## 1.0.10

### Patch Changes

- [#847](https://github.com/VoltAgent/voltagent/pull/847) [`d861c17`](https://github.com/VoltAgent/voltagent/commit/d861c17e72f2fb6368778970a56411fadabaf9a5) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add first-class REST tool endpoints and UI support - #638
  - Server: list and execute registered tools over HTTP (`GET /tools`, `POST /tools/:name/execute`) with zod-validated inputs and OpenAPI docs.
  - Auth: Both GET and POST tool endpoints are behind the same auth middleware as agent/workflow execution (protected by default).
  - Multi-agent tools: tools now report all owning agents via `agents[]` (no more single `agentId`), including tags when provided.
  - Safer handlers: input validation via safeParse guard, tag extraction without `any`, and better error shaping.
  - Serverless: update install route handles empty bodies and `/updates/:packageName` variant.
  - Console: Unified list surfaces tools, tool tester drawer with Monaco editors and default context, Observability page adds a Tools tab with direct execution.
  - Docs: New tools endpoint page and API reference entries for listing/executing tools.

- Updated dependencies [[`d861c17`](https://github.com/VoltAgent/voltagent/commit/d861c17e72f2fb6368778970a56411fadabaf9a5)]:
  - @voltagent/server-core@1.0.33

## 1.0.9

### Patch Changes

- [#845](https://github.com/VoltAgent/voltagent/pull/845) [`5432f13`](https://github.com/VoltAgent/voltagent/commit/5432f13bddebd869522ebffbedd9843b4476f08b) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: workflow execution listing - #844

  Added a unified way to list workflow runs so teams can audit executions across every storage backend and surface them via the API and console.

  ## What changed
  - `queryWorkflowRuns` now exists on all memory adapters (in-memory, libsql, Postgres, Supabase, voltagent-memory) with filters for `workflowId`, `status`, `from`, `to`, `limit`, and `offset`.
  - Server routes are consolidated under `/workflows/executions` (no path param needed); `GET /workflows/:id` also returns the workflow result schema for typed clients. Handler naming is standardized to `listWorkflowRuns`.
  - VoltOps Console observability panel lists the new endpoint; REST docs updated with query params and sample responses. New unit tests cover handlers and every storage adapter.

  ## Quick fetch

  ```ts
  await fetch(
    "http://localhost:3141/workflows/executions?workflowId=expense-approval&status=completed&from=2024-01-01&to=2024-01-31&limit=20&offset=0"
  );
  ```

- Updated dependencies [[`5432f13`](https://github.com/VoltAgent/voltagent/commit/5432f13bddebd869522ebffbedd9843b4476f08b)]:
  - @voltagent/server-core@1.0.32

## 1.0.8

### Patch Changes

- [#810](https://github.com/VoltAgent/voltagent/pull/810) [`efcfe52`](https://github.com/VoltAgent/voltagent/commit/efcfe52dbe2c095057ce08a5e053d1defafd4e62) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: ensure reliable trace export and context propagation in serverless environments

  ## The Problem

  Trigger-initiated agent executions in serverless environments (Cloudflare Workers, Vercel Edge Functions) were experiencing inconsistent trace exports and missing parent-child span relationships. This manifested as:
  1. Agent traces not appearing in observability tools despite successful execution
  2. Trigger and agent spans appearing as separate, disconnected traces instead of a single coherent trace tree
  3. Spans being lost due to serverless functions terminating before export completion

  ## The Solution

  **Serverless Trace Export (`@voltagent/serverless-hono`):**
  - Implemented reliable span flushing using Cloudflare's `waitUntil` API to ensure spans are exported before function termination
  - Switched from `SimpleSpanProcessor` to `BatchSpanProcessor` with serverless-optimized configuration (immediate export, small batch sizes)
  - Added automatic flush on trigger completion with graceful fallback to `forceFlush` when `waitUntil` is unavailable

  **Context Propagation (`@voltagent/core`):**
  - Integrated official `@opentelemetry/context-async-hooks` package to replace custom context manager implementation
  - Ensured `AsyncHooksContextManager` is registered in both Node.js and serverless environments for consistent async context tracking
  - Fixed `resolveParentSpan` logic to correctly identify scorer spans while avoiding framework-generated ambient spans
  - Exported `propagation` and `ROOT_CONTEXT` from `@opentelemetry/api` for HTTP header-based trace context injection/extraction

  **Node.js Reliability:**
  - Updated `NodeVoltAgentObservability.flushOnFinish()` to call `forceFlush()` instead of being a no-op, ensuring spans are exported in short-lived processes

  ## Impact
  - ✅ Serverless traces are now reliably exported and visible in observability tools
  - ✅ Trigger and agent spans form a single, coherent trace tree with proper parent-child relationships
  - ✅ Consistent tracing behavior across Node.js and serverless runtimes
  - ✅ No more missing or orphaned spans in Cloudflare Workers, Vercel Edge Functions, or similar platforms

  ## Technical Details
  - Uses `BatchSpanProcessor` with `maxExportBatchSize: 32` and `scheduledDelayMillis: 100` for serverless
  - Leverages `globalThis.___voltagent_wait_until` for non-blocking span export in Cloudflare Workers
  - Implements `AsyncHooksContextManager` for robust async context tracking across `Promise` chains and `async/await`
  - Maintains backward compatibility with existing Node.js deployments

  ## Migration Notes

  No breaking changes. Existing deployments will automatically benefit from improved trace reliability. Ensure your `wrangler.toml` includes `nodejs_compat` flag for Cloudflare Workers:

  ```toml
  compatibility_flags = ["nodejs_compat"]
  ```

## 1.0.7

### Patch Changes

- [#801](https://github.com/VoltAgent/voltagent/pull/801) [`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add triggers DSL improvements and event payload simplification
  - Introduce the new `createTriggers` DSL and expose trigger events via sensible provider names (e.g. `on.airtable.recordCreated`) rather than raw catalog IDs.
  - Add trigger span metadata propagation so VoltAgent agents receive trigger context automatically without manual mapping.
  - Simplify action dispatch payloads: `payload` now contains only the event’s raw data while trigger context lives in the `event`/`metadata` blocks, reducing boilerplate in handlers.

  ```ts
  import { VoltAgent, createTriggers } from "@voltagent/core";

  new VoltAgent({
    // ...
    triggers: createTriggers((on) => {
      on.airtable.recordCreated(({ payload, event }) => {
        console.log("New Airtable row", payload, event.metadata);
      });

      on.gmail.newEmail(({ payload }) => {
        console.log("New Gmail message", payload);
      });
    }),
  });
  ```

- Updated dependencies [[`a26ddd8`](https://github.com/VoltAgent/voltagent/commit/a26ddd826692485278033c22ac9828cb51cdd749)]:
  - @voltagent/server-core@1.0.25

## 1.0.6

### Patch Changes

- [#787](https://github.com/VoltAgent/voltagent/pull/787) [`5e81d65`](https://github.com/VoltAgent/voltagent/commit/5e81d6568ba3bee26083ca2a8e5d31f158e36fc0) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add full conversation step persistence across the stack:
  - Core now exposes managed-memory step APIs, and the VoltAgent managed memory adapter persists/retrieves steps through VoltOps.
  - LibSQL, PostgreSQL, Supabase, and server handlers provision the new `_steps` table, wire up DTOs/routes, and surface the data in Observability/Steps UI (including managed-memory backends).

  fixes: #613

- Updated dependencies [[`5e81d65`](https://github.com/VoltAgent/voltagent/commit/5e81d6568ba3bee26083ca2a8e5d31f158e36fc0)]:
  - @voltagent/server-core@1.0.22

## 1.0.5

### Patch Changes

- [#693](https://github.com/VoltAgent/voltagent/pull/693) [`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e) Thanks [@marinoska](https://github.com/marinoska)! - - Added support for provider-defined tools (e.g. `openai.tools.webSearch()`)
  - Update tool normalization to pass through provider tool metadata untouched.
  - Added support for provider-defined tools both as standalone tool and within a toolkit.
  - Upgraded dependency: `ai` → `^5.0.76`
- Updated dependencies [[`f9aa8b8`](https://github.com/VoltAgent/voltagent/commit/f9aa8b8980a9efa53b6a83e6ba2a6db765a4fd0e)]:
  - @voltagent/server-core@1.0.16
  - @voltagent/internal@0.0.12

## 1.0.4

### Patch Changes

- [#701](https://github.com/VoltAgent/voltagent/pull/701) [`c4f01e6`](https://github.com/VoltAgent/voltagent/commit/c4f01e6691b4841c11d4127525011bb2edbe1e26) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: observability spans terminating prematurely on Vercel Edge and Deno Deploy

  ## The Problem

  Observability spans were being cut short on Vercel Edge and Deno Deploy runtimes because the `toVercelEdge()` and `toDeno()` adapters didn't implement `waitUntil` support. Unlike `toCloudflareWorker()`, which properly extracted and set up `waitUntil` from the execution context, these adapters would terminate async operations (like span exports) as soon as the response was returned.

  This caused the observability pipeline's `FetchTraceExporter` and `FetchLogExporter` to have their export promises cancelled mid-flight, resulting in incomplete or missing observability data.

  ## The Solution

  Refactored all serverless adapters to use a new `withWaitUntil()` helper utility that:
  - Extracts `waitUntil` from the runtime context (Cloudflare's `executionCtx`, Vercel's `context`, or Deno's `info`)
  - Sets it as `globalThis.___voltagent_wait_until` for the observability exporters to use
  - Returns a cleanup function that properly restores previous state
  - Handles errors gracefully and supports nested calls

  Now all three adapters (`toCloudflareWorker`, `toVercelEdge`, `toDeno`) use the same battle-tested pattern:

  ```ts
  const cleanup = withWaitUntil(context);
  try {
    return await processRequest(request);
  } finally {
    cleanup();
  }
  ```

  ## Impact
  - ✅ Observability spans now export successfully on Vercel Edge Runtime
  - ✅ Observability spans now export successfully on Deno Deploy
  - ✅ Consistent `waitUntil` behavior across all serverless platforms
  - ✅ DRY principle: eliminated duplicate code across adapters
  - ✅ Comprehensive test coverage with 11 unit tests covering edge cases, nested calls, and error scenarios

  ## Technical Details

  The fix introduces:
  - `utils/wait-until-wrapper.ts`: Reusable `withWaitUntil()` helper
  - `utils/wait-until-wrapper.spec.ts`: Complete test suite (11/11 passing)
  - Updated `toCloudflareWorker()`: Simplified using helper
  - **Fixed** `toVercelEdge()`: Now properly supports `waitUntil`
  - **Fixed** `toDeno()`: Now properly supports `waitUntil`

## 1.0.3

### Patch Changes

- [`ca6160a`](https://github.com/VoltAgent/voltagent/commit/ca6160a2f5098f296729dcd842a013558d14eeb8) Thanks [@omeraplak](https://github.com/omeraplak)! - fix: updates endpoint

- Updated dependencies [[`ca6160a`](https://github.com/VoltAgent/voltagent/commit/ca6160a2f5098f296729dcd842a013558d14eeb8)]:
  - @voltagent/server-core@1.0.14

## 1.0.2

### Patch Changes

- [#629](https://github.com/VoltAgent/voltagent/pull/629) [`3e64b9c`](https://github.com/VoltAgent/voltagent/commit/3e64b9ce58d0e91bc272f491be2c1932a005ef48) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add memory observability

- Updated dependencies [[`3e64b9c`](https://github.com/VoltAgent/voltagent/commit/3e64b9ce58d0e91bc272f491be2c1932a005ef48)]:
  - @voltagent/server-core@1.0.13

## 1.0.1

### Patch Changes

- [#621](https://github.com/VoltAgent/voltagent/pull/621) [`f4fa7e2`](https://github.com/VoltAgent/voltagent/commit/f4fa7e297fec2f602c9a24a0c77e645aa971f2b9) Thanks [@omeraplak](https://github.com/omeraplak)! - ## @voltagent/core
  - Folded the serverless runtime entry point into the main build – importing `@voltagent/core` now auto-detects the runtime and provisions either the Node or serverless observability pipeline.
  - Rebuilt serverless observability on top of `BasicTracerProvider`, fetch-based OTLP exporters, and an execution-context `waitUntil` hook. Exports run with exponential backoff, never block the response, and automatically reuse VoltOps credentials (or fall back to the in-memory span/log store) so VoltOps Console transparently swaps to HTTP polling when WebSockets are unavailable.
  - Hardened the runtime utilities for Workers/Functions: added universal `randomUUID`, base64, and event-emitter helpers, and taught the default logger to emit OpenTelemetry logs without relying on Node globals. This removes the last Node-only dependencies from the serverless bundle.

  ```ts
  import { Agent, VoltAgent } from "@voltagent/core";
  import { serverlessHono } from "@voltagent/serverless-hono";
  import { openai } from "@ai-sdk/openai";

  import { weatherTool } from "./tools";

  const assistant = new Agent({
    name: "serverless-assistant",
    instructions: "You are a helpful assistant.",
    model: openai("gpt-4o-mini"),
  });

  const voltAgent = new VoltAgent({
    agents: { assistant },
    serverless: serverlessHono(),
  });

  export default voltAgent.serverless().toCloudflareWorker();
  ```

  ## @voltagent/serverless-hono
  - Renamed the edge provider to **serverless** and upgraded it to power any fetch-based runtime (Cloudflare Workers, Vercel Edge Functions, Deno Deploy, Netlify Functions).
  - Wrapped the Cloudflare adapter in a first-class `HonoServerlessProvider` that installs a scoped `waitUntil` bridge, reuses the shared routing layer, and exposes a `/ws` health stub so VoltOps Console can cleanly fall back to polling.
  - Dropped the manual environment merge – Workers should now enable the `nodejs_compat_populate_process_env` flag (documented in the new deployment guide) instead of calling `mergeProcessEnv` themselves.

  ## @voltagent/server-core
  - Reworked the observability handlers around the shared storage API, including a new `POST /setup-observability` helper that writes VoltOps keys into `.env` and expanded trace/log queries that match the serverless storage contract.

  ## @voltagent/cli
  - Added `volt deploy --target <cloudflare|vercel|netlify>` to scaffold the right config files. The Cloudflare template now ships with the required compatibility flags (`nodejs_compat`, `nodejs_compat_populate_process_env`, `no_handle_cross_request_promise_resolution`) so new projects run on Workers without extra tweaking.

- Updated dependencies [[`f4fa7e2`](https://github.com/VoltAgent/voltagent/commit/f4fa7e297fec2f602c9a24a0c77e645aa971f2b9)]:
  - @voltagent/server-core@1.0.12
