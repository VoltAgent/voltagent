---
"@voltagent/core": patch
"@voltagent/libsql": patch
---

fix: improve subagent tracing hierarchy and entity filtering

## What Changed

Fixed OpenTelemetry span hierarchy issues where subagent spans were overriding parent delegate_task spans instead of being properly nested as children. Also resolved entity ID filtering returning incorrect traces for subagent queries.

## The Problem

When a supervisor agent delegated tasks to subagents:

1. **Span Hierarchy**: Subagent spans appeared to replace delegate_task spans instead of being children
2. **Entity Filtering**: Querying by subagent entity ID (e.g., `entityId=Formatter`) incorrectly returned traces that should only be associated with the root agent (e.g., `entityId=Supervisor`)

## The Solution

Implemented namespace-based attribute management in trace-context:

- **Root agents** use `entity.id`, `entity.type`, `entity.name` attributes
- **Subagents** use `subagent.id`, `subagent.name`, `subagent.type` namespace
- **Subagents inherit** parent's `entity.id` for correct trace association
- **Span naming** clearly identifies subagents with `subagent:AgentName` prefix

## Example

```typescript
// Before: Incorrect hierarchy and filtering
// delegate_task span seemed to disappear
// entityId=Formatter returned Supervisor's traces

// After: Proper hierarchy and filtering
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [formatter, writer],
});

// Trace structure now shows:
// - Supervisor (root span)
//   - delegate_task: Formatter (tool span)
//     - subagent:Formatter (subagent span with proper parent)
//       - (formatter's tools and operations)

// Filtering works correctly:
// entityId=Supervisor ✓ Returns supervisor traces
// entityId=Formatter ✗ Returns no traces (correct - Formatter is a subagent)
```

## Impact

- Proper parent-child relationships in span hierarchy
- Correct trace filtering by entity ID
- Clear distinction between root agents and subagents in observability data
- Better debugging experience with properly nested spans
