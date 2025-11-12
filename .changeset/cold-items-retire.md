---
"@voltagent/core": patch
---

fix: remove ambient parent spans in serverless environments to ensure proper trace completion

## The Problem

When deploying VoltAgent to serverless platforms like Vercel/Next.js, Netlify Functions, or Cloudflare Workers, traces would remain in "pending" status in VoltOps even though:

- All spans were successfully exported to the backend
- The agent execution completed successfully
- The finish reason was captured correctly

**Root Cause**: VoltAgent was using `context.active()` when creating root spans, which inherited ambient spans from the hosting framework (e.g., Next.js instrumentation, Vercel telemetry). This caused agent root spans to appear as child spans with framework-generated parent span IDs, preventing the backend from recognizing them as trace roots.

Example of the issue:

```typescript
// Backend received:
{
  name: 'Supervisor',
  parentSpanId: '8423d7ed5539b430', // ❌ Next.js ambient span
  isRootSpan: false,                // ❌ Not detected as root
  agentState: 'completed',
}
// Result: Trace stayed "pending" forever
```

## The Solution

Updated `trace-context.ts` to use `trace.deleteSpan(context.active())` instead of `context.active()` when no explicit parent span exists. This removes ambient spans from the context, ensuring agent root spans are truly root.

**Before**:

```typescript
const parentContext = parentSpan ? trace.setSpan(context.active(), parentSpan) : context.active(); // ❌ Includes ambient spans
```

**After**:

```typescript
const parentContext = parentSpan
  ? trace.setSpan(context.active(), parentSpan)
  : trace.deleteSpan(context.active()); // ✅ Clean context
```

This follows OpenTelemetry's official pattern from `@opentelemetry/sdk-trace-base`:

```typescript
if (options.root) {
  context = api.trace.deleteSpan(context);
}
```

## Impact

- ✅ **Serverless environments**: Traces now properly complete in VoltOps on Vercel, Netlify, Cloudflare Workers
- ✅ **Framework compatibility**: Works correctly alongside Next.js, Express, and other instrumented frameworks
- ✅ **Proper trace hierarchy**: Agent root spans are no longer children of ambient framework spans
- ✅ **No breaking changes**: Only affects root span context creation, existing functionality preserved
- ✅ **Observability improvements**: Backend can now correctly identify root spans and mark traces as "completed"

## Verification

After the fix, backend logs show:

```typescript
{
  name: 'Supervisor',
  parentSpanId: undefined,          // ✅ No ambient parent
  isRootSpan: true,                 // ✅ Correctly detected
  agentState: 'completed',
}
// Result: Trace marked as "completed" ✅
```

## Usage

No code changes required - this fix is automatic for all VoltAgent applications deployed to serverless environments.

**Note**: If you previously added workarounds like `after()` with `forceFlush()` in Next.js routes, those are no longer necessary for trace completion (though they may still be useful for ensuring spans are exported before function termination on some platforms).
