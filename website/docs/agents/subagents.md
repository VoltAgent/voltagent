---
title: Sub-agents
slug: /agents/sub-agents
---

# Sub-agents

Sub-agents are agents that work under a supervisor agent to handle specific tasks. This architecture allows you to create agent workflows where each sub-agent focuses on a specific domain, coordinated by a supervisor.

## Why Use Sub-agents?

- **Task delegation**: Assign specific tasks to agents configured for particular domains (e.g., coding, translation, data analysis)
- **Workflow orchestration**: Build multi-step workflows by delegating tasks to appropriate agents
- **Code organization**: Break down complex problems into smaller components
- **Modularity**: Add or swap agents without disrupting the entire system

## Creating and Using Sub-agents

### Creating Individual Agents

Create the agents that will serve as sub-agents:

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Create an agent for content creation
const contentCreatorAgent = new Agent({
  name: "ContentCreator",
  instructions: "Creates short text content on requested topics",
  model: openai("gpt-4o-mini"),
});

// Create an agent for formatting
const formatterAgent = new Agent({
  name: "Formatter",
  instructions: "Formats and styles text content",
  model: openai("gpt-4o-mini"),
});
```

### Creating a Supervisor Agent

Pass the agents in the `subAgents` array during supervisor initialization:

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const supervisorAgent = new Agent({
  name: "Supervisor",
  instructions: "Coordinates between content creation and formatting agents",
  model: openai("gpt-4o-mini"),
  subAgents: [contentCreatorAgent, formatterAgent],
});
```

:::tip Advanced Sub-agent Configuration
By default, sub-agents use the `streamText` method. You can specify different methods like `generateText`, `generateObject`, or `streamObject` with custom schemas and options.

See: [Advanced Configuration](#advanced-configuration)
:::

## Customizing Supervisor Behavior

Supervisor agents use an automatically generated system message that includes guidelines for managing sub-agents. Customize this behavior using the `supervisorConfig` option.

:::info Default System Message
See the [generateSupervisorSystemMessage implementation](https://github.com/VoltAgent/voltagent/blob/main/packages/core/src/agent/subagent/index.ts#L131) on GitHub.
:::

:::note Type Safety
The `supervisorConfig` option is only available when `subAgents` are provided. TypeScript will prevent you from using `supervisorConfig` on agents without sub-agents.
:::

### Basic Supervisor Configuration

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const supervisorAgent = new Agent({
  name: "Content Supervisor",
  instructions: "Coordinate content creation workflow",
  model: openai("gpt-4o-mini"),
  subAgents: [writerAgent, editorAgent],

  supervisorConfig: {
    // Add custom guidelines to the default ones
    customGuidelines: [
      "Always thank the user at the end",
      "Keep responses concise and actionable",
      "Prioritize user experience",
    ],

    // Control whether to include previous agent interactions
    includeAgentsMemory: true, // default: true
  },
});
```

### Stream Event Forwarding Configuration

Control which events from sub-agents are forwarded to the parent stream. By default, only `tool-call` and `tool-result` events are forwarded.

```ts
const supervisorAgent = new Agent({
  name: "Content Supervisor",
  instructions: "Coordinate content creation workflow",
  model: openai("gpt-4o-mini"),
  subAgents: [writerAgent, editorAgent],

  supervisorConfig: {
    // Configure which sub-agent events to forward
    fullStreamEventForwarding: {
      // Default: ['tool-call', 'tool-result']
      types: ["tool-call", "tool-result", "text-delta", "reasoning", "source", "error", "finish"],
    },
  },
});
```

**Common Configurations:**

```ts
// Minimal - Only tool events (default)
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result'],
}

// Text + Tools - Include text generation
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result', 'text-delta'],
}

// Full visibility - All events including reasoning
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result', 'text-delta', 'reasoning', 'source', 'error', 'finish'],
}

