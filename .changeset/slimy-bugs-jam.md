---
"@voltagent/serverless-hono": patch
---

fix: observability spans terminating prematurely on Vercel Edge and Deno Deploy

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
