---
"@voltagent/core": patch
---

fix: include instructions from dynamic toolkits in system prompt generation - #1042

When `tools` is defined dynamically and returns toolkit objects with `addInstructions: true`, those toolkit instructions are now appended to the system prompt for that execution.

### What changed

- Resolved dynamic tools before system prompt assembly so runtime toolkit metadata is available during prompt enrichment.
- Passed runtime toolkits into system message enrichment (`getSystemMessage`/`enrichInstructions`) instead of only using statically registered toolkits.
- Merged static + runtime toolkit instructions with toolkit-name de-duplication.
- Added regression coverage for async dynamic toolkit instructions.

### Impact

- Dynamic toolkit guidance is now honored consistently in prompt construction.
- Behavior now matches static toolkit instruction handling.
