---
"@voltagent/core": minor
---

fix(core): respect custom logger level and prevent duplicate OTEL log emissions

Fixed critical logging issues where custom logger levels were being ignored:

- ConsoleLogger now only emits OTEL logs when the log level check passes
- LoggerProxy no longer emits duplicate OTEL logs, delegates to underlying logger
- Setting log level to 'error' now properly suppresses all DEBUG logs
- Added comprehensive tests to prevent regression

This ensures that when users set a custom logger with level 'error', they no longer see DEBUG output cluttering their console.
