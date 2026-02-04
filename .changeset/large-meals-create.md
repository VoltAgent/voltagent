---
"@voltagent/core": patch
---

fix: align OpenAI reasoning metadata handling with AI SDK

- preserve non-reasoning OpenAI itemIds (e.g. msg*/fc*) when reasoning parts are absent
- only strip reasoning-linked OpenAI metadata (rs\_/reasoning_trace_id/reasoning) when no reasoning context exists
- include OpenAI reasoning itemId in ConversationBuffer signatures to avoid dropping distinct reasoning parts during merge