// Clean tool names - No agent prefix (add prefix manually when consuming events if desired)
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result'],
}
```

This configuration balances stream performance and information detail for sub-agent interactions.

### Error Handling Configuration

Control how the supervisor handles sub-agent failures.

```ts
const supervisorAgent = new Agent({
  name: "Supervisor",
  instructions: "Coordinate between agents",
  model: openai("gpt-4o-mini"),
  subAgents: [dataProcessor, analyzer],

  supervisorConfig: {
    // Control whether stream errors throw exceptions
    throwOnStreamError: false, // default: false

    // Control whether error messages appear in empty responses
    includeErrorInEmptyResponse: true, // default: true
  },
});
```

#### Configuration Options

**`throwOnStreamError`** (boolean, default: `false`)

- When `false`: Stream errors are caught and returned as error results with `status: "error"`
- When `true`: Stream errors throw exceptions that must be caught with try/catch
- Set to `true` to handle errors at a higher level or trigger retry logic

**`includeErrorInEmptyResponse`** (boolean, default: `true`)

- When `true`: Error messages are included in the response when no content was generated
- When `false`: Returns empty string in result, but still marks status as "error"
- Set to `false` to handle error messaging yourself

#### Common Error Handling Patterns

**Default - Graceful Error Handling:**

```ts
// Errors are returned as results with helpful messages
supervisorConfig: {
  throwOnStreamError: false,
  includeErrorInEmptyResponse: true,
}

// Usage:
const result = await supervisor.streamText("Process data");
// If sub-agent fails:
// result contains error message like "Error in DataProcessor: Stream failed"
```

:::info Native Retry Support
VoltAgent uses the AI SDK's native retry mechanism (default: 3 attempts). Setting `throwOnStreamError: true` is useful for custom error handling or logging at a higher level, not for implementing retry logic.
:::

**Silent Errors - Custom Messaging:**

```ts
// Errors don't include automatic messages
supervisorConfig: {
  includeErrorInEmptyResponse: false,
}

// Usage with custom error handling:
const result = await supervisor.streamText("Process data");
for await (const event of result.fullStream) {
  if (event.type === "error") {
    // Provide custom user-friendly error message
    console.log("We're having trouble processing your request. Please try again.");
  }
}
```

**Production Setup - Error Tracking:**

```ts
supervisorConfig: {
  throwOnStreamError: false, // Don't crash the app
  includeErrorInEmptyResponse: true, // Help with debugging

  // Capture error events for monitoring
  fullStreamEventForwarding: {
    types: ['tool-call', 'tool-result', 'error'],
  },
}
```

#### Error Handling in Practice

The supervisor's behavior when a sub-agent encounters an error depends on your configuration:

```ts
// Example: Sub-agent fails during stream
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [unreliableAgent],
  supervisorConfig: {
    throwOnStreamError: false,
    includeErrorInEmptyResponse: true,
  },
});

// The supervisor handles the failure
const response = await supervisor.streamText("Do something risky");

// Check the response
if (response.status === "error") {
  console.log("Sub-agent failed:", response.error);
  // response.result contains: "Error in UnreliableAgent: [error details]"
} else {
  // Process successful response
}
```

#### Using with fullStream

When using `fullStream`, the configuration controls what you receive from sub-agents:

```ts
// Stream with full event details
const result = await supervisorAgent.streamText("Create and edit content", {
  fullStream: true,
});

// Process different event types
for await (const event of result.fullStream) {
  switch (event.type) {
    case "tool-call":
      console.log(
        `${event.subAgentName ? `[${event.subAgentName}] ` : ""}Tool called: ${event.data.toolName}`
      );
      break;
    case "tool-result":
      console.log(
        `${event.subAgentName ? `[${event.subAgentName}] ` : ""}Tool result: ${event.data.result}`
      );
      break;
    case "text-delta":
      // Only appears if included in types array
      console.log(`Text: ${event.data}`);
      break;
    case "reasoning":
      // Only appears if included in types array
      console.log(`Reasoning: ${event.data}`);
      break;
  }
}
```

#### Filtering Sub-agent Events

Identify which events come from sub-agents by checking for `subAgentId` and `subAgentName` properties:

```ts
const result = await supervisorAgent.streamText("Create and edit content", {
  fullStream: true,
});

