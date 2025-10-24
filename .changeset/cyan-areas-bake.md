---
"@voltagent/core": patch
---

feat: add finish reason and max steps observability to agent execution traces - #721

## The Problem

When agents hit the maximum steps limit (via `maxSteps` or `stopWhen` conditions), execution would terminate abruptly without clear indication in observability traces. This created confusion as:

1. The AI SDK's `finishReason` (e.g., `stop`, `tool-calls`, `length`, `error`) was not being captured in OpenTelemetry spans
2. MaxSteps termination looked like a normal completion with `finishReason: "tool-calls"`
3. Users couldn't easily debug why their agent stopped executing

## The Solution

**Framework (VoltAgent Core):**

- Added `setFinishReason(finishReason: string)` method to `AgentTraceContext` to capture AI SDK finish reasons in OpenTelemetry spans as `ai.response.finish_reason` attribute
- Added `setStopConditionMet(stepCount: number, maxSteps: number)` method to track when maxSteps limit is reached
- Updated `agent.generateText()` and `agent.streamText()` to automatically record:
  - `ai.response.finish_reason` - The AI SDK finish reason (`stop`, `tool-calls`, `length`, `error`, etc.)
  - `voltagent.stopped_by_max_steps` - Boolean flag when maxSteps is reached
  - `voltagent.step_count` - Actual number of steps executed
  - `voltagent.max_steps` - The maxSteps limit that was configured

**What Gets Captured:**

```typescript
// In OpenTelemetry spans:
{
  "ai.response.finish_reason": "tool-calls",
  "voltagent.stopped_by_max_steps": true,
  "voltagent.step_count": 10,
  "voltagent.max_steps": 10
}
```

## Impact

- **Better Debugging:** Users can now clearly see why their agent execution terminated
- **Observability:** All AI SDK finish reasons are now visible in traces
- **MaxSteps Detection:** Explicit tracking when agents hit step limits
- **Console UI Ready:** These attributes power warning UI in VoltOps Console to alert users when maxSteps is reached

## Usage

No code changes needed - this is automatically tracked for all agent executions:

```typescript
const agent = new Agent({
  name: "my-agent",
  maxSteps: 5, // Will be tracked in spans
});

await agent.generateText("Hello");
// Span will include ai.response.finish_reason and maxSteps metadata
```
