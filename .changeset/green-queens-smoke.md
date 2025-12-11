---
"@voltagent/core": patch
---

fix: fullStream forwarding from sub-agents so metadata reflects the executing sub-agent (adds executingAgentId/name, parent info, agentPath) instead of the supervisor - #849

Documentation now calls out the metadata shape and how it appears in fullStream/toUIMessageStream, and the with-subagents example logs forwarded chunks for easy validation.

Example:

```ts
const res = await supervisor.streamText("delegate something");
for await (const part of res.fullStream) {
  console.log({
    type: part.type,
    subAgent: part.subAgentName,
    executing: part.executingAgentName,
    parent: part.parentAgentName,
    path: part.agentPath,
  });
}
```

Example output:

```json
{
  "type": "tool-call",
  "subAgent": "Formatter",
  "executing": "Formatter",
  "parent": "Supervisor",
  "path": ["Supervisor", "Formatter"]
}
```