for await (const event of result.fullStream) {
  // Check if this event is from a sub-agent
  if (event.subAgentId && event.subAgentName) {
    console.log(`Event from sub-agent ${event.subAgentName}:`);
    console.log(`  Type: ${event.type}`);
    console.log(`  Data:`, event.data);

    // Filter by specific sub-agent
    if (event.subAgentName === "WriterAgent") {
      // Handle writer agent events specifically
    }
  } else {
    // This is from the supervisor agent itself
    console.log(`Supervisor event: ${event.type}`);
  }
}
```

This allows you to:

- Distinguish between supervisor and sub-agent events
- Filter events by specific sub-agent
- Apply different handling logic based on the event source

### Complete System Message Override

Provide a custom `systemMessage` to replace the default template:

```ts
const supervisorAgent = new Agent({
  name: "Custom Supervisor",
  instructions: "This will be ignored when systemMessage is provided",
  model: openai("gpt-4o-mini"),
  subAgents: [writerAgent, editorAgent],

  supervisorConfig: {
    systemMessage: `
You are a content manager named "ContentBot".

Your team:
- Writer: Creates original content
- Editor: Reviews and improves content

Your workflow:
1. Analyze user requests
2. Use delegate_task to assign work to appropriate specialists
3. Coordinate between specialists as needed
4. Provide final responses
5. Maintain a professional tone

Remember: Use the delegate_task tool to assign tasks to your specialists.
    `.trim(),

    // Control memory inclusion even with custom system message
    includeAgentsMemory: true,
  },
});
```

### Quick Usage

**Add custom rules:**

```ts
supervisorConfig: {
  customGuidelines: ["Verify sources", "Include confidence levels"];
}
```

**Override entire system message:**

```ts
supervisorConfig: {
  systemMessage: "You are TaskBot. Use delegate_task(task, [agentNames]) to assign work.";
}
```

**Control memory:**

```ts
supervisorConfig: {
  includeAgentsMemory: false; // Fresh context each interaction (default: true)
}
```

**Configure event forwarding:**

```ts
supervisorConfig: {
  fullStreamEventForwarding: {
    types: ['tool-call', 'tool-result', 'text-delta'], // Control which events to forward
  }
}
```

**Handle errors gracefully:**

```ts
supervisorConfig: {
  throwOnStreamError: false, // Return errors as results (default)
  includeErrorInEmptyResponse: true // Include error details in response (default)
}
```

**Throw exceptions for custom error handling:**

```ts
supervisorConfig: {
  throwOnStreamError: true; // Throw exceptions on sub-agent failures
}
```

## How Sub-agents Work

The supervisor agent delegates tasks to its sub-agents using the automatically provided `delegate_task` tool.

1. A user sends a request to the supervisor agent.
2. The supervisor's LLM analyzes the request and its system prompt (which lists available sub-agents).
3. Based on the task, the supervisor decides which sub-agent(s) to use.
4. The supervisor uses the `delegate_task` tool to hand off the task(s).

### The `delegate_task` Tool

This tool is automatically added to supervisor agents and handles delegation.

- **Name**: `delegate_task`
- **Description**: "Delegate a task to one or more specialized agents"
- **Parameters**:
  - `task` (string, required): The task description to be delegated
  - `targetAgents` (array of strings, required): Sub-agent names to delegate the task to. The supervisor can delegate to multiple agents simultaneously
  - `context` (object, optional): Additional context needed by the sub-agent(s)
- **Execution**:
  - Finds the sub-agent instances based on the provided names
  - Calls the `handoffTask` (or `handoffToMultiple`) method internally
  - Passes the supervisor's agent ID (`parentAgentId`) and history entry ID (`parentHistoryEntryId`) for observability
- **Returns**:
  - **Always returns an array** of result objects (even for single agent):
    ```ts
    [
      {
        agentName: string; // Name of the sub-agent that executed the task
        response: string; // The text result returned by the sub-agent
        usage?: UsageInfo; // Token usage information
        bailed?: boolean; // True if onHandoffComplete called bail()
      },
      // ... more results if multiple agents were targeted
    ]
    ```

  When `bailed: true`, the supervisor's execution is terminated immediately and the subagent's response is returned to the user. See [Early Termination (Bail)](#early-termination-bail) for details.

5. Sub-agents process their delegated tasks independently. They can use their own tools or delegate further if they are also supervisors.
6. Each sub-agent returns its result to the `delegate_task` tool execution context.
7. The supervisor receives the results from the `delegate_task` tool.
8. The supervisor synthesizes the final response based on its instructions and the received results.

## Complete Example

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

// Create agents
const writer = new Agent({
  name: "Writer",
  instructions: "Write creative stories",
  model: openai("gpt-4o-mini"),
});

const translator = new Agent({
  name: "Translator",
  instructions: "Translate text accurately",
  model: openai("gpt-4o-mini"),
});

// Create supervisor
const supervisor = new Agent({
  name: "Supervisor",
  instructions: "Coordinate story writing and translation",
  model: openai("gpt-4o-mini"),
  subAgents: [writer, translator],
});

// Use it
const result = await supervisor.streamText("Write a story about AI and translate to Spanish");

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

**What happens:**

1. Supervisor analyzes request
2. Calls `delegate_task` → Writer creates story
3. Calls `delegate_task` → Translator translates
4. Combines results and responds

## Using Hooks

VoltAgent provides hooks to monitor and control the supervisor/subagent workflow:

### `onHandoff` Hook

Triggered when delegation begins:

```ts
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [writer, translator],
  hooks: {
    onHandoff: ({ agent, sourceAgent }) => {
      console.log(`${sourceAgent.name} → ${agent.name}`);
    },
  },
});
```

### `onHandoffComplete` Hook

Triggered when a subagent completes execution. This hook enables **early termination (bail)** to optimize token usage:

```ts
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [dataAnalyzer, reportGenerator],
  hooks: {
    onHandoffComplete: async ({ agent, sourceAgent, result, messages, usage, context, bail }) => {
      // Bail if subagent produced final output
      if (agent.name === "Report Generator") {
        context.logger?.info("Final report ready, bailing");
        bail(); // Skip supervisor processing
      }
    },
  },
});
```

See [Early Termination (Bail)](#early-termination-bail) below for detailed usage.

## Context Sharing

Sub-agents automatically inherit the supervisor's context:

```ts
// Supervisor passes context
const response = await supervisor.streamText("Task", {
  context: new Map([["projectId", "123"]]),
});

