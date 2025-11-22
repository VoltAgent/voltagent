---
"@voltagent/serverless-hono": patch
"@voltagent/core": patch
---

fix: ensure reliable trace export and context propagation in serverless environments

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
