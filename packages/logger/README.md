# `@voltagent/logger`

Provider-agnostic logging system for VoltAgent with built-in Pino support.

## 🚀 Quick Start

```bash
npm install @voltagent/logger
```

## Usage

### Using Pino Logger (Built-in)

```typescript
import { createPinoLogger } from "@voltagent/logger";

// Create a Pino logger instance
const logger = createPinoLogger({
  name: "my-app",
  level: process.env.LOG_LEVEL || "info",
  format: "pretty", // "json" or "pretty"
  redact: ["password", "token", "apiKey"], // Fields to redact
  bufferSize: 1000, // Log buffer size
});

// Use the logger
logger.info("Application started");
logger.debug({ userId: "123" }, "User logged in");
logger.error({ err: error }, "An error occurred");

// Create child loggers with context
const requestLogger = logger.child({ requestId: "abc123" });
requestLogger.info("Processing request");
```

### Creating Custom Logger Providers

The logger system is designed to be provider-agnostic. You can implement your own logger provider:

```typescript
import { LoggerProvider, LoggerWithProvider } from "@voltagent/logger";
import type { Logger, LoggerOptions, LogBuffer } from "@voltagent/logger";

export class WinstonLoggerProvider implements LoggerProvider {
  name = "winston";

  createLogger(options?: LoggerOptions): LoggerWithProvider {
    // Implement Winston logger creation
  }

  createChildLogger(parent: Logger, bindings: Record<string, any>): Logger {
    // Implement child logger creation
  }

  getLogBuffer(): LogBuffer {
    // Return log buffer implementation
  }
}

// Use custom provider
import { setGlobalLoggerProvider } from "@voltagent/logger";
setGlobalLoggerProvider(new WinstonLoggerProvider());
```

## Features

- **Provider-agnostic**: Core types don't depend on any specific logger implementation
- **Built-in Pino support**: High-performance logging with Pino
- **Log buffering**: In-memory buffer for recent logs
- **Child loggers**: Create contextual loggers with additional metadata
- **Pretty printing**: Human-readable logs in development
- **Log redaction**: Automatically redact sensitive fields
- **Extensible**: Easy to add new logger providers

## Configuration

### Environment Variables

- `LOG_LEVEL` or `VOLTAGENT_LOG_LEVEL`: Set the log level (trace, debug, info, warn, error, fatal)
- `VOLTAGENT_LOG_FORMAT`: Set format to "json" or "pretty"
- `VOLTAGENT_LOG_REDACT`: Comma-separated list of additional fields to redact
- `VOLTAGENT_LOG_BUFFER_SIZE`: Maximum number of logs to keep in buffer (default: 1000)

## 📄 License

MIT License - see LICENSE file for details.
