---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/core": patch
---

- Introduced tests and documentation for the `ToolDeniedError`.
- Added a feature to terminate the process flow when the `onToolStart` hook triggers a `ToolDeniedError`.
- Enhanced error handling mechanisms to ensure proper flow termination in specific error scenarios.
