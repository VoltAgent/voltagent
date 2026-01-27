---
"@voltagent/core": major
---

feat: replace tool routers with `searchTools` + `callTool` tool routing

Tool routing now exposes two system tools instead of router tools. The model must search first, then call the selected tool with schema-compliant args. `createToolRouter` and `toolRouting.routers` are removed.

Migration guide

1. Remove router tools and `toolRouting.routers`

Before:

```ts
import { Agent, createToolRouter } from "@voltagent/core";

const router = createToolRouter({
  name: "tool_router",
  description: "Route requests to tools",
  embedding: "openai/text-embedding-3-small",
});

const agent = new Agent({
  name: "Tool Routing Agent",
  instructions: "Use tool_router when you need a tool.",
  tools: [router],
  toolRouting: {
    routers: [router],
    pool: [
      /* tools */
    ],
    topK: 2,
  },
});
```

After:

```ts
import { Agent } from "@voltagent/core";

const agent = new Agent({
  name: "Tool Routing Agent",
  instructions:
    "When you need a tool, call searchTools with the user request, then call callTool with the exact tool name and schema-compliant arguments.",
  toolRouting: {
    embedding: "openai/text-embedding-3-small",
    pool: [
      /* tools */
    ],
    topK: 2,
  },
});
```

2. Optional: disable search enforcement if needed

```ts
const agent = new Agent({
  name: "Relaxed Agent",
  instructions: "Use searchTools before callTool when possible.",
  toolRouting: {
    pool: [
      /* tools */
    ],
    enforceSearchBeforeCall: false,
  },
});
```
