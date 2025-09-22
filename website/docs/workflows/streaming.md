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
  context?: Record<string, any>; // Context from workflow
  timestamp: string; // ISO 8601 timestamp
  stepIndex?: number; // Current step index
  stepType?: string; // Type of step (agent, func, etc.)
  metadata?: Record<string, any>; // Additional event metadata
  error?: any; // Error details if status is "error"
}
```

### Event Types

Workflows emit these event types during execution:

| Event Type           | Source     | When Emitted                   |
| -------------------- | ---------- | ------------------------------ |
| `workflow-start`     | Workflow   | Before first step executes     |
| `workflow-complete`  | Workflow   | After final step completes     |
| `workflow-error`     | Workflow   | When workflow fails            |
| `workflow-suspended` | Workflow   | When workflow suspends         |
| `step-start`         | Step       | Before step executes           |
| `step-complete`      | Step       | After step succeeds            |
| `step-error`         | Step       | When step fails                |
| `step-suspend`       | Step       | When step suspends             |
| Custom events        | Writer API | When you call `writer.write()` |

### Consuming the Stream

VoltAgent provides two methods for workflow execution:

- `.run()` - Standard execution without streaming
- `.stream()` - Real-time execution with event streaming

```typescript
// Method 1: Stream execution for real-time events
const stream = workflow.stream(input);

// Iterate through events as they happen
for await (const event of stream) {
  switch (event.type) {
    case "step-start":
      console.log(`Starting ${event.from} at ${event.timestamp}`);
      break;
    case "step-complete":
      console.log(`Completed ${event.from}:`, event.output);
      break;
    case "workflow-suspended":
      console.log(`Workflow suspended: ${event.metadata?.reason}`);
      break;
    default:
      console.log(`Event: ${event.type} from ${event.from}`);
  }
}

// Get the final result (promise-based)
const result = await stream.result;
console.log("Final result:", result);

// Method 2: Standard execution without streaming
const execution = await workflow.run(input);
console.log("Result:", execution.result);
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

## Suspend/Resume with Streaming

### Programmatic API

When using the programmatic API, **the stream remains continuous across suspend and resume operations**. When a workflow suspends and then resumes, all events continue flowing through the same stream iterator.

#### Continuous Stream Example

```typescript
const stream = workflow.stream(input);

// Single iterator handles all events, including after resume
for await (const event of stream) {
  console.log(`Event: ${event.type} from ${event.from}`);

  if (event.type === "workflow-suspended") {
    console.log("Workflow suspended, resuming in 3 seconds...");

    // Resume after delay
    setTimeout(async () => {
      await stream.resume({ approved: true });
    }, 3000);

    // The stream continues - no need for a new iterator!
    // Events from the resumed execution will flow through this same loop
  }
}

// After the loop completes, get the final result
const finalResult = await stream.result;
console.log("Workflow completed:", finalResult);
```

#### Key Benefits

1. **Single Stream Iterator**: You don't need to create a new stream or iterator after resume
2. **Continuous Event Flow**: All events (before suspend, during suspend, and after resume) flow through the same stream
3. **Simplified Code**: No need to manage multiple streams or reconnect after suspension
4. **Complete History**: The stream captures the entire execution lifecycle

### REST API Streaming

VoltAgent also provides REST API endpoints for streaming workflow execution using Server-Sent Events (SSE). However, the behavior differs from the programmatic API due to VoltAgent's **stateless architecture**.

#### Starting a Stream

```typescript
// Start workflow stream via REST API
const response = await fetch("http://localhost:3141/workflows/expense-approval/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    input: {
      employeeId: "EMP001",
      amount: 750,
      category: "travel",
      description: "Conference attendance",
    },
    options: {
      userId: "user-123",
      executionId: "exec-456",
    },
  }),
});

// Process SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const text = decoder.decode(value);
  // Parse SSE events (lines starting with "data: ")
  const lines = text.split("\n");
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const event = JSON.parse(line.slice(6));
      console.log(`[${event.type}] ${event.from}`, event);

      if (event.type === "workflow-suspended") {
        console.log("Workflow suspended - stream will close");
        // Stream closes here - stateless architecture
      }
    }
  }
}
```

