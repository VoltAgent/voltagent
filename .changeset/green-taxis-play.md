---
"@voltagent/core": patch
---

feat: add real-time stream support and usage tracking for workflows

## What Changed for You

Workflows now support real-time event streaming and token usage tracking, providing complete visibility into workflow execution and resource consumption. Previously, workflows only returned final results without intermediate visibility or usage metrics.

## Before - Limited Visibility

```typescript
// ❌ OLD: Only final result, no streaming or usage tracking
const workflow = createWorkflowChain(config)
  .andThen({ execute: async ({ data }) => processData(data) })
  .andAgent(prompt, agent, { schema });

const result = await workflow.run(input);
// Only got final result, no intermediate events or usage info
```

## After - Full Stream Support and Usage Tracking

```typescript
// ✅ NEW: Real-time streaming and usage tracking
const workflow = createWorkflowChain(config)
  .andThen({
    execute: async ({ data, writer }) => {
      // Emit custom events for monitoring
      writer.write({
        type: "processing-started",
        metadata: { itemCount: data.items.length },
      });

      const processed = await processData(data);

      writer.write({
        type: "processing-complete",
        output: { processedCount: processed.length },
      });

      return processed;
    },
  })
  .andAgent(prompt, agent, { schema });

// Get both result and stream
const execution = await workflow.run(input);

// Monitor events in real-time
for await (const event of execution.stream) {
  console.log(`[${event.type}] ${event.from}:`, event);
  // Events: workflow-start, step-start, custom events, step-complete, workflow-complete
}

// Access token usage from all andAgent steps
console.log("Total tokens used:", execution.usage);
// { promptTokens: 250, completionTokens: 150, totalTokens: 400 }
```

## Advanced: Agent Stream Piping

```typescript
// ✅ NEW: Pipe agent's streaming output directly to workflow stream
.andThen({
  execute: async ({ data, writer }) => {
    const agent = new Agent({ /* ... */ });

    // Stream agent's response with full visibility
    const response = await agent.streamText(prompt);

    // Pipe all agent events (text-delta, tool-call, etc.) to workflow stream
    if (response.fullStream) {
      await writer.pipeFrom(response.fullStream, {
        prefix: "agent-", // Optional: prefix event types
        filter: (part) => part.type !== "finish" // Optional: filter events
      });
    }

    const result = await response.text;
    return { ...data, agentResponse: result };
  }
})
```

## Key Features

### 1. Stream Events

Every workflow execution now includes a stream of events:

- `workflow-start` / `workflow-complete` - Workflow lifecycle
- `step-start` / `step-complete` - Step execution tracking
- Custom events via `writer.write()` - Application-specific monitoring
- Piped agent events via `writer.pipeFrom()` - Full agent visibility

### 2. Writer API in All Steps

The `writer` is available in all step types:

```typescript
// andThen
.andThen({ execute: async ({ data, writer }) => { /* ... */ } })

// andTap (observe without modifying)
.andTap({ execute: async ({ data, writer }) => {
  writer.write({ type: "checkpoint", metadata: { data } });
}})

// andWhen
.andWhen({
  condition: async ({ data, writer }) => {
    writer.write({ type: "condition-check", input: data });
    return data.shouldProcess;
  },
  execute: async ({ data, writer }) => { /* ... */ }
})
```

### 3. Usage Tracking

Token usage from all `andAgent` steps is automatically accumulated:

```typescript
const execution = await workflow.run(input);

// Total usage across all andAgent steps
const { promptTokens, completionTokens, totalTokens } = execution.usage;

// Usage is always available (defaults to 0 if no agents used)
console.log(`Cost: $${totalTokens * 0.0001}`); // Example cost calculation
```

## Why This Matters

- **Real-time Monitoring**: See what's happening as workflows execute
- **Debugging**: Track data flow through each step with custom events
- **Cost Control**: Monitor token usage across complex workflows
- **Agent Integration**: Full visibility into agent operations within workflows
- **Production Ready**: Stream events for logging, monitoring, and alerting

## Technical Details

- Stream is always available (non-optional) for consistent API
- Events include execution context (executionId, timestamp, status)
- Writer functions are synchronous for `write()`, async for `pipeFrom()`
- Usage tracking only counts `andAgent` steps (not custom agent calls in `andThen`)
- All events flow through a central `WorkflowStreamController` for ordering
