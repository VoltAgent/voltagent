---
"@voltagent/core": patch
---

feat: integrate comprehensive logging system with @voltagent/logger support

Enhanced the core package with a flexible logging infrastructure that supports both the built-in ConsoleLogger and the advanced @voltagent/logger package. This update provides better debugging, monitoring, and observability capabilities across all VoltAgent components.

**Key Changes:**

- **Logger Integration**: VoltAgent, Agents, and Workflows now accept a logger instance for centralized logging
- **Default ConsoleLogger**: Built-in logger for quick prototyping with basic timestamp formatting
- **Logger Propagation**: Parent loggers automatically create child loggers for agents and workflows
- **Context Preservation**: Child loggers maintain context (component names, IDs) throughout execution
- **Environment Variables**: Support for `VOLTAGENT_LOG_LEVEL` and `LOG_LEVEL` environment variables
- **Backward Compatible**: Existing code works without changes, using the default ConsoleLogger

**Installation:**

```bash
# npm
npm install @voltagent/logger

# pnpm
pnpm add @voltagent/logger

# yarn
yarn add @voltagent/logger
```

**Usage Examples:**

```typescript
// Using default ConsoleLogger
const voltAgent = new VoltAgent({ agents: [agent] });

// Using @voltagent/logger for production
import { createPinoLogger } from "@voltagent/logger";

const logger = createPinoLogger({ level: "info" });
const voltAgent = new VoltAgent({
  logger,
  agents: [agent],
});
```

This update lays the foundation for comprehensive observability and debugging capabilities in VoltAgent applications.
