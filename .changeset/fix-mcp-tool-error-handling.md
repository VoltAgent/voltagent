---
"@voltagent/core": patch
---

fix: make tool errors non-fatal for better agent resilience - #430 & #349

Previously, when tools encountered errors (timeouts, connection issues, etc.), the entire agent execution would fail. This change improves resilience by:

- Catching tool execution errors and returning them as structured results instead of throwing
- Allowing the LLM to see tool errors and decide whether to retry or use alternative approaches
- Including error details (message and stack trace) in the tool result for debugging
- Ensuring agent execution only fails when it reaches maxSteps or the LLM cannot proceed

The error result format includes:

```json
{
  "error": true,
  "message": "Error message",
  "stack": "Error stack trace (optional)"
}
```

This change makes agents more robust when dealing with unreliable external tools or transient network issues.