// Sub-agent receives it automatically
const subAgent = new Agent({
  hooks: {
    onStart: (context) => {
      const projectId = context.context.get("projectId"); // "123"
    },
  },
});
```

## Early Termination (Bail)

### The Problem

In supervisor/subagent workflows, subagents **always** return to the supervisor for processing, even when they generate final outputs (like JSON structures or reports) that need no additional handling. This wastes tokens:

```
Current flow:
Supervisor → SubAgent (generates 2K token JSON) → Supervisor (processes JSON) → User
                                                    ↑ Wastes ~2K tokens
```

**Example impact:**

- Without bail: ~2,650 tokens per request
- With bail: ~560 tokens per request
- **Savings: 79%** (~$0.020 per request)

### The Solution

The `onHandoffComplete` hook allows supervisors to intercept subagent results and **bail** (skip supervisor processing) when the subagent produces final output:

```
New flow:
Supervisor → SubAgent → bail() → User ✅
```

### Basic Usage

Call `bail()` in the `onHandoffComplete` hook to terminate early:

```ts
const supervisor = new Agent({
  name: "Workout Supervisor",
  subAgents: [exerciseAgent, workoutBuilder],
  hooks: {
    onHandoffComplete: async ({ agent, result, bail, context }) => {
      // Workout Builder produces final JSON - no processing needed
      if (agent.name === "Workout Builder") {
        context.logger?.info("Final output received, bailing");
        bail(); // Skip supervisor, return directly to user
      }
      // Default: continue to supervisor for processing
    },
  },
});
```

### Conditional Bail Logic

Bail based on agent name, result size, or content:

```ts
hooks: {
  onHandoffComplete: async ({ agent, result, bail, context }) => {
    // By agent name
    if (agent.name === "Report Generator") {
      bail();
      return;
    }

    // By result size (save tokens)
    if (result.length > 2000) {
      context.logger?.warn("Large result, bailing to save tokens");
      bail();
      return;
    }

    // By result content
    if (result.includes("FINAL_OUTPUT")) {
      bail();
      return;
    }

    // Default: continue to supervisor
  },
}
```

### Transform Before Bail

Optionally transform the result before bailing:

```ts
hooks: {
  onHandoffComplete: async ({ agent, result, bail }) => {
    if (agent.name === "Report Generator") {
      // Add metadata before returning
      const transformed = `# Final Report\n\n${result}\n\n---\nGenerated at: ${new Date().toISOString()}`;
      bail(transformed); // Bail with transformed result
    }
  },
}
```

### Hook Parameters

```ts
interface OnHandoffCompleteHookArgs {
  agent: Agent; // Target agent (subagent)
  sourceAgent: Agent; // Source agent (supervisor)
  result: string; // Subagent's output
  messages: UIMessage[]; // Full conversation messages
  usage?: UsageInfo; // Token usage info
  context: OperationContext; // Operation context
  bail: (transformedResult?: string) => void; // Call to bail
}
```

### Accessing Bailed Results

When a subagent bails, the **subagent's result** is returned to the user (not the supervisor's):

```ts
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [
    createSubagent({
      agent: workoutBuilder,
      method: "generateObject",
      schema: WorkoutSchema,
    }),
  ],
  hooks: {
    onHandoffComplete: async ({ agent, bail }) => {
      if (agent.name === "Workout Builder") {
        bail(); // Return workout JSON directly
      }
    },
  },
});

