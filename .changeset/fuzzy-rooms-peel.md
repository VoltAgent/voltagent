---
"@voltagent/core": patch
---

fix(core): preserve context Map instance across operations and subagents

## What Changed

- Reuse the same `context` Map instance instead of cloning it on every call.
- `createOperationContext` no longer creates a fresh `new Map(...)` for user or parent context; it reuses the incoming Map to keep state alive.
- All results now expose the same context reference:
  - `generateText`, `streamText`, `generateObject`, `streamObject` return `{ context: oc.context }` instead of `new Map(oc.context)`.
- Subagents invoked via `delegate_task` receive and update the same shared context through `parentOperationContext`.

## Merge Precedence (no overwrites of parent)

`parentOperationContext.context` > `options.context` > agent default context. Only missing keys are filled from lower-precedence sources; parent context values are not overridden.

## Why

Previously, context was effectively reset by cloning on each call, which broke continuity and sharing across subagents. This fix ensures a single source of truth for context throughout an operation chain.

## Potential Impact

- If you relied on context being cloned (new Map identity per call), note that the instance is now shared. For isolation, pass `new Map(existingContext)` yourself when needed.

## Affected Files

- `packages/core/src/agent/agent.ts` (createOperationContext; return shapes for generate/stream methods)
