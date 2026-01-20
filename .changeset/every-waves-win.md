---
"@voltagent/core": patch
---

feat: add VoltAgent-level default memory for agents and workflows

You can now define defaults once at the VoltAgent entrypoint. Agent/workflow instances still win when they set `memory`, and `agentMemory`/`workflowMemory` fall back to the shared `memory` option.

### Usage

```ts
import { Agent, Memory, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

const sharedMemory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/shared.db" }),
});

const agentMemory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/agents.db" }),
});

const workflowMemory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/workflows.db" }),
});

const assistant = new Agent({
  name: "assistant",
  instructions: "Be helpful.",
  model: "openai/gpt-4o-mini",
});

new VoltAgent({
  agents: { assistant },
  memory: sharedMemory,
  agentMemory,
  workflowMemory,
});
```
