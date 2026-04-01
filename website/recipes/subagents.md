---
id: subagents
title: Subagents
slug: subagents
description: Create multi-agent systems with supervisor and subagent patterns.
---

# Subagents

Build multi-agent systems where a supervisor agent coordinates specialized subagents.

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Create specialized subagents
const contentCreator = new Agent({
  name: "ContentCreator",
  purpose: "Drafts short content",
  instructions: "Creates text content on requested topics",
  model: openai("gpt-4o-mini"),
});

const formatter = new Agent({
  name: "Formatter",
  purpose: "Formats and styles text",
  instructions: "Cleans and formats content",
  model: openai("gpt-4o-mini"),
  tools: [uppercaseTool],
});

// Create supervisor that coordinates subagents
const supervisor = new Agent({
  name: "Supervisor",
  instructions: "Coordinates between content creation and formatting",
  model: openai("gpt-4o-mini"),
  subAgents: [contentCreator, formatter],
  supervisorConfig: {
    fullStreamEventForwarding: {
      types: ["tool-call", "tool-result", "text-delta"],
    },
  },
});

new VoltAgent({
  agents: { supervisor, contentCreator, formatter },
  server: honoServer({ port: 3141 }),
});
```

## How It Works

1. User sends request to supervisor
2. Supervisor decides which subagent to use
3. Subagent executes and returns result
4. Supervisor may delegate to another subagent
5. Final response returned to user

## Subagent Properties

```typescript
new Agent({
  name: "Specialist",
  purpose: "Brief description for supervisor", // Helps supervisor decide when to use
  instructions: "Detailed instructions...",
  model: openai("gpt-4o-mini"),
});
```

## Full Example

See the complete example: [with-subagents on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-subagents)