#### Stateless Architecture: Important Differences

Due to VoltAgent's stateless design, REST API streaming behaves differently from the programmatic API:

1. **Initial Execution**: Stream events via SSE until completion or suspension
2. **On Suspension**: SSE stream closes (server doesn't maintain stream state)
3. **Resume Execution**: Returns complete result via standard HTTP response (not streamed)

```typescript
// After suspension, resume via separate endpoint
const resumeResponse = await fetch(
  "http://localhost:3141/workflows/expense-approval/executions/exec-456/resume",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      resumeData: {
        approved: true,
        managerId: "MGR001",
        comments: "Approved for conference",
      },
    }),
  }
);

// Resume returns complete result (not streamed)
const result = await resumeResponse.json();
console.log("Final result:", result);
// {
//   status: "completed",
//   result: { status: "approved", approvedBy: "MGR001", ... },
//   usage: { totalTokens: 450, ... }
// }
```

#### Comparison: Programmatic vs REST API

| Feature             | Programmatic API       | REST API                  |
| ------------------- | ---------------------- | ------------------------- |
| Initial execution   | Streamed               | Streamed via SSE          |
| Suspension handling | Stream continues       | Stream closes             |
| Resume behavior     | Same stream continues  | Returns complete result   |
| State management    | In-memory (stateful)   | Stateless                 |
| Use case            | Long-running processes | Request-response patterns |

#### Complete REST API Example

Here's a complete example handling the full lifecycle:

```typescript
async function executeWorkflowWithREST() {
  const apiUrl = "http://localhost:3141";
  const workflowId = "expense-approval";
  let executionId: string | null = null;

  // 1. Start streaming execution
  console.log("Starting workflow stream...");
  const streamResponse = await fetch(`${apiUrl}/workflows/${workflowId}/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: {
        employeeId: "EMP001",
        amount: 750,
        category: "travel",
        description: "Conference attendance",
      },
      options: {
        userId: "user-123",
      },
    }),
  });

  // 2. Process stream until suspension
  const reader = streamResponse.body!.getReader();
  const decoder = new TextDecoder();
  let suspended = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const event = JSON.parse(line.slice(6));
        console.log(`Event: ${event.type}`);

        if (!executionId && event.executionId) {
          executionId = event.executionId;
        }

        if (event.type === "workflow-suspended") {
          suspended = true;
          console.log("Workflow suspended, stream closed");
        }
      }
    }
  }

  // 3. If suspended, resume after approval
  if (suspended && executionId) {
    console.log("Getting manager approval...");
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Simulate delay

    console.log("Resuming workflow...");
    const resumeResponse = await fetch(
      `${apiUrl}/workflows/${workflowId}/executions/${executionId}/resume`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeData: {
            approved: true,
            managerId: "MGR001",
            comments: "Approved for conference",
            adjustedAmount: 700,
          },
        }),
      }
    );

    const result = await resumeResponse.json();
    console.log("Workflow completed:", result);
    return result;
  }
}
```

#### Current Limitations and Future Development

Currently, the REST API does not support continuous streaming across suspend/resume cycles. This is a known limitation that may be addressed in future releases.

**Current Behavior:**

- SSE stream closes when workflow suspends
- Resume returns complete result without streaming
- No WebSocket-based continuous streaming yet

**Planned Enhancement:**
Continuous streaming across suspend/resume cycles via WebSocket is being considered for implementation. This would provide:

- Persistent connection across workflow lifecycle
- Real-time events during resume execution
- Unified stream for complete workflow history

**Contributing:**
If you need continuous streaming across suspend/resume in the REST API, please:

1. Open a GitHub issue at [github.com/VoltAgent/voltagent/issues](https://github.com/VoltAgent/voltagent/issues)
2. Describe your use case and requirements
3. Consider contributing to the implementation

For now, use the programmatic API directly if you need continuous streaming across suspend/resume cycles.

### Suspend/Resume Event Flow

> **Important:** Register your workflow with `new VoltAgent({ workflows: { ... } })` so suspend/resume streaming works with the registry and REST endpoints.

```typescript
// Example workflow with suspension
const workflow = createWorkflowChain(config)
  .andThen({
    id: "check-approval",
    execute: async ({ data, suspend, resumeData }) => {
      if (!resumeData) {
        // First execution - suspend for approval
        await suspend("Approval required", { requestId: data.id });
      }
      // After resume - continue with resumeData
      return { ...data, approved: resumeData.approved };
    },
  })
  .andThen({
    id: "process",
    execute: async ({ data }) => {
      // This step executes after resume
      return processApprovedData(data);
    },
  });