const result = await supervisor.generateText("Create workout");
console.log(result.text); // Contains workout JSON, not supervisor's processing
```

### Supported Methods

Bail works with methods that support tools:

- ✅ `generateText` - Aborts execution, returns bailed result
- ✅ `streamText` - Aborts stream immediately, returns bailed result
- ❌ `generateObject` - No tool support, bail not applicable
- ❌ `streamObject` - No tool support, bail not applicable

### Stream Event Visibility with Bail

When using bail with `toUIMessageStream()` or consuming `fullStream` events, you need to configure which events are forwarded from subagents.

**Default Behavior:**

By default, only `tool-call` and `tool-result` events are forwarded from subagents. This means **subagent text chunks are NOT visible** in the stream:

```ts
// Default configuration (implicit)
supervisorConfig: {
  fullStreamEventForwarding: {
    types: ['tool-call', 'tool-result'], // ⚠️ text-delta NOT included
  }
}
```

**To See Subagent Text Output:**

When a subagent bails and produces text output, you must explicitly include `text-delta` in the forwarded event types:

```ts
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [workoutBuilder],
  supervisorConfig: {
    fullStreamEventForwarding: {
      types: ["tool-call", "tool-result", "text-delta"], // ✅ Include text-delta
    },
  },
  hooks: {
    onHandoffComplete: ({ agent, bail }) => {
      if (agent.name === "Workout Builder") {
        bail(); // Subagent text will be visible in stream
      }
    },
  },
});
```

**Consuming Bailed Subagent Output:**

When using `toUIMessageStream()`, subagent text appears as `data-subagent-stream` events that are automatically grouped and rendered in the UI:

```ts
const result = await supervisor.streamText("Create workout");

