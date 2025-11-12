# @voltagent/serverless-hono

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
