---
"@voltagent/core": major
---

fix: change default memory storage from LibSQL to InMemoryStorage for serverless compatibility

## Breaking Change ⚠️

The default memory storage has been changed from LibSQL to InMemoryStorage to fix serverless deployment issues with native binary dependencies.

## Migration Guide

### If you need persistent storage with LibSQL:

1. Install the new package:

```bash
npm install @voltagent/libsql
# or
pnpm add @voltagent/libsql
```

2. Import and configure LibSQLStorage:

```typescript
import { Agent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";

// Use with Agent
const agent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant",
  // Pass LibSQL storage explicitly
  memory: new LibSQLStorage({
    url: "file:./.voltagent/memory.db", // It's default value
  }),
  // ... other config
});
```

### If you're fine with in-memory storage:

No changes needed! Your agents will use InMemoryStorage by default:

```typescript
const agent = new Agent({
  name: "Assistant",
  instructions: "You are a helpful assistant",
  // memory defaults to InMemoryStorage (no persistence)
});
```

## Why This Change?

- **Lambda Compatibility**: Fixes "Cannot find module '@libsql/linux-x64-gnu'" error in AWS Lambda
- **Smaller Core Bundle**: Removes native dependencies from core package
- **Better Defaults**: InMemoryStorage works everywhere without configuration
- **Modular Architecture**: Use only the storage backends you need
