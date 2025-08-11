# Streaming

Workflow streaming provides real-time visibility into workflow execution through event emission and token usage tracking.

## Stream Events

Every workflow execution emits a stream of events. Each event follows this structure:

```typescript
interface WorkflowStreamEvent {
  type: string; // Event type identifier
  executionId: string; // Workflow execution ID
  from: string; // Source step ID or name
  input?: Record<string, any>; // Input data for the step
  output?: Record<string, any>; // Output data from the step
  status: "pending" | "running" | "success" | "error" | "suspended";
  userContext?: UserContext; // User context from workflow
  timestamp: string; // ISO 8601 timestamp
  stepIndex?: number; // Current step index
  stepType?: string; // Type of step (agent, func, etc.)
  metadata?: Record<string, any>; // Additional event metadata
  error?: any; // Error details if status is "error"
}
```

### Event Types

Workflows emit these event types during execution:

| Event Type          | Source     | When Emitted                   |
| ------------------- | ---------- | ------------------------------ |
| `workflow-start`    | Workflow   | Before first step executes     |
| `workflow-complete` | Workflow   | After final step completes     |
| `workflow-error`    | Workflow   | When workflow fails            |
| `workflow-suspend`  | Workflow   | When workflow suspends         |
| `step-start`        | Step       | Before step executes           |
| `step-complete`     | Step       | After step succeeds            |
| `step-error`        | Step       | When step fails                |
| `step-suspend`      | Step       | When step suspends             |
| Custom events       | Writer API | When you call `writer.write()` |

### Consuming the Stream

The stream is available on the execution result:

```typescript
const execution = await workflow.run(input);

// Iterate through events
for await (const event of execution.stream) {
  switch (event.type) {
    case "step-start":
      console.log(`Starting ${event.from} at ${event.timestamp}`);
      break;
    case "step-complete":
      console.log(`Completed ${event.from}:`, event.output);
      break;
    default:
      console.log(`Event: ${event.type} from ${event.from}`);
  }
}
```

## Writer API

The `writer` object is available in the execution context of all step types. Use it to emit custom events during step execution.

### Basic Usage

```typescript
.andThen({
  id: "process-data",
  execute: async ({ data, writer }) => {
    // Emit a custom event
    writer.write({
      type: "processing-started",
      metadata: {
        itemCount: data.items.length,
        timestamp: Date.now()
      }
    });

    const processed = await processItems(data.items);

    writer.write({
      type: "processing-complete",
      output: { processedCount: processed.length }
    });

    return processed;
  }
})
```

### Writer Methods

The writer provides two methods:

#### `write(event: Partial<WorkflowStreamEvent> & { type: string })`

Synchronously emits a custom event. Required fields:

- `type`: Event type identifier

Optional fields inherit from WorkflowStreamEvent. The writer automatically populates:

- `executionId`: From workflow context
- `from`: Current step name or ID
- `timestamp`: Current ISO timestamp
- `stepIndex`: Current step index
- `status`: Defaults to "running"

#### `pipeFrom(stream: AsyncIterable<any>, options?)`

Asynchronously forwards events from an agent's fullStream to the workflow stream.

```typescript
.andThen({
  id: "generate-content",
  execute: async ({ data, writer }) => {
    const agent = new Agent({ /* ... */ });
    const response = await agent.streamText(prompt);

    if (response.fullStream) {
      await writer.pipeFrom(response.fullStream, {
        prefix: "agent-",      // Prefix for event types
        agentId: agent.id,     // Override 'from' field
        filter: (part) => {    // Filter events
          return part.type !== "finish";
        }
      });
    }

    const text = await response.text;
    return { ...data, generated: text };
  }
})
```

Options for `pipeFrom`:

- `prefix?: string` - Prepended to event types (e.g., "agent-" + "text-delta" = "agent-text-delta")
- `agentId?: string` - Sets the `from` field in events
- `filter?: (part: any) => boolean` - Predicate to filter events

### Event Mapping

When using `pipeFrom`, agent stream parts are mapped to WorkflowStreamEvent:

| Stream Part Field | WorkflowStreamEvent Field | Condition                     |
| ----------------- | ------------------------- | ----------------------------- |
| `part.type`       | `type`                    | Always (with optional prefix) |
| `part.args`       | `input`                   | When type is "tool-call"      |
| `part.textDelta`  | `output`                  | When type is "text-delta"     |
| `part.result`     | `output`                  | When type is "tool-result"    |
| `part.usage`      | `metadata.usage`          | When type is "finish"         |
| `part.error`      | `metadata.error`          | When type is "error"          |

## Usage Tracking

Workflows automatically track token usage from `andAgent` steps. The accumulated usage is available on the execution result:

```typescript
const execution = await workflow.run(input);

console.log(execution.usage);
// {
//   promptTokens: 250,
//   completionTokens: 150,
//   totalTokens: 400
// }
```

### Accumulation Rules

