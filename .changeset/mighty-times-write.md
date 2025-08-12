---
"@voltagent/core": patch
---

feat: add separate stream method for workflows with real-time event streaming

## What Changed

Workflows now have a dedicated `.stream()` method that returns an AsyncIterable for real-time event streaming, separate from the `.run()` method. This provides better separation of concerns and improved developer experience.

## New Stream Method

```typescript
// Stream workflow execution with real-time events
const stream = workflow.stream(input);

// Iterate through events as they happen
for await (const event of stream) {
  console.log(`[${event.type}] ${event.from}`, event);

  if (event.type === "workflow-suspended") {
    // Resume continues the same stream
    await stream.resume({ approved: true });
  }
}

// Get final result after stream completes
const result = await stream.result;
```

## Key Features

- **Separate `.stream()` method**: Clean API separation from `.run()`
- **AsyncIterable interface**: Native async iteration support
- **Promise-based fields**: Result, status, and usage resolve when execution completes
- **Continuous streaming**: Stream remains open across suspend/resume cycles (programmatic API)
- **Type safety**: Full TypeScript support with `WorkflowStreamResult` type

## REST API Streaming

Added Server-Sent Events (SSE) endpoint for workflow streaming:

```typescript
POST / workflows / { id } / stream;

// Returns SSE stream with real-time workflow events
// Note: Due to stateless architecture, stream closes on suspension
// Resume operations return complete results (not streamed)
```

## Technical Details

- Stream events flow through central `WorkflowStreamController`
- No-op stream writer for non-streaming execution
- Suspension events properly emitted to stream
- Documentation updated with streaming examples and architecture notes
