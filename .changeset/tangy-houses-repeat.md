---
"@voltagent/core": patch
---

Workflows can be streamed directly into `useChat` by converting raw events
(`workflow-start`, `workflow-complete`, etc.) into `data-*` UI messages via
`toUIMessageStreamResponse`.

Related to #589
