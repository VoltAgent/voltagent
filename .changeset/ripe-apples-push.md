---
"@voltagent/core": minor
---

feat: add `onHandoffComplete` hook for early termination in supervisor/subagent workflows

## The Problem

When using the supervisor/subagent pattern, subagents **always** return to the supervisor for processing, even when they generate final outputs (like JSON structures or reports) that need no additional handling. This causes unnecessary token consumption.

**Current flow**:

```
Supervisor → SubAgent (generates 2K token JSON) → Supervisor (processes JSON) → User
                                                    ↑ Wastes ~2K tokens
```

**Example impact**:

- Current: ~2,650 tokens per request
- With bail: ~560 tokens per request
- Savings: **79%** (~2,000 tokens / ~$0.020 per request)

## The Solution

Added `onHandoffComplete` hook that allows supervisors to intercept subagent results and optionally **bail** (skip supervisor processing) when the subagent produces final output.

**New flow**:

```
Supervisor → SubAgent → bail() → User ✅
```

## API

The hook receives a `bail()` function that can be called to terminate early:

```typescript
const supervisor = new Agent({
  name: "Workout Supervisor",
  subAgents: [exerciseAgent, workoutBuilder],
  hooks: {
    onHandoffComplete: async ({ agent, result, bail, context }) => {
      // Workout Builder produces final JSON - no processing needed
      if (agent.name === "Workout Builder") {
        context.logger?.info("Final output received, bailing");
        bail(); // Skip supervisor, return directly to user
        return;
      }

      // Large result - bail to save tokens
      if (result.length > 2000) {
        context.logger?.warn("Large result, bailing to save tokens");
        bail();
        return;
      }

      // Transform and bail
      if (agent.name === "Report Generator") {
        const transformed = `# Final Report\n\n${result}\n\n---\nGenerated at: ${new Date().toISOString()}`;
        bail(transformed); // Bail with transformed result
        return;
      }

      // Default: continue to supervisor for processing
    },
  },
});
```

## Hook Arguments

```typescript
interface OnHandoffCompleteHookArgs {
  agent: Agent; // Target agent (subagent)
  sourceAgent: Agent; // Source agent (supervisor)
  result: string; // Subagent's output
  messages: UIMessage[]; // Full conversation messages
  usage?: UsageInfo; // Token usage info
  context: OperationContext; // Operation context
  bail: (transformedResult?: string) => void; // Call to bail
}
```

## Features

- ✅ **Clean API**: No return value needed, just call `bail()`
- ✅ **True early termination**: Supervisor execution stops immediately, no LLM calls wasted
- ✅ **Conditional bail**: Decide based on agent, result content, size, etc.
- ✅ **Optional transformation**: `bail(newResult)` to transform before bailing
- ✅ **Observability**: Automatic logging and OpenTelemetry events with visual indicators
- ✅ **Backward compatible**: Existing code works without changes
- ✅ **Error handling**: Hook errors logged, flow continues normally

## How Bail Works (Implementation Details)

When `bail()` is called in the `onHandoffComplete` hook:

**1. Hook Level** (`packages/core/src/agent/subagent/index.ts`):

- Sets `bailed: true` flag in handoff return value
- Adds OpenTelemetry span attributes to both supervisor and subagent spans
- Logs the bail event with metadata

**2. Tool Level** (`delegate_task` tool):

- Includes `bailed: true` in tool result structure
- Adds note: "One or more subagents produced final output. No further processing needed."

**3. Step Handler Level** (`createStepHandler` in `agent.ts`):

- Detects bail during step execution when tool results arrive
- Creates `BailError` and aborts execution via `abortController.abort(bailError)`
- Stores bailed result in `systemContext` for retrieval
- **Works for both `generateText` and `streamText`**

**4. Catch Block Level** (method-specific handling):

- **generateText**: Catches `BailError`, retrieves bailed result from `systemContext`, applies guardrails, calls hooks, returns as successful generation
- **streamText**: `onError` catches `BailError` gracefully (not logged as error), `onFinish` retrieves and uses bailed result

This unified abort-based implementation ensures true early termination for all generation methods.

### Stream Support (NEW)

**For `streamText` supervisors:**

When a subagent bails during streaming, the supervisor stream is immediately aborted using a `BailError`:

1. **Detection during streaming** (`createStepHandler`):
   - Tool results are checked in `onStepFinish` handler
   - If `bailed: true` found, `BailError` is created and stream is aborted via `abortController.abort(bailError)`
   - Bailed result stored in `systemContext` for retrieval in `onFinish`

2. **Graceful error handling** (`streamText` onError):
   - `BailError` is detected and handled gracefully (not logged as error)
   - Error hooks are NOT called for bail
   - Stream abort is treated as successful early termination

3. **Final result** (`streamText` onFinish):
   - Bailed result retrieved from `systemContext`
   - Output guardrails applied to bailed result
   - `onEnd` hook called with bailed result

**Benefits for streaming:**

- ✅ Stream stops immediately when bail detected (no wasted supervisor chunks)
- ✅ No unnecessary LLM calls after bail
- ✅ Works with `fullStreamEventForwarding` - subagent chunks already forwarded
- ✅ Clean abort semantic with `BailError` class
- ✅ Graceful handling - not treated as error

**Supported methods:**

- ✅ `generateText` - Aborts execution during step handler, catches `BailError` and returns bailed result
- ✅ `streamText` - Aborts stream during step handler, handles `BailError` in `onError` and `onFinish`
- ❌ `generateObject` - No tool support, bail not applicable
- ❌ `streamObject` - No tool support, bail not applicable

**Key difference from initial implementation:**

- ❌ **OLD**: Post-execution check in `generateText` (after AI SDK completes) - redundant
- ✅ **NEW**: Unified abort mechanism in `createStepHandler` - works for both methods, stops execution immediately

## Use Cases

Perfect for scenarios where specialized subagents generate final outputs:

1. **JSON/Structured data generators**: Workout builders, report generators
2. **Large content producers**: Document creators, data exports
3. **Token optimization**: Skip processing for expensive results
4. **Business logic**: Conditional routing based on result characteristics

## Observability

When bail occurs, both logging and OpenTelemetry tracking provide full visibility:

**Logging:**

- Log event: `Supervisor bailed after handoff`
- Includes: supervisor name, subagent name, result length, transformation status

**OpenTelemetry:**

- Span event: `supervisor.handoff.bailed` (for timeline events)
- Span attributes added to **both supervisor and subagent spans**:
  - `bailed`: `true`
  - `bail.supervisor`: supervisor agent name (on subagent span)
  - `bail.subagent`: subagent name (on supervisor span)
  - `bail.transformed`: `true` if result was transformed

**Console Visualization:**
Bailed subagents are visually distinct in the observability react-flow view:

- Purple border with shadow (`border-purple-500 shadow-purple-600/50`)
- "⚡ BAILED" badge in the header (shows "⚡ BAILED (T)" if transformed)
- Tooltip showing which supervisor initiated the bail
- Node opacity remains at 1.0 (fully visible)
- Status badge shows "BAILED" with purple styling instead of error
- Details panel shows "Early Termination" info section with supervisor info

## Type Safety Improvements

Also improved type safety by replacing `usage?: any` with proper `UsageInfo` type:

```typescript
export type UsageInfo = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
};
```

This provides:

- ✅ Better autocomplete in IDEs
- ✅ Compile-time type checking
- ✅ Clear documentation of available fields

## Breaking Changes

None - this is a purely additive feature. The `UsageInfo` type structure is fully compatible with existing code.
