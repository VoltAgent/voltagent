---
title: Managed Memory
slug: /agents/memory/managed-memory
---

# Managed Memory

VoltOps Managed Memory is a production-ready hosted memory service for VoltAgent. Create a database through the VoltOps Console and connect using API credentials - no infrastructure provisioning or schema management required.

## Availability

- **US Region**: Virginia (us-east-1)
- **EU Region**: Germany (eu-central-1)

## Installation

```bash
npm install @voltagent/voltagent-memory
```

## Configuration

### Automatic Setup (Recommended)

Get your credentials from [console.voltagent.dev/memory/managed-memory](https://console.voltagent.dev/memory/managed-memory) and set environment variables:

```bash
# .env
VOLTAGENT_PUBLIC_KEY=pk_...
VOLTAGENT_SECRET_KEY=sk_...
```

```ts
import { Agent, Memory } from "@voltagent/core";
import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
import { openai } from "@ai-sdk/openai";

// Adapter automatically uses VoltOps credentials from environment
const memory = new Memory({
  storage: new ManagedMemoryAdapter({
    databaseName: "production-memory",
  }),
});

const agent = new Agent({
  name: "Assistant",
  model: openai("gpt-4o-mini"),
  memory,
});
```

The adapter checks `AgentRegistry` for a global `VoltOpsClient` instance configured from environment variables. This is the simplest setup - no need to instantiate `VoltOpsClient` manually.

### Manual Setup

Pass a `VoltOpsClient` instance explicitly:

```ts
import { Agent, Memory, VoltOpsClient } from "@voltagent/core";
import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
import { openai } from "@ai-sdk/openai";

const voltOpsClient = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY!,
  secretKey: process.env.VOLTAGENT_SECRET_KEY!,
  // baseUrl: "https://api.voltagent.dev", // optional
});

const memory = new Memory({
  storage: new ManagedMemoryAdapter({
    databaseName: "production-memory",
    voltOpsClient, // explicit client
  }),
});

const agent = new Agent({
  name: "Assistant",
  model: openai("gpt-4o-mini"),
  memory,
});
```

Use manual setup when:

- Running multiple adapters with different credentials
- Dynamically changing credentials at runtime
- Testing with mock clients

### Configuration Options

| Option          | Type            | Required | Description                                                      |
| --------------- | --------------- | -------- | ---------------------------------------------------------------- |
| `databaseName`  | `string`        | Yes\*    | Database name from VoltOps Console                               |
| `databaseId`    | `string`        | Yes\*    | Database ID from VoltOps API (alternative to `databaseName`)     |
| `voltOpsClient` | `VoltOpsClient` | No       | Explicit VoltOps client (optional if credentials in environment) |
| `debug`         | `boolean`       | No       | Enable debug logging (default: `false`)                          |

\*Either `databaseName` or `databaseId` is required.

## Creating a Database

1. Navigate to [console.voltagent.dev/memory/managed-memory](https://console.voltagent.dev/memory/managed-memory)
2. Click **Create Database**
3. Enter a name and select region (US or EU)
4. Copy the database credentials

To get your VoltOps API keys, go to **Settings** in the console to find your public and secret keys.

## Features

### Conversation Storage

All `StorageAdapter` methods are supported:

- Message persistence (`addMessage`, `addMessages`, `getMessages`, `clearMessages`)
- Conversation management (`createConversation`, `getConversation`, `updateConversation`, `deleteConversation`)
- Working memory (`getWorkingMemory`, `setWorkingMemory`, `deleteWorkingMemory`)
- Workflow state (`getWorkflowState`, `setWorkflowState`, `updateWorkflowState`)

### Vector Storage (Optional)

Enable semantic search with `ManagedMemoryVectorAdapter`:

```ts
import { ManagedMemoryAdapter, ManagedMemoryVectorAdapter } from "@voltagent/voltagent-memory";
import { AiSdkEmbeddingAdapter, Memory } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

const memory = new Memory({
  storage: new ManagedMemoryAdapter({
    databaseName: "production-memory",
  }),
  embedding: new AiSdkEmbeddingAdapter(openai.embedding("text-embedding-3-small")),
  vector: new ManagedMemoryVectorAdapter({
    databaseName: "production-memory",
  }),
});
```

Both adapters resolve credentials the same way (environment or explicit client). See [Semantic Search](./semantic-search.md) for usage.

## Migration from Self-Hosted

### Export from LibSQL

```ts
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

const localAdapter = new LibSQLMemoryAdapter({
  url: "file:./.voltagent/memory.db",
});

// Export conversations for a user
const conversations = await localAdapter.getConversationsByUserId("user-123");

for (const conv of conversations) {
  const messages = await localAdapter.getMessages("user-123", conv.id);
  console.log(`Conversation ${conv.id}: ${messages.length} messages`);
}
```

### Import to Managed Memory

```ts
import { ManagedMemoryAdapter } from "@voltagent/voltagent-memory";
import { Memory } from "@voltagent/core";

const managedMemory = new Memory({
  storage: new ManagedMemoryAdapter({
    databaseName: "production-memory",
  }),
});

// Import conversation
await managedMemory.createConversation({
  id: conv.id,
  userId: conv.userId,
  resourceId: conv.resourceId,
  title: conv.title,
  metadata: conv.metadata,
});

// Import messages
await managedMemory.addMessages(messages, conv.userId, conv.id);
```

Bulk import/export APIs are planned for future releases.

## Use Cases

### Development & Prototyping

```ts
// No database setup required for pilots
const memory = new Memory({
  storage: new ManagedMemoryAdapter({
    databaseName: "dev-memory",
  }),
});
```

### Multi-Region Deployment

```ts
// US database for North American users
const usMemory = new Memory({
  storage: new ManagedMemoryAdapter({
    databaseName: "memory-us",
  }),
});

// EU database for European users
const euMemory = new Memory({
  storage: new ManagedMemoryAdapter({
    databaseName: "memory-eu",
  }),
});
```

### Team Collaboration

Multiple developers connect to the same managed database using shared VoltOps credentials. Create separate databases for staging and production.

## Limitations

- **Regional latency**: Choose the region closest to your application servers
- **Storage quotas**: Check VoltOps Console for plan-specific limits
- **Credential rotation**: Update environment variables when rotating credentials

## Comparison with Self-Hosted

| Feature             | Managed Memory    | Self-Hosted               |
| ------------------- | ----------------- | ------------------------- |
| Setup time          | < 3 minutes       | Hours                     |
| Schema management   | Automatic         | Manual migrations         |
| Regional hosting    | US & EU           | DIY                       |
| Credential rotation | API-based         | Manual                    |
| Monitoring          | Console dashboard | DIY                       |
| Cost                | Usage-based       | Infrastructure + ops time |

Production-ready for teams without database infrastructure or during rapid deployment.

## Troubleshooting

### Adapter initialization failed

```
Error: Unable to locate managed memory database
```

**Solution**: Verify `databaseName` matches the name in VoltOps Console, or use `databaseId` instead.

### VoltOps client not available

```
Error: VoltOps client is not available for managed memory initialization
```

**Solution**: Ensure `VOLTAGENT_PUBLIC_KEY` and `VOLTAGENT_SECRET_KEY` environment variables are set, or pass `voltOpsClient` explicitly.

### Enable debug logging

```ts
const adapter = new ManagedMemoryAdapter({
  databaseName: "production-memory",
  debug: true, // Logs all API calls and metadata
});
```

## Learn More

- **[Semantic Search](./semantic-search.md)** - Enable vector search with managed memory
- **[Working Memory](./working-memory.md)** - Configure working memory with managed storage
- **[PostgreSQL](./postgres.md)** - Self-hosted Postgres alternative