// With text-delta forwarding enabled:
// Subagent text chunks are accumulated and displayed as a collapsible box
// with the subagent's name (e.g., "Workout Builder")

for await (const message of result.toUIMessageStream()) {
  // Message parts include grouped subagent output
  // Rendered automatically in observability UI
}
```

**Event Types Reference:**

| Event Type    | Description                      | Default         |
| ------------- | -------------------------------- | --------------- |
| `tool-call`   | Tool invocations                 | ✅ Included     |
| `tool-result` | Tool results                     | ✅ Included     |
| `text-delta`  | Text chunk generation            | ❌ NOT included |
| `reasoning`   | Model reasoning (if available)   | ❌ NOT included |
| `source`      | Retrieved sources (if available) | ❌ NOT included |
| `error`       | Error events                     | ❌ NOT included |
| `finish`      | Stream completion                | ❌ NOT included |

### Observability

Bailed subagents are tracked in observability with visual indicators:

**Logging:**

```
[INFO] Supervisor bailed after handoff
  supervisor: Workout Supervisor
  subagent: Workout Builder
  transformed: false
  resultLength: 450
```

**OpenTelemetry Attributes:**

Both supervisor and subagent spans get attributes:

```ts
// Supervisor span attributes
{
  "bailed": true,
  "bail.subagent": "Workout Builder",
  "bail.transformed": false
}

// Subagent span attributes
{
  "bailed": true,
  "bail.supervisor": "Workout Supervisor",
  "bail.transformed": false
}
```

### Use Cases

Perfect for scenarios where specialized subagents generate final outputs:

1. **JSON/Structured data generators** - Workout builders, report generators, data exporters
2. **Large content producers** - Document creators, extensive data analysis
3. **Token optimization** - Skip processing for expensive results
4. **Business logic** - Conditional routing based on result characteristics

### Best Practices

**✅ DO:**

- Bail when subagent produces final, ready-to-use output
- Use conditional logic to bail selectively
- Log bail decisions for debugging
- Transform results before bailing when needed

**❌ DON'T:**

- Bail on every subagent (defeats supervisor purpose)
- Bail when supervisor needs to process/combine results
- Forget to handle non-bailed flow (default case)

````

## Step Control

Control workflow steps with `maxSteps`:

```ts
const supervisor = new Agent({
  subAgents: [writer, editor],
  maxSteps: 20, // Inherited by all sub-agents
});

// Override per request
const result = await supervisor.generateText("Task", { maxSteps: 10 });
````

**Default:** `10 × number_of_sub-agents` (prevents infinite loops)

## Observability

Sub-agent operations are automatically linked to their supervisor for traceability in monitoring tools.

## Advanced Configuration

Use different execution methods for sub-agents:

```ts
import { createSubagent } from "@voltagent/core";
import { z } from "zod";

const AnalysisSchema = z.object({
  insights: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

const supervisor = new Agent({
  subAgents: [
    writer, // Default streamText
    createSubagent({
      agent: analyzer,
      method: "generateObject",
      schema: AnalysisSchema,
      options: { temperature: 0.1 },
    }),
  ],
});
```

**Available methods:**

- `streamText` (default) - Real-time text streaming
- `generateText` - Text generation
- `generateObject` - Structured data with Zod schema
- `streamObject` - Streaming structured data

## Dynamic Sub-agents

Add sub-agents after initialization:

```ts
supervisor.addSubAgent(newAgent);
```

## Remove Sub-agents

```ts
supervisor.removeSubAgent(agentId);
```

## Troubleshooting

**Sub-agent not being called?**

- Check agent names match exactly
- Make supervisor instructions explicit about when to delegate
- Use `onHandoff` hook to debug delegation flow
