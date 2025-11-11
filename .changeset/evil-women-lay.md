---
"@voltagent/core": patch
---

fix: the `/agents/:id/text` response to always include tool calling data. Previously we only bubbled up the last step's `toolCalls`/`toolResults`, so multi-step providers (like `ollama-ai-provider-v2`) returned empty arrays even though the tool actually ran. We now aggregate tool activity across every step before returning the result, restoring parity with GPT-style providers and matching the AI SDK output.
