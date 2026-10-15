---
"@voltagent/core": patch
---

Apply workflow input defaults and runtime schema parsing, validate function-step input/output and normal final results, and preserve workflow error messages in streamed and stored events. Fix `andRace` input inference and return as soon as a branch settles, with cooperative cancellation for losing branches. Accept nested workflow instances with their actual result types, isolate child execution IDs, and propagate unsuccessful child runs as parent-step failures.

Nested workflow steps now attach their child workflow spans to the parent step so the complete execution is inspectable. These fixes were exercised by the offline local playground scenario lab. Review the migration guide for schema parsing and race behavior changes.

End model-loop and provider-attempt spans on stream abort, including providers that do not close their stream, so cancelled runs do not leave apparently running model nodes.
