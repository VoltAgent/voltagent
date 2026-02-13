---
"@voltagent/core": patch
---

feat: improve `providerOptions` IntelliSense for provider-specific model settings

- `ProviderOptions` now includes typed option buckets for `openai`, `anthropic`, `google`, and `xai`.
- Existing top-level call option fields (`temperature`, `maxTokens`, `topP`, `frequencyPenalty`, `presencePenalty`, etc.) remain supported for backward compatibility.
- Added type-level coverage for provider-scoped options in the agent type tests.
- Updated docs to show provider-scoped `providerOptions` usage in agent, API endpoint, and UI integration examples.

```ts
await agent.generateText("Draft a summary", {
  temperature: 0.3,
  providerOptions: {
    openai: {
      reasoningEffort: "medium",
      textVerbosity: "low",
    },
    anthropic: {
      sendReasoning: true,
    },
    google: {
      thinkingConfig: {
        thinkingBudget: 1024,
      },
    },
    xai: {
      reasoningEffort: "medium",
    },
  },
});
```
