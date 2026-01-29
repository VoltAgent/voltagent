# @voltagent/mongodb

MongoDB storage adapter for VoltAgent memory.

## Installation

```bash
npm install @voltagent/mongodb
```

## Usage

```typescript
import { MongoDBMemoryAdapter } from "@voltagent/mongodb";
import { Memory } from "@voltagent/core";

const memory = new Memory({
  storage: new MongoDBMemoryAdapter({
    connection: process.env.MONGO_URI,
    database: "voltagent", // optional
    collectionPrefix: "voltagent_memory", // optional
  }),
});
```

## Features

- **Persistent Storage**: Stores messages, conversations, and workflow states in MongoDB.
- **Efficient Queries**: Indexed for fast retrieval by user, conversation, or date.
- **Type Safe**: Fully typed implementation of the VoltAgent StorageAdapter interface.
- **Workflow Support**: Native support for resuming suspended workflows.

## Configuration

| Option | Type | Default | Description |
| str | str | str | str |
| `connection` | `string` | required | MongoDB connection URI |
| `database` | `string` | `"voltagent"` | Database name |
| `collectionPrefix` | `string` | `"voltagent_memory"` | Prefix for collections |
| `debug` | `boolean` | `false` | Enable debug logging |
