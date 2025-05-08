---
"create-voltagent-app": patch
"@voltagent/langfuse-exporter": patch
"@voltagent/google-ai": patch
"@voltagent/vercel-ai": patch
"@voltagent/supabase": patch
"@voltagent/groq-ai": patch
"@voltagent/voice": patch
"@voltagent/core": patch
"@voltagent/xsai": patch
"@voltagent/cli": patch
---

refactor: use 'instructions' field for Agent definitions in examples - #88

Updated documentation examples (READMEs, docs, blogs) and relevant package code examples to use the `instructions` field instead of `description` when defining `Agent` instances.

This change aligns the examples with the preferred API usage for the `Agent` class, where `instructions` provides behavioral guidance to the agent/LLM. This prepares for the eventual deprecation of the `description` field specifically for `Agent` class definitions.

**Example Change for Agent Definition:**

```diff
  const agent = new Agent({
    name: "My Assistant",
-   description: "A helpful assistant.",
+   instructions: "A helpful assistant.",
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
  });
```
