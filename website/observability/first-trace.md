---
title: First Trace
---

# First Trace

This page helps you read your first VoltOps trace and quickly find where a run went wrong.

## Trace Mental Model

Every request creates one **trace**.
Inside a trace, each operation is recorded as a **span**.
In VoltOps, spans are shown as nodes in a timeline and graph.

Typical flow:

1. User input arrives.
2. Agent prepares context and prompt.
3. Model call runs.
4. Tool calls execute (if needed).
5. Final response is returned.

## What to Check First

When opening a new trace, check these in order:

1. **Overall status and duration**  
   Start with the trace header. If latency is high, inspect the slowest node first.
2. **Model nodes**  
   Confirm model calls succeeded and returned expected outputs.
3. **Tool nodes**  
   Check tool input/output and error messages.
4. **Conversation metadata**  
   Verify `userId`, `conversationId`, and any custom tags.
5. **Logs for failing spans**  
   Jump to logs attached to the failed or slow node.

## Common Failure Patterns

### Tool failure

Symptoms:

- Model output is fine, then execution fails at a tool node.
- Trace shows retries or immediate error after tool call.

Actions:

- Validate tool input shape.
- Check external API status and auth.
- Add clearer tool error messages for faster triage.

### Wrong tool chosen

Symptoms:

- Agent selects a valid tool, but it is not the intended one.

Actions:

- Tighten tool descriptions and selection instructions.
- Reduce overlapping tool semantics.
- Compare successful and failed traces to see decision differences.

### High latency

Symptoms:

- End-to-end duration is high without hard failures.

Actions:

- Inspect node durations to find bottlenecks.
- Apply sampling in production if trace volume is too high.
- Cache expensive tool operations where possible.

## Fast Debug Loop

Use this repeatable loop:

1. Reproduce with a single known input.
2. Open the latest trace.
3. Identify first failing or slow node.
4. Fix prompt, tool, or infra issue.
5. Re-run and compare traces.

## Continue

- [**Tracing Overview**](tracing/overview) for full feature coverage
- [**Logs**](tracing/logs) for span-level log analysis
- [**Users**](tracing/users) for user and conversation level analysis
