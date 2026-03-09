---
"@voltagent/core": patch
---

Improve structured-output error handling for `Agent.generateText` when models do not emit a final output (for example after tool-calling steps).

- Detect missing `result.output` immediately when `output` is requested and throw a descriptive `VoltAgentError` (`STRUCTURED_OUTPUT_NOT_GENERATED`) instead of surfacing a vague `AI_NoOutputGeneratedError` later.
- Include finish reason and step/tool metadata in the error for easier debugging.
- Add an unhandled-rejection hint in `VoltAgent` logs for missing structured outputs.
