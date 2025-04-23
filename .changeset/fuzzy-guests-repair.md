---
"@voltagent/core": patch
---

fix: improve sub-agent context sharing for sequential task execution - #30

Enhanced the Agent system to properly handle context sharing between sub-agents, enabling reliable sequential task execution. The changes include:

- Adding `contextMessages` parameter to `getSystemMessage` method
- Refactoring `prepareAgentsMemory` to properly format conversation history
- Ensuring conversation context is correctly passed between delegated tasks
- Enhancing system prompts to better handle sequential workflows

This fixes issues where the second agent in a sequence would not have access to the first agent's output, causing failures in multi-step workflows.
