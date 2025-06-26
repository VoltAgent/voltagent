---
"@voltagent/vercel-ui": patch
"@voltagent/internal": patch
"@voltagent/core": patch
---

fix(core, vercel-ui): Currently the `convertToUIMessages` function does not handle tool calls in steps correctly as it does not properly default filter non-tool related steps for sub-agents, same as the `data-stream` functions and in addition in the core the `operationContext` does not have the `subAgent` fields set correctly.

### Changes

- deprecated `isSubAgentStreamPart` in favor of `isSubAgent` for universal use
- by default `convertToUIMessages` now filters out non-tool related steps for sub-agents
- now able to exclude specific parts or steps (from OperationContext) in `convertToUIMessages`

---

### Internals

New utils were added to the internal package:

- `isObject`
- `isFunction`
- `isPlainObject`
- `isEmptyObject`
- `isNil`
- `hasKey`
