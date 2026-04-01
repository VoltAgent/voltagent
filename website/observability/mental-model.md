---
title: Mental Model
hide_table_of_contents: true
---

# Mental Model

This page shows the minimum mental model you need to open a VoltOps trace and understand what happened.
AI agents are hard to debug if you only look at final output.
VoltOps solves this by showing each run as a trace with step-level spans.

## One Request, One Trace

```mermaid
sequenceDiagram
  participant U as User
  participant T as Trace (traceId)
  participant A as Agent span
  participant L as LLM span
  participant O as Tool span

  U->>T: Send request
  T->>A: Start agent step
  A->>L: Generate response
  L->>O: Call tool (if needed)
  O-->>A: Return tool result
  A-->>T: Complete execution
  T-->>U: Final response
```

In VoltOps:

- A **trace** is one end-to-end execution.
- A **span** is one operation inside that execution.
- Spans are connected by parent-child relationships and rendered as nodes.
