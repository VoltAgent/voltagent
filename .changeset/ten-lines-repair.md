---
"@voltagent/core": patch
---

feat: add optional conversation title generation on conversation creation. Titles are derived from the first user message, respect a max length, and can use the agent model or a configured override. #981

```ts
import { Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
  generateTitle: {
    enabled: true,
    model: "gpt-4o-mini", // defaults to the agent model when omitted
    systemPrompt: "Generate a short title (max 6 words).",
    maxLength: 60,
    maxOutputTokens: 24,
  },
});
```
