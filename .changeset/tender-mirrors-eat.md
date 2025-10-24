---
"@voltagent/server-hono": patch
"@voltagent/core": patch
"@voltagent/logger": patch
---

fix: respect configured log levels for console output while sending all logs to OpenTelemetry - #646

## The Problem

When users configured a custom logger with a specific log level (e.g., `level: "error"`), DEBUG and INFO logs were still appearing in console output, cluttering the development environment. This happened because:

1. `LoggerProxy` was forwarding all log calls to the underlying logger without checking the configured level
2. Multiple components (agents, workflows, retrievers, memory adapters, observability) were logging at DEBUG level unconditionally
3. OpenTelemetry logs were also being filtered by the same level, preventing observability platforms from receiving all logs

## The Solution

**Framework Changes:**

- Updated `LoggerProxy` to check configured log level before forwarding to console/stdout
- Added `shouldLog(level)` method that inspects the underlying logger's level (supports both Pino and ConsoleLogger)
- Separated console output filtering from OpenTelemetry emission:
  - **Console/stdout**: Respects configured level (error level → only shows error/fatal)
  - **OpenTelemetry**: Always receives all logs (debug, info, warn, error, fatal)

**What Gets Fixed:**

```typescript
const logger = createPinoLogger({ level: "error" });

logger.debug("Agent created");
// Console: ❌ Hidden (keeps dev environment clean)
// OpenTelemetry: ✅ Sent (full observability)

logger.error("Generation failed");
// Console: ✅ Shown (important errors visible)
// OpenTelemetry: ✅ Sent (full observability)
```

## Impact

- **Cleaner Development**: Console output now respects configured log levels
- **Full Observability**: OpenTelemetry platforms receive all logs regardless of console level
- **Better Debugging**: Debug/trace logs available in observability tools even in production
- **No Breaking Changes**: Existing code works as-is with improved behavior

## Usage

No code changes needed - the fix applies automatically:

```typescript
// Create logger with error level
const logger = createPinoLogger({
  level: "error",
  name: "my-app",
});

// Use it with VoltAgent
new VoltAgent({
  agents: { myAgent },
  logger, // Console will be clean, OpenTelemetry gets everything
});
```

## Migration Notes

If you were working around this issue by:

- Filtering console output manually
- Using different loggers for different components
- Avoiding debug logs altogether

You can now remove those workarounds and use a single logger with your preferred console level while maintaining full observability.
