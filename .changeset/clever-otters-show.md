---
"@voltagent/core": patch
---

fix: sub-agent stream error handling and propagation - #521

## What Changed

Fixed a critical issue where sub-agent stream errors were incorrectly reported as successful operations with empty responses. Supervisors now properly detect and handle sub-agent failures with configurable error handling behavior.

## The Problem (Before)

When a sub-agent's `streamText` encountered an error event:

- ❌ Supervisor received `status: "success"` with empty response
- ❌ No way to distinguish between empty success and failure
- ❌ Error details were lost, making debugging difficult
- ❌ Supervisors would continue as if the operation succeeded

```typescript
// Before: Sub-agent fails but supervisor doesn't know
const result = await subAgentManager.handoffTask({
  task: "Process data",
  targetAgent: failingAgent,
});

// result.status === "success" (WRONG!)
// result.result === "" (No error info)
```

## The Solution (After)

Sub-agent errors are now properly detected and reported:

- ✅ Stream errors return `status: "error"` with error details
- ✅ Error messages included in responses (configurable)
- ✅ Partial content preserved when errors occur after text generation
- ✅ New configuration options for flexible error handling

```typescript
// After: Proper error detection and handling
const result = await subAgentManager.handoffTask({
  task: "Process data",
  targetAgent: failingAgent,
});

// result.status === "error" (CORRECT!)
// result.result === "Error in FailingAgent: Stream processing failed"
// result.error === Error object with full details
```

## New Configuration Options

Added `SupervisorConfig` options for customizable error handling:

```typescript
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [agent1, agent2],
  supervisorConfig: {
    // Throw exceptions on stream errors instead of returning error results
    throwOnStreamError: false, // default: false

    // Include error messages in empty responses
    includeErrorInEmptyResponse: true, // default: true

    // Custom guidelines for error handling
    customGuidelines: ["When a sub-agent fails, provide alternative solutions"],
  },
});
```