- Only `andAgent` steps contribute to usage
- Custom agent calls in `andThen` steps are not tracked
- Usage accumulates across all andAgent executions
- Default values are 0 if no agents are used

### Accessing Usage in Steps

The accumulated usage is available in the state:

```typescript
.andThen({
  id: "check-usage",
  execute: async ({ data, state }) => {
    if (state.usage.totalTokens > 1000) {
      console.log("High token usage:", state.usage.totalTokens);
    }
    return data;
  }
})
```

## Implementation Patterns

### Progress Monitoring

Track progress through multi-step operations:

```typescript
.andThen({
  id: "batch-processor",
  execute: async ({ data, writer }) => {
    const items = data.items;
    const results = [];

    for (let i = 0; i < items.length; i++) {
      writer.write({
        type: "batch-progress",
        metadata: {
          current: i + 1,
          total: items.length,
          percentage: ((i + 1) / items.length) * 100
        }
      });

      results.push(await processItem(items[i]));
    }

    return { ...data, results };
  }
})
```

### Debugging Data Flow

Emit checkpoint events to trace data transformations:

```typescript
.andThen({
  id: "transform",
  execute: async ({ data, writer }) => {
    writer.write({
      type: "debug-checkpoint",
      metadata: {
        stepName: "transform",
        inputKeys: Object.keys(data),
        inputSize: JSON.stringify(data).length
      }
    });

    const transformed = transformData(data);

    writer.write({
      type: "debug-checkpoint",
      metadata: {
        stepName: "transform",
        outputKeys: Object.keys(transformed),
        outputSize: JSON.stringify(transformed).length
      }
    });

    return transformed;
  }
})
```

### Cost Tracking

Monitor token usage and calculate costs:

```typescript
const workflow = createWorkflowChain(config)
  .andAgent(prompt1, agent1, { schema: schema1 })
  .andAgent(prompt2, agent2, { schema: schema2 })
  .andThen({
    id: "calculate-cost",
    execute: async ({ data, state }) => {
      const costPerToken = 0.0001; // Example rate
      const totalCost = state.usage.totalTokens * costPerToken;

      return {
        ...data,
        tokenUsage: state.usage,
        estimatedCost: totalCost,
      };
    },
  });

const execution = await workflow.run(input);

// Final usage and cost
console.log("Total tokens:", execution.usage.totalTokens);
console.log("Estimated cost:", execution.result.estimatedCost);
```

### Real-time UI Updates

Stream events to a WebSocket for live UI updates:

```typescript
async function executeWithLiveUpdates(workflow, input, ws) {
  const execution = await workflow.run(input);

  // Send events to WebSocket client
  for await (const event of execution.stream) {
    ws.send(
      JSON.stringify({
        type: "workflow-event",
        event: event,
      })
    );

    // Handle specific events
    if (event.type === "step-complete") {
      ws.send(
        JSON.stringify({
          type: "step-progress",
          completed: event.stepIndex + 1,
          total: workflow.steps.length,
        })
      );
    }
  }

  return execution.result;
}
```

## Technical Constraints

### Stream Ordering

Events are emitted in execution order through a central `WorkflowStreamController`. This ensures:

- Events maintain chronological order
- Parent events precede child events
- Custom events appear between step-start and step-complete

### Memory Considerations

The stream buffers all events until consumed. For long-running workflows:

- Consume events as they're generated
- Avoid storing large objects in event metadata
- Use event filtering when piping agent streams

### Error Handling

Stream consumption continues even if individual events fail to process:

```typescript
for await (const event of execution.stream) {
  try {
    await processEvent(event);
  } catch (error) {
    console.error(`Failed to process event ${event.type}:`, error);
    // Stream continues
  }
}
```

### Async Iterator Behavior

The stream is an async iterator that:

- Yields events as they're emitted
- Completes when the workflow finishes
- Closes on workflow error or suspension
- Cannot be restarted once consumed

## API Reference

### WorkflowExecutionResult

```typescript
interface WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA> {
  executionId: string;
  workflowId: string;
  startAt: Date;
  endAt: Date;
  status: "completed" | "suspended" | "error";
  result: z.infer<RESULT_SCHEMA> | null;
  stream: AsyncIterableIterator<WorkflowStreamEvent>;
  usage: UsageInfo;
  suspension?: WorkflowSuspensionMetadata;
  error?: unknown;
  resume: (
    input: z.infer<RESUME_SCHEMA>,
    options?: { stepId?: string }
  ) => Promise<WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>>;
}
```

### UsageInfo

```typescript
interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}
```

### WorkflowStreamWriter

```typescript
interface WorkflowStreamWriter {
  write(event: Partial<WorkflowStreamEvent> & { type: string }): void;

  pipeFrom(
    fullStream: AsyncIterable<any>,
    options?: {
      prefix?: string;
      agentId?: string;
      filter?: (part: any) => boolean;
    }
  ): Promise<void>;
}
```
