---
"@voltagent/core": patch
---

feat: implement configurable maxSteps parameter with parent-child agent inheritance

**Agents now support configurable maxSteps parameter at the API level, allowing fine-grained control over computational resources. Parent agents automatically pass their effective maxSteps to subagents, ensuring consistent resource management across the agent hierarchy.**

## 🎯 What's New

**🚀 Configurable MaxSteps System**

- **API-Level Configuration**: Set maxSteps dynamically for any agent call
- **Agent-Level Defaults**: Configure default maxSteps when creating agents
- **Automatic Inheritance**: SubAgents automatically inherit parent's effective maxSteps
- **Configurable Supervisor**: Enhanced supervisor system message generation with agent memory

## 📋 Usage Examples

**API-Level MaxSteps Configuration:**

```typescript
import { Agent, VoltAgent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create agent with default maxSteps
const agent = new Agent({
  name: "AssistantAgent",
  instructions: "Help users with their questions",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  maxSteps: 10, // Default maxSteps for this agent
});

// Usage examples:

// 1. Use agent's default maxSteps (10)
const result1 = await agent.generateText("Simple question");

// 2. Override with API-level maxSteps
const result2 = await agent.generateText("Complex question", {
  maxSteps: 25, // Override agent's default (10) with API-level (25)
});

// 3. Stream with custom maxSteps
const stream = await agent.streamText("Long conversation", {
  maxSteps: 50, // Allow more steps for complex interactions
});

// 4. Generate object with specific maxSteps
const objectResult = await agent.generateObject("Create structure", schema, {
  maxSteps: 5, // Limit steps for simple object generation
});
```

**Parent-Child Agent Inheritance:**

```typescript
// Create specialized subagents
const contentCreator = new Agent({
  name: "ContentCreator",
  instructions: "Create engaging content",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

const formatter = new Agent({
  name: "Formatter",
  instructions: "Format and style content",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Create supervisor with subagents
const supervisor = new Agent({
  name: "Supervisor",
  instructions: "Coordinate content creation and formatting",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [contentCreator, formatter],
  maxSteps: 15, // Agent limit
});

// Parent-child inheritance examples:

// 1. Use supervisor's default maxSteps
const result1 = await supervisor.generateText("Create a blog post");
// Supervisor uses: maxSteps: 15
// SubAgents inherit: maxSteps: 15

// 2. Override with API-level maxSteps
const result2 = await supervisor.generateText("Create a blog post", {
  maxSteps: 8, // API-level override
});
// Supervisor uses: maxSteps: 8
// SubAgents inherit: maxSteps: 8

// 3. Direct subagent calls use their own defaults
const directResult = await contentCreator.generateText("Create content");
// Uses contentCreator's own maxSteps or default calculation
```

**REST API Usage:**

```bash
# with generateText
curl -X POST http://localhost:3141/agents/my-agent-id/generate \
     -H "Content-Type: application/json" \
     -d '{
       "input": "Explain quantum physics",
       "options": {
         "maxSteps": 10,
       }
     }'

# with streamText
curl -N -X POST http://localhost:3141/agents/supervisor-agent-id/stream \
     -H "Content-Type: application/json" \
     -d '{
       "input": "Coordinate research and writing workflow",
       "options": {
         "maxSteps": 15,
       }
     }'
```

This enhancement provides fine-grained control over agent computational resources while maintaining backward compatibility with existing agent configurations.
