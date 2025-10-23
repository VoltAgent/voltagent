# Using Agents as Tools Example

This example demonstrates how to use `agent.toTool()` in VoltAgent, where one agent can use other specialized agents as tools.

## Overview

This pattern is useful when the **LLM should dynamically decide** which agents to call based on the request.

:::tip When to Use This Pattern

- **Use `agent.toTool()`** when the LLM should decide which agents to call
- **Use Workflows** for deterministic, code-defined pipelines
- **Use Sub-agents** for fixed sets of collaborating agents
  :::

## How it Works

The example creates three agents:

1. **Writer Agent** - Creates blog post content
2. **Editor Agent** - Edits and improves content
3. **Publisher Agent** - Coordinator that uses both as tools

```typescript
const publisher = new Agent({
  tools: [
    writerAgent.toTool(), // Convert to tool
    editorAgent.toTool(),
  ],
});
```

The LLM decides when to call the writer and editor based on the task.

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env` file with your OpenAI API key:

```bash
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

## Running the Example

```bash
# Run with auto-reload during development
pnpm dev

# Or run once
pnpm start
```

## What Happens

When you run the example:

1. Publisher receives a blog post topic
2. LLM decides to call Writer agent tool first
3. LLM then calls Editor agent tool to polish content
4. Returns the final, edited blog post

The LLM autonomously coordinates the workflow!

## API Reference

### `agent.toTool(options?)`

Converts an agent to a tool:

```typescript
agent.toTool({
  name: "custom_name", // Optional: defaults to ${agentId}_tool
  description: "...", // Optional: defaults to agent's purpose
  parametersSchema: z.object(), // Optional: defaults to { prompt: string }
});
```

## When to Use This Pattern

**✅ Use `agent.toTool()` when:**

- LLM should decide which agents to call
- Different agents needed for different inputs
- Customer support routing, dynamic task delegation

**❌ Don't use for static pipelines:**

- Use [Workflows](https://docs.voltagent.ai/workflows) instead
- Example: Always Research → Write → Edit → Publish

## Learn More

- [Agent Documentation](https://docs.voltagent.ai/agents)
- [Workflows](https://docs.voltagent.ai/workflows) - For deterministic pipelines
- [Sub-agents](https://docs.voltagent.ai/agents/sub-agents) - For fixed agent teams
