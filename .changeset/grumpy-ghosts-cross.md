---
"@voltagent/logger": patch
---

feat: initial release of @voltagent/logger package

Introducing a powerful, production-ready logging solution for VoltAgent applications. This package provides a feature-rich logger built on top of Pino with support for pretty formatting, file transports, and advanced logging capabilities.

**Key Features:**

- **Pino-based Logger**: High-performance logging with minimal overhead
- **Pretty Formatting**: Human-readable output in development with colors and structured formatting
- **Multiple Transports**: Support for console, file, and custom transports
- **Child Logger Support**: Create contextual loggers with inherited configuration
- **Log Buffering**: In-memory buffer for accessing recent logs programmatically
- **Environment-aware Defaults**: Automatic configuration based on NODE_ENV
- **Redaction Support**: Built-in sensitive data redaction
- **Extensible Architecture**: Provider-based design for custom implementations

**Usage Example:**

```typescript
import { createPinoLogger } from "@voltagent/logger";

const logger = createPinoLogger({
  level: "info",
  name: "my-app",
});
```

This package replaces the basic ConsoleLogger in @voltagent/core for production use cases, offering significantly improved debugging capabilities and performance.