// Stream captures entire lifecycle
const stream = workflow.stream({ id: "123", amount: 1000 });

for await (const event of stream) {
  console.log(event.type);
  // Output sequence:
  // 1. "workflow-start"
  // 2. "step-start" (check-approval)
  // 3. "workflow-suspended"
  // --- resume called ---
  // 4. "step-complete" (check-approval)
  // 5. "step-start" (process)
  // 6. "step-complete" (process)
  // 7. "workflow-complete"

  if (event.type === "workflow-suspended") {
    await stream.resume({ approved: true });
  }
}
```

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
  const stream = workflow.stream(input);

  // Send events to WebSocket client
  for await (const event of stream) {
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

    // Handle suspension for user approval
    if (event.type === "workflow-suspended") {
      ws.send(
        JSON.stringify({
          type: "approval-required",
          suspendData: event.metadata?.suspendData,
        })
      );

      // Wait for approval from client
      // In real app, this would be triggered by client message
      ws.on("message", async (message) => {
        const data = JSON.parse(message);
        if (data.type === "approve") {
          await stream.resume(data.resumeData);
        }
      });
    }
  }

  return await stream.result;
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
- Completes when the workflow finishes (success or error)
- **Remains open during suspension** - continues after resume
- Cannot be restarted once consumed
- Maintains event order across suspend/resume cycles

## API Reference

### WorkflowExecutionResult

Returned by `.run()` method - standard execution without streaming:

```typescript
interface WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA> {
  executionId: string;
  workflowId: string;
  startAt: Date;
  endAt: Date;
  status: "completed" | "suspended" | "error";
  result: z.infer<RESULT_SCHEMA> | null;
  usage: UsageInfo;
  suspension?: WorkflowSuspensionMetadata;
  error?: unknown;
  resume: (
    input: z.infer<RESUME_SCHEMA>,
    options?: { stepId?: string }
  ) => Promise<WorkflowExecutionResult<RESULT_SCHEMA, RESUME_SCHEMA>>;
}
```

### WorkflowStreamResult

Returned by `.stream()` method - real-time streaming execution:

```typescript
interface WorkflowStreamResult<RESULT_SCHEMA, RESUME_SCHEMA>
  extends AsyncIterable<WorkflowStreamEvent> {
  executionId: string;
  workflowId: string;
  startAt: Date;
  // Promise-based fields that resolve when execution completes
  endAt: Promise<Date>;
  status: Promise<"completed" | "suspended" | "error">;
  result: Promise<z.infer<RESULT_SCHEMA> | null>;
  suspension: Promise<WorkflowSuspensionMetadata | undefined>;
  error: Promise<unknown | undefined>;
  usage: Promise<UsageInfo>;
  // Resume continues with the same stream
  resume: (
    input: z.infer<RESUME_SCHEMA>
  ) => Promise<WorkflowStreamResult<RESULT_SCHEMA, RESUME_SCHEMA>>;
  abort: () => void;
}
```

### Key Differences

| Feature          | `.run()`                  | `.stream()`            |
| ---------------- | ------------------------- | ---------------------- |
| Returns          | `WorkflowExecutionResult` | `WorkflowStreamResult` |
| Event streaming  | No                        | Yes (AsyncIterable)    |
| Field resolution | Immediate                 | Promise-based          |
| Use case         | Simple execution          | Real-time monitoring   |
| Resume behavior  | New execution             | Same stream continues  |

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
