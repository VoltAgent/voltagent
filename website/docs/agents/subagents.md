---
title: Sub-agents
slug: /agents/sub-agents
---

# Subagents

Subagents are specialized agents that work under a supervisor agent to handle specific tasks. This architecture enables the creation of complex agent workflows where each subagent focuses on its area of expertise, coordinated by a supervisor.

## Why Use Subagents?

- **Specialization**: Create agents that excel at specific tasks (e.g., coding, translation, data analysis).
- **Workflow Orchestration**: Build complex, multi-step workflows by having a supervisor delegate tasks to the appropriate specialized agents.
- **Scalability**: Break down complex problems into smaller, manageable parts, making the overall system easier to develop and maintain.
- **Improved Responses**: Achieve better results by leveraging the focused knowledge and capabilities of specialized agents for specific parts of a user request.
- **Modularity**: Easily swap or add specialized agents without disrupting the entire system.

## Creating and Using Subagents

### Creating Individual Agents

First, create the specialized agents that will serve as subagents:

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create a specialized agent for writing stories
const storyAgent = new Agent({
  name: "Story Agent",
  purpose: "A story writer agent that creates original, engaging short stories.",
  instructions: "You are a creative story writer. Create original, engaging short stories.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Create a specialized agent for translation
const translatorAgent = new Agent({
  name: "Translator Agent",
  purpose: "A translator agent that translates text accurately.",
  instructions: "You are a skilled translator. Translate text accurately.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});
```

### Creating a Supervisor Agent

Create a supervisor agent that will coordinate between subagents. Simply pass the specialized agents in the `subAgents` array during initialization:

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create a supervisor agent with specialized agents as subagents
const supervisorAgent = new Agent({
  name: "Supervisor Agent",
  instructions: "You manage a workflow between specialized agents.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  // Specify subagents during initialization
  subAgents: [storyAgent, translatorAgent],
});
```

:::tip Advanced SubAgent Configuration
The basic example above uses the default `streamText` method for subagents. For more control over how subagents execute tasks, you can specify different methods like `generateText`, `generateObject`, or `streamObject` with custom schemas and options.

**Learn more:** [Advanced SubAgent Configuration](#advanced-subagent-configuration)
:::

## Customizing Supervisor Behavior

By default, supervisor agents use an automatically generated system message that includes guidelines for managing subagents. However, you can customize this behavior using the `supervisorConfig` option for more control over how your supervisor agent behaves.

:::info Default System Message
To see the current default supervisor system message template and understand how it works, check the [generateSupervisorSystemMessage implementation](https://github.com/VoltAgent/voltagent/blob/main/packages/core/src/agent/subagent/index.ts#L131) on GitHub.
:::

:::note Type Safety
The `supervisorConfig` option is only available when `subAgents` are provided. TypeScript will prevent you from using `supervisorConfig` on agents without subagents.
:::

### Basic Supervisor Configuration

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const supervisorAgent = new Agent({
  name: "Content Supervisor",
  instructions: "Coordinate content creation workflow",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [writerAgent, editorAgent],

  // ✅ Basic supervisor customization
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

Control which events from subagents are forwarded to the parent stream. By default, only `tool-call` and `tool-result` events are forwarded to keep the stream focused on meaningful actions.

```ts
const supervisorAgent = new Agent({
  name: "Content Supervisor",
  instructions: "Coordinate content creation workflow",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [writerAgent, editorAgent],

  supervisorConfig: {
    // Configure which subagent events to forward
    fullStreamEventForwarding: {
      // Default: ['tool-call', 'tool-result']
      // Enable all event types for complete visibility
      types: ["tool-call", "tool-result", "text-delta", "reasoning", "source", "error", "finish"],

      // Add subagent name as prefix to tool names (default: true)
      // When true: "WriterAgent: search_tool"
      // When false: "search_tool"
      addSubAgentPrefix: true,
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

// Text + Tools - See what subagents are saying and doing
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result', 'text-delta'],
}

// Full visibility - All events including reasoning
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result', 'text-delta', 'reasoning', 'source', 'error', 'finish'],
}

// Clean tool names - No agent prefix
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result'],
  addSubAgentPrefix: false,
}
```

This configuration helps you balance between stream performance and information richness, allowing you to see exactly what you need from subagent interactions.

#### Using with fullStream

When using `fullStream` to get detailed streaming events, the configuration controls what you receive from subagents:

```ts
// Stream with full event details
const result = await supervisorAgent.streamText("Create and edit content", {
  fullStream: true, // Enable full streaming to get all event types
});

// Process different event types
for await (const event of result.fullStream) {
  switch (event.type) {
    case "tool-call":
      console.log(`Tool called: ${event.data.toolName}`);
      break;
    case "tool-result":
      console.log(`Tool result: ${event.data.result}`);
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

#### Filtering Subagent Events

You can identify which events come from subagents by checking for `subAgentId` and `subAgentName` properties:

```ts
const result = await supervisorAgent.streamText("Create and edit content", {
  fullStream: true,
});

for await (const event of result.fullStream) {
  // Check if this event is from a subagent
  if (event.subAgentId && event.subAgentName) {
    console.log(`Event from subagent ${event.subAgentName}:`);
    console.log(`  Type: ${event.type}`);
    console.log(`  Data:`, event.data);

    // Filter by specific subagent
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

- Distinguish between supervisor and subagent events
- Filter events by specific subagent
- Apply different handling logic based on the event source

### Complete System Message Override

For complete control over the supervisor's behavior, you can provide a custom `systemMessage` that entirely replaces the default template:

```ts
const supervisorAgent = new Agent({
  name: "Custom Supervisor",
  instructions: "This will be ignored when systemMessage is provided",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [writerAgent, editorAgent],

  // ✅ Complete system message override
  supervisorConfig: {
    systemMessage: `
You are a professional content manager named "ContentBot".

Your specialist team:
- Writer: Creates original content
- Editor: Reviews and improves content

Your workflow:
1. Analyze user requests carefully
2. Use delegate_task to assign work to appropriate specialists
3. Coordinate between specialists as needed
4. Provide comprehensive final responses
5. Always maintain a professional but friendly tone

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
    addSubAgentPrefix: false // Remove agent name prefix from tools
  }
}
```

## How Subagents Work

The core mechanism involves the supervisor agent delegating tasks to its subagents using the automatically provided `delegate_task` tool.

1.  A user sends a request to the supervisor agent.
2.  The supervisor agent's LLM analyzes the request and its enhanced system prompt (which lists available subagents).
3.  Based on the task, the supervisor decides which subagent(s) are best suited to handle specific parts of the request.
4.  The supervisor uses the `delegate_task` tool to hand off the task(s).

### The `delegate_task` Tool

This tool is the primary interface for delegation.

- **Name**: `delegate_task`
- **Description**: "Delegate a task to one or more specialized agents"
- **Parameters**:
  - `task` (string, required): The specific task description to be delegated.
  - `targetAgents` (array of strings, required): A list of subagent **names** to delegate the task to. The supervisor can delegate to multiple agents simultaneously if appropriate.
  - `context` (object, optional): Any additional context needed by the subagent(s) to perform the task.
- **Execution**:
  - The tool finds the corresponding subagent instances based on the provided names.
  - It calls the `handoffTask` (or `handoffToMultiple`) method internally, which sends the task description and context to the target subagent(s).
  - Crucially, it passes the supervisor's agent ID (`parentAgentId`) and the current history entry ID (`parentHistoryEntryId`) to the subagent's execution context. This is key for [Observability](#observability-and-event-tracking).
- **Returns**: An array of objects, where each object contains the result from a delegated agent:
  ```ts
  [
    {
      agentName: string; // Name of the subagent that executed the task
      response: string; // The text result returned by the subagent
      conversationId: string; // The conversation ID used for the handoff
    },
    // ... potentially more results if multiple agents were targeted
  ]
  ```

5.  Subagents process their delegated tasks independently. They can use their own tools or even delegate further if they are also supervisors.
6.  Each subagent returns its result to the `delegate_task` tool execution context within the supervisor.
7.  The supervisor receives the results from the `delegate_task` tool.
8.  Based on its instructions and the received results, the supervisor synthesizes the final response and presents it to the user.

## Complete Example

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create specialists
const writer = new Agent({
  name: "Writer",
  instructions: "Write creative stories",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const translator = new Agent({
  name: "Translator",
  instructions: "Translate text accurately",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Create supervisor
const supervisor = new Agent({
  name: "Supervisor",
  instructions: "Coordinate story writing and translation",
  llm: new VercelAIProvider(),
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

Monitor task delegation with the `onHandoff` hook:

```ts
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [writer, translator],
  hooks: {
    onHandoff: ({ agent, source }) => {
      console.log(`${source.name} → ${agent.name}`);
    },
  },
});
```

## Context Sharing

SubAgents automatically inherit the supervisor's context:

```ts
// Supervisor passes context
const response = await supervisor.streamText("Task", {
  userContext: new Map([["projectId", "123"]]),
});

// SubAgent receives it automatically
const subAgent = new Agent({
  hooks: {
    onStart: ({ context }) => {
      const projectId = context.userContext.get("projectId"); // "123"
    },
  },
});
```

## Step Control

Control workflow steps with `maxSteps`:

```ts
const supervisor = new Agent({
  subAgents: [writer, editor],
  maxSteps: 20, // Inherited by all subagents
});

// Override per request
const result = await supervisor.generateText("Task", { maxSteps: 10 });
```

**Default:** `10 × number_of_subagents` (prevents infinite loops)

## Observability

SubAgent operations are automatically linked to their supervisor for complete traceability in monitoring tools.

## Advanced Configuration

Use different execution methods for specialized subagents:

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
- `generateText` - Simple text generation
- `generateObject` - Structured data with Zod schema
- `streamObject` - Streaming structured data

## Dynamic SubAgents

Add subagents after initialization:

```ts
supervisor.addSubAgent(newAgent);
```

## Remove SubAgents

```ts
supervisor.removeSubAgent(agentId);
```

## Troubleshooting

**SubAgent not being called?**

- Check agent names match exactly
- Make supervisor instructions explicit about when to delegate
- Use `onHandoff` hook to debug delegation flow
