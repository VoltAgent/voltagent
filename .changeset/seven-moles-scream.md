---
"@voltagent/core": patch
---

feat: add configurable subagent event forwarding for enhanced stream control

## What Changed for You

You can now control which events from subagents are forwarded to the parent stream, providing fine-grained control over stream verbosity and performance. Previously, only `tool-call` and `tool-result` events were forwarded with no way to customize this behavior.

## Before - Fixed Event Forwarding

```typescript
// ❌ OLD: Only tool-call and tool-result events were forwarded (hardcoded)
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [writerAgent, editorAgent],
  // No way to change which events were forwarded
});

const result = await supervisor.streamText("Create content");

// Stream only contained tool-call and tool-result from subagents
for await (const event of result.fullStream) {
  console.log("Event", event);
}
```

## After - Full Control Over Event Forwarding

```typescript
// ✅ NEW: Configure exactly which events to forward
const supervisor = new Agent({
  name: "Supervisor",
  subAgents: [writerAgent, editorAgent],

  supervisorConfig: {
    fullStreamEventForwarding: {
      // Choose which event types to forward (default: ['tool-call', 'tool-result'])
      types: ["tool-call", "tool-result", "text-delta"],

      // Control tool name prefixing (default: true)
      addSubAgentPrefix: true, // "WriterAgent: search_tool" vs "search_tool"
    },
  },
});

// Stream only contains configured event types from subagents
const result = await supervisor.streamText("Create content");

// Filter subagent events in your application
for await (const event of result.fullStream) {
  if (event.subAgentId && event.subAgentName) {
    console.log(`Event from ${event.subAgentName}: ${event.type}`);
  }
}
```

## Configuration Options

```typescript
// Minimal - Only tool events (default)
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result'],
}

// Verbose - See what subagents are saying and doing
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result', 'text-delta'],
}

// Full visibility - All events for debugging
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result', 'text-delta', 'reasoning', 'source', 'error', 'finish'],
}

// Clean tool names without agent prefix
fullStreamEventForwarding: {
  types: ['tool-call', 'tool-result'],
  addSubAgentPrefix: false,
}
```

## Why This Matters

- **Better Performance**: Reduce stream overhead by forwarding only necessary events
- **Cleaner Streams**: Focus on meaningful actions rather than all intermediate steps
- **Type Safety**: Use `StreamEventType[]` for compile-time validation of event types
- **Backward Compatible**: Existing code continues to work with sensible defaults

## Technical Details

- Default configuration: `['tool-call', 'tool-result']` with `addSubAgentPrefix: true`
- Events from subagents include `subAgentId` and `subAgentName` properties for filtering
- Configuration available through `supervisorConfig.fullStreamEventForwarding`
- Utilizes the `streamEventForwarder` utility for consistent event filtering
