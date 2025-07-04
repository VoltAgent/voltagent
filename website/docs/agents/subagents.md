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

When you initialize an agent with subagents, several things happen automatically:

1.  **Supervisor Prompt Enhancement**: The supervisor agent's system prompt is automatically modified (`generateSupervisorSystemMessage`) to include instructions on how to manage its subagents effectively. It lists the available subagents and their purpose and provides guidelines for delegation, communication, and response aggregation.
2.  **`delegate_task` Tool**: A `delegate_task` tool is automatically added to the supervisor agent's available tools. This tool allows the supervisor LLM to decide when and how to delegate tasks.
3.  **Agent Registry**: The parent-child relationship between the supervisor and its subagents is registered in the `AgentRegistry`, enabling discoverability and management within the broader system.

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

## Complete Working Example

Here's a full example you can copy and run to see subagents in action:

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create specialized agents
const storyAgent = new Agent({
  name: "Story Agent",
  purpose: "A story writer agent that creates original, engaging short stories.",
  instructions: "You are a creative story writer. Create original, engaging short stories.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const translatorAgent = new Agent({
  name: "Translator Agent",
  purpose: "A translator agent that translates text accurately.",
  instructions: "You are a skilled translator. Translate text accurately.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Create the supervisor agent
const supervisorAgent = new Agent({
  name: "Supervisor Agent",
  instructions:
    "You manage a workflow between specialized agents. When asked for a story, " +
    "use the Story Agent to create it. Then use the Translator Agent to translate the story. " +
    "Present both versions to the user.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [storyAgent, translatorAgent],
});

// Use the supervisor agent to handle a user request
const result = await supervisorAgent.streamText(
  "Write a short story about a robot learning to paint and translate it to German."
);

// Process the streamed response
for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}

/* Expected Output:
1. Supervisor analyzes the request
2. Supervisor calls delegate_task tool → Story Agent
3. Story Agent creates the story
4. Supervisor calls delegate_task tool → Translator Agent  
5. Translator Agent translates to German
6. Supervisor presents both versions

Final response includes both the original story and German translation.
*/
```

## Combining with Hooks

You can use [hooks](./hooks.md), specifically `onHandoff`, to inject custom logic when a task is delegated from a supervisor to a subagent via the `delegate_task` tool.

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create a supervisor agent with hooks for monitoring subagent interactions
const supervisorAgent = new Agent({
  name: "Supervisor Agent",
  instructions: "You manage a workflow between specialized agents.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [storyAgent, translatorAgent],
  hooks: {
    onHandoff: async (targetAgent, sourceAgent) => {
      // 'sourceAgent' is the supervisor, 'targetAgent' is the subagent receiving the task
      console.log(`Task being handed off from ${sourceAgent.name} to ${targetAgent.name}`);
      // --- Use Cases ---
      // 1. Logging: Log detailed information about the handoff for debugging/monitoring.
      // 2. Validation: Check if the handoff is appropriate based on agent capabilities or context.
      // 3. Context Modification: Potentially modify the context being passed (though direct modification isn't standard, you could trigger external updates).
      // 4. Notification: Send notifications about task delegation.
    },
  },
});
```

The `onHandoff` hook is triggered within the `handoffTask` method just before the target agent starts processing the delegated task.

## Context Sharing Between Agents

SubAgents automatically inherit the supervisor's operation context, including `userContext` and conversation history. This enables seamless data sharing across the agent hierarchy.

### Automatic Context Inheritance

When a supervisor delegates a task, the subagent receives:

- **userContext**: All custom data from the supervisor's operation
- **conversationSteps**: Shared conversation history (steps are added to the same array)
- **parentAgentId**: Reference to the supervisor for traceability

```ts
// Supervisor sets context
const response = await supervisorAgent.streamText("Translate this story", {
  userContext: new Map([
    ["projectId", "proj-123"],
    ["language", "Spanish"],
    ["priority", "high"],
  ]),
});

// SubAgent automatically receives this context and can access it in hooks/tools
const translatorAgent = new Agent({
  name: "Translator Agent",
  hooks: createHooks({
    onStart: ({ context }) => {
      // Access supervisor's context
      const projectId = context.userContext.get("projectId");
      const language = context.userContext.get("language");
      console.log(`Translating for project ${projectId} to ${language}`);
    },
  }),
  // ... other config
});
```

### Shared Conversation History

SubAgents contribute to the same conversation history as their supervisor, making the entire workflow appear as one cohesive operation:

```ts
const supervisorAgent = new Agent({
  name: "Supervisor",
  subAgents: [translatorAgent, reviewerAgent],
  hooks: createHooks({
    onEnd: ({ context }) => {
      // Access all steps from supervisor AND subagents
      const allSteps = context.conversationSteps;
      console.log(`Total workflow steps: ${allSteps.length}`);

      // Steps include:
      // - Supervisor's tool calls (delegate_task)
      // - SubAgent's processing steps
      // - All tool executions across agents
      // This creates a complete audit trail
    },
  }),
  instructions: "Coordinate translation and review workflow",
});

// When you call the supervisor, you get a unified history
const response = await supervisorAgent.streamText("Translate and review this text");
// response.userContext contains the complete workflow state
```

For detailed examples and patterns, see the [Operation Context guide](./context.md).

## Step Control with maxSteps

When working with subagents, the `maxSteps` parameter controls how many iteration steps the entire workflow can take. This is particularly important for complex workflows involving multiple agents.

### maxSteps Inheritance

The `maxSteps` value is automatically inherited by all subagents in the workflow:

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const researchAgent = new Agent({
  name: "Research Agent",
  instructions: "Conduct thorough research on topics",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  // No maxSteps defined - will inherit from supervisor
});

const writerAgent = new Agent({
  name: "Writer Agent",
  instructions: "Write engaging content based on research",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  // No maxSteps defined - will inherit from supervisor
});

const supervisor = new Agent({
  name: "Content Supervisor",
  instructions: "Coordinate research and writing workflow",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [researchAgent, writerAgent],
  maxSteps: 15, // All subagents will inherit this limit
});

// Option 1: Use supervisor's maxSteps (15)
const response1 = await supervisor.generateText("Research and write about AI trends");

// Option 2: Override maxSteps for this specific operation
const response2 = await supervisor.generateText("Research and write about AI trends", {
  maxSteps: 25, // Override: supervisor and all subagents use max 25 steps
});
```

### Default maxSteps Calculation

If no `maxSteps` is specified, the system calculates a default based on complexity:

```ts
// Agent with subagents - automatic calculation
const supervisor = new Agent({
  name: "Complex Workflow",
  subAgents: [agent1, agent2, agent3], // 3 subagents
  // No maxSteps specified - automatically calculated as 10 × 3 = 30 steps
});

// Agent without subagents - default calculation
const simpleAgent = new Agent({
  name: "Simple Agent",
  // No subagents, no maxSteps - defaults to 10 steps
});
```

### Preventing Runaway Workflows

Complex multi-agent workflows can potentially run indefinitely if agents keep delegating tasks. The `maxSteps` parameter prevents this:

```ts
// Example of a protected workflow
const supervisor = new Agent({
  name: "Protected Supervisor",
  instructions: "Coordinate complex tasks efficiently",
  subAgents: [researchAgent, writerAgent, reviewerAgent],
  maxSteps: 50, // Prevents runaway execution in complex workflows
});

// This workflow will automatically stop at 50 steps, preventing infinite loops
const result = await supervisor.generateText("Create a comprehensive report");
```

## Observability and Event Tracking

To maintain traceability in complex workflows involving multiple agents, the system automatically propagates context during task handoffs:

- When the supervisor's `delegate_task` tool calls a subagent (via `handoffTask`), it includes the supervisor's `agentId` as `parentAgentId` and the supervisor's current `historyEntryId` as `parentHistoryEntryId` in the subagent's operation context.
- This means any events (like tool calls, LLM steps, errors) generated by the subagent while processing the delegated task will be associated not only with the subagent's own history entry but also linked back to the original history entry in the supervisor agent.
- This allows monitoring and debugging tools to reconstruct the entire flow of execution across multiple agents for a single user request.

## Adding Subagents After Initialization

You can also add subagents after creating the supervisor agent:

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create a new specialized agent
const factCheckerAgent = new Agent({
  name: "Fact Checker Agent",
  purpose: "A fact checker agent that verifies facts and provides accurate information.",
  instructions: "You verify facts and provide accurate information.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Add the agent as a subagent to the supervisor
// This also registers the relationship in AgentRegistry
supervisorAgent.addSubAgent(factCheckerAgent);
```

## Removing Subagents

```ts
// Remove a subagent by its ID
// This also unregisters the relationship in AgentRegistry
supervisorAgent.removeSubAgent(factCheckerAgent.id);
```

## Troubleshooting

### SubAgent Not Being Called?

1. **Check Agent Names**: The `delegate_task` tool uses agent names, not IDs:

   ```ts
   // ✅ Correct
   const subAgent = new Agent({ name: "Story Agent", ... });

   // ❌ Wrong - LLM will try to call "story-agent-id"
   const subAgent = new Agent({ name: "story-agent-id", ... });
   ```

2. **Improve Supervisor Instructions**: Be explicit about when to delegate:

   ```ts
   const supervisor = new Agent({
     instructions: `
       You coordinate specialized agents:
       - For creative writing: use Story Agent
       - For translation: use Translator Agent
       
       Always delegate tasks to the appropriate specialist.
     `,
     // ...
   });
   ```

3. **Debug Context Passing**: Check if context is being inherited:
   ```ts
   const subAgent = new Agent({
     hooks: createHooks({
       onStart: ({ context }) => {
         console.log("SubAgent context:", Object.fromEntries(context.userContext));
       },
     }),
     // ...
   });
   ```

### Monitor the Workflow

Enable logging to see the delegation flow:

```ts
const supervisor = new Agent({
  hooks: createHooks({
    onToolStart: ({ tool }) => {
      if (tool.name === "delegate_task") {
        console.log("🔄 Delegating task to subagent");
      }
    },
  }),
  // ...
});
```
