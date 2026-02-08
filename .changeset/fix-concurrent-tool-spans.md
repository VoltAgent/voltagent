---
"@voltagent/core": patch
---

fix(core): resolve race condition with concurrent tool spans

Fixed a race condition where tools running in parallel would overwrite each other's
parentToolSpan in the shared systemContext. The fix passes parentToolSpan through
execution options instead of systemContext, ensuring each tool receives its unique
span. Backward compatibility is maintained by checking both options and systemContext.
