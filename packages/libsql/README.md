# @voltagent/libsql

LibSQL/Turso memory provider integration for VoltAgent. This package provides persistent storage capabilities using LibSQL, compatible with Turso and other LibSQL-compatible databases.

## Installation

```bash
npm install @voltagent/libsql
```

## Usage

```typescript
import { VoltAgent } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";

const voltAgent = new VoltAgent({
  telemetry: { enabled: false },
});

const storage = new LibSQLStorage({
  url: "file:local.db", // or your Turso URL
  authToken: "your-auth-token", // optional, for Turso
});

await storage.initialize();

voltAgent.agent({
  name: "my-agent",
  storage,
  // ... other config
});
```

## Features

- Thread-based conversation storage
- Message history persistence
- Working memory support
- Semantic memory capabilities
- Workflow state persistence
- Migration support

## Configuration

### Local File Database

```typescript
const storage = new LibSQLStorage({
  url: "file:local.db",
});
```

### Turso Database

```typescript
const storage = new LibSQLStorage({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
```

### In-Memory Database

```typescript
const storage = new LibSQLStorage({
  url: ":memory:",
});
```

## API

See the [VoltAgent documentation](https://voltagent.ai/docs/agents/memory/libsql) for detailed API documentation.

## License

MIT
