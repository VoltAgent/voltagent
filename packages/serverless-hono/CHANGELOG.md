# @voltagent/serverless-hono

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
