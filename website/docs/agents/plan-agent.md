---
title: PlanAgent
slug: /agents/plan-agent
---

# PlanAgent

PlanAgent is a higher-level agent that adds built-in planning, task delegation, filesystem tools, and summarization on top of the standard `Agent`. Use it when you want multi-step execution with explicit plans and tighter control over context.

## Default Agent (baseline)

Start with a normal `Agent` if you only need straightforward responses.

```ts
import { Agent } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "Assistant",
  instructions: "Answer questions clearly and concisely.",
  model: openai("gpt-4o"),
});

const result = await agent.generateText("What is VoltAgent?");
console.log(result.text);
```

## PlanAgent quickstart

PlanAgent works like `Agent`, but adds planning, filesystem, and subagent tooling by default.

```ts
import { PlanAgent, createTool } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

const internetSearch = createTool({
  name: "internet_search",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("Search query"),
    maxResults: z.number().optional().default(5),
  }),
  execute: async ({ query, maxResults }) => {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
      },
      body: JSON.stringify({ query, maxResults }),
    });
    return response.json();
  },
});

const agent = new PlanAgent({
  name: "Researcher",
  systemPrompt: "You are an expert researcher. Produce clear, sourced answers.",
  model: openai("gpt-4o"),
  tools: [internetSearch],
});

const result = await agent.generateText("What is VoltAgent?");
console.log(result.text);
```

## Dynamic systemPrompt

`systemPrompt` can be a function that resolves per request. It receives `{ context, prompts }` and can return a string or a VoltOps prompt payload.

```ts
const agent = new PlanAgent({
  name: "DynamicPlanner",
  model: openai("gpt-4o"),
  systemPrompt: async ({ context }) => {
    const tenant = context.get("tenant") ?? "default";
    return `Tenant: ${tenant}. Keep answers concise.`;
  },
});

const context = new Map<string | symbol, unknown>();
context.set("tenant", "acme");

const result = await agent.generateText("Summarize the roadmap", { context });
console.log(result.text);
```

If you return a chat prompt:

```ts
const agent = new PlanAgent({
  name: "DynamicChatPlanner",
  model: openai("gpt-4o"),
  systemPrompt: async () => ({
    type: "chat",
    messages: [{ role: "system", content: "You are a precise planner." }],
  }),
});
```

PlanAgent still appends its base prompt and any extension prompts.

## Built-in capabilities

### Planning with write_todos

PlanAgent injects a planning prompt and a `write_todos` tool. The agent is expected to create a plan before using tools or producing long answers.

```ts
const agent = new PlanAgent({
  name: "Planner",
  systemPrompt: "Plan carefully before acting.",
  model: openai("gpt-4o"),
  planning: {
    systemPrompt: "Always plan any multi-step task. Keep 4-8 concise steps and update as you go.",
  },
});
```

Disable planning if you want a lighter agent:

```ts
const agent = new PlanAgent({
  name: "NoPlan",
  systemPrompt: "Answer quickly.",
  model: openai("gpt-4o"),
  planning: false,
});
```

### State and persistence

PlanAgent stores its todo list, filesystem state, and summaries per conversation. When a conversation continues, it injects the latest state back into the system prompt so the model can keep working from the same plan and files.

### Filesystem tools

PlanAgent provides `ls`, `read_file`, `write_file`, `edit_file`, `glob`, and `grep`. The default backend is an in-memory filesystem, but you can use a real filesystem backend.

```ts
import { NodeFilesystemBackend } from "@voltagent/core";

const agent = new PlanAgent({
  name: "FileAgent",
  systemPrompt: "Use the filesystem to store and retrieve context.",
  model: openai("gpt-4o"),
  filesystem: {
    backend: new NodeFilesystemBackend({
      rootDir: process.cwd(),
      virtualMode: true,
    }),
  },
});
```

### Task tool and subagents

PlanAgent adds a `task` tool that can delegate work to subagents for isolated, multi-step tasks.

```ts
const agent = new PlanAgent({
  name: "Supervisor",
  systemPrompt: "Delegate deep research tasks to subagents.",
  model: openai("gpt-4o"),
  subagents: [
    {
      name: "research-analyst",
      description: "Deep research and synthesis",
      systemPrompt: "Research thoroughly and return a concise report.",
      tools: [internetSearch],
    },
  ],
});
```

You can also tune the task tool behavior:

```ts
const agent = new PlanAgent({
  name: "Supervisor",
  systemPrompt: "Delegate when helpful.",
  model: openai("gpt-4o"),
  task: {
    taskDescription: "Use subagents for complex, independent work.",
    maxSteps: 6,
  },
});
```

PlanAgent also adds a default `general-purpose` subagent unless you disable it:

```ts
const agent = new PlanAgent({
  name: "Supervisor",
  systemPrompt: "Delegate when helpful.",
  model: openai("gpt-4o"),
  generalPurposeAgent: false,
});
```

### Summarization

PlanAgent can automatically summarize older conversation history and keep recent messages in context.

```ts
const agent = new PlanAgent({
  name: "Summarizer",
  systemPrompt: "Keep context tight.",
  model: openai("gpt-4o"),
  summarization: {
    triggerTokens: 120_000,
    keepMessages: 6,
    maxOutputTokens: 600,
  },
});
```

Disable it when you want full context preserved:

```ts
const agent = new PlanAgent({
  name: "NoSummary",
  systemPrompt: "Keep full context.",
  model: openai("gpt-4o"),
  summarization: false,
});
```

### Tool result eviction

Large tool outputs can be offloaded to the filesystem to keep the model context small.

```ts
const agent = new PlanAgent({
  name: "Evictor",
  systemPrompt: "Store large tool outputs on the filesystem.",
  model: openai("gpt-4o"),
  toolResultEviction: {
    enabled: true,
    tokenLimit: 20000,
  },
});
```

### Extensions

Use `extensions` to add new toolkits, prompts, or hooks without forking PlanAgent.

```ts
import type { PlanAgentExtension } from "@voltagent/core";

const debugExtension: PlanAgentExtension = {
  name: "debug",
  apply: () => ({
    systemPrompt: "Log key decisions to the user.",
  }),
};

const agent = new PlanAgent({
  name: "Extended",
  systemPrompt: "Be helpful.",
  model: openai("gpt-4o"),
  extensions: [debugExtension],
});
```

## Configuration reference (high-level)

- `systemPrompt`: static string or dynamic function for per-request prompts
- `planning`: configure or disable planning (`write_todos`)
- `filesystem`: configure backend and tool prompts
- `task`: configure task tool prompts and limits
- `subagents`: custom subagent definitions
- `generalPurposeAgent`: add/remove the default general-purpose subagent
- `summarization`: configure summarization triggers and model
- `toolResultEviction`: offload large tool results to filesystem
- `extensions`: attach custom tooling or hooks

Use PlanAgent when your workloads require explicit plans, context offloading, or structured delegation to subagents.
