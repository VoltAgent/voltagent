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
  instructions: "You are a creative story writer. Create original, engaging short stories.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Create a specialized agent for translation
const translatorAgent = new Agent({
  name: "Translator Agent",
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

1.  **Supervisor Prompt Enhancement**: The supervisor agent's system prompt is automatically modified (`generateSupervisorSystemMessage`) to include instructions on how to manage its subagents effectively. It lists the available subagents and their descriptions and provides guidelines for delegation, communication, and response aggregation.
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

## Example

Here's a complete example of a workflow that uses multiple specialized agents:

```ts
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create specialized agents
const storyAgent = new Agent({
  name: "Story Agent",
  instructions: "You are a creative story writer. Create original, engaging short stories.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const translatorAgent = new Agent({
  name: "Translator Agent",
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
