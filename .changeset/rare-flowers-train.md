---
"create-voltagent-app": patch
"@voltagent/scorers": patch
"@voltagent/core": patch
---

feat: add a model registry + router so you can use `provider/model` strings without importing provider packages

Usage:

```ts
import { Agent } from "@voltagent/core";

const openaiAgent = new Agent({
  name: "openai-agent",
  instructions: "Summarize the report in 3 bullets.",
  model: "openai/gpt-4o-mini",
});

const anthropicAgent = new Agent({
  name: "anthropic-agent",
  instructions: "Turn notes into action items.",
  model: "anthropic/claude-3-5-sonnet",
});

const geminiAgent = new Agent({
  name: "gemini-agent",
  instructions: "Translate to Turkish.",
  model: "google/gemini-2.0-flash",
});
```
