---
"create-voltagent-app": patch
---

feat: add @voltagent/logger with createPinoLogger to new project templates

Enhanced the create-voltagent-app templates to include @voltagent/logger by default in new projects. This provides new VoltAgent applications with production-ready logging capabilities out of the box.

**Changes:**

- Added `@voltagent/logger` as a dependency in generated projects
- Updated templates to import and use `createPinoLogger` instead of relying on the default ConsoleLogger
- New projects now have pretty-formatted, colored logs in development
- Automatic environment-based configuration (pretty in dev, JSON in production)

**Generated Code Example:**

```typescript
import { createPinoLogger } from "@voltagent/logger";

const logger = createPinoLogger({
  level: "info",
  name: "my-voltagent-app",
});

const voltAgent = new VoltAgent({
  agents: [agent],
  logger,
});
```

This ensures new VoltAgent projects start with professional logging capabilities, improving the developer experience and making applications production-ready from day one.
