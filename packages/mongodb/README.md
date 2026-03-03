# @voltagent/mongodb

MongoDB storage adapter for VoltAgent memory.

## Installation

```bash
npm install @voltagent/mongodb
```

## Minimal Usage

```typescript
import { Agent, Memory } from "@voltagent/core";
import { MongoDBMemoryAdapter } from "@voltagent/mongodb";

const agent = new Agent({
  name: "Assistant",
  model: "openai/gpt-4o-mini",
  memory: new Memory({
    storage: new MongoDBMemoryAdapter({
      connection: process.env.MONGODB_URI!,
      database: process.env.MONGODB_DATABASE ?? "voltagent",
    }),
  }),
});
```

Example environment variables:

```bash
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=voltagent
```

Customize collection names when you need to isolate multiple apps in the same database:

```typescript
const memory = new Memory({
  storage: new MongoDBMemoryAdapter({
    connection: process.env.MONGODB_URI!,
    database: process.env.MONGODB_DATABASE ?? "voltagent",
    collectionPrefix: "support_bot",
  }),
});
```

## Features

- **Persistent Storage**: Stores messages, conversations, conversation steps, workflow states, and working memory in MongoDB.
- **Efficient Queries**: Indexed for fast retrieval by user, conversation, or date.
- **Type Safe**: Fully typed implementation of the VoltAgent StorageAdapter interface.
- **Workflow Support**: Native support for resuming suspended workflows.

## Configuration

| Option             | Type      | Default              | Description            |
| ------------------ | --------- | -------------------- | ---------------------- |
| `connection`       | `string`  | required             | MongoDB connection URI |
| `database`         | `string`  | `"voltagent"`        | Database name          |
| `collectionPrefix` | `string`  | `"voltagent_memory"` | Prefix for collections |
| `debug`            | `boolean` | `false`              | Enable debug logging   |

## Learn More

- Memory overview: https://voltagent.dev/docs/agents/memory/overview/
- MongoDB memory docs: https://voltagent.dev/docs/agents/memory/mongodb/
