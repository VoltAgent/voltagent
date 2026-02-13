---
"@voltagent/core": patch
---

feat: add structured workspace skills prompt context API for custom prompt assembly

- Added `workspace.skills.getPromptContext(...)` to return structured prompt metadata for available and activated skills.
- Each item now includes `id`, `name`, `description`, `path`, and `active`, making it easier to build custom `## Skills` sections without re-assembling data from `discoverSkills(...)`.
- Updated `workspace.skills.buildPrompt(...)` to reuse the new prompt context path while preserving existing `<workspace_skills>` output behavior.
