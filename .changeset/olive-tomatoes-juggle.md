---
"@voltagent/core": patch
---

Enable workspace skills prompt injection by default when an agent has a workspace with skills configured.

- Agents now auto-compose a workspace skills prompt hook by default.
- Added `workspaceSkillsPrompt` to `AgentOptions` to customize (`WorkspaceSkillsPromptOptions`), force (`true`), or disable (`false`) prompt injection.
- When a custom `hooks.onPrepareMessages` is provided, it now composes with the default workspace skills prompt hook unless `workspaceSkillsPrompt` is explicitly set to `false`.
- Updated workspace skills docs and the `examples/with-workspace` sample to document and use the new behavior.
