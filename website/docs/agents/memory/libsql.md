---
title: LibSQL / Turso / SQLite Memory
slug: /agents/memory/libsql
---

# LibSQL / Turso / SQLite Memory

VoltAgent's core package (`@voltagent/core`) includes a built-in memory provider, `LibSQLStorage`, which uses [LibSQL](https://github.com/tursodatabase/libsql) for persistent storage. LibSQL is an open-source fork of SQLite.

This provider is versatile and can connect to:

- **Local SQLite files:** Ideal for development, testing, and simple deployments.
- **[Turso](https://turso.tech/):** A distributed database platform built on LibSQL, offering a globally available edge database.
- **Self-hosted `sqld` instances:** If you run your own LibSQL server.

## Setup

`LibSQLStorage` is part of `@voltagent/core`, so no separate installation is needed beyond the core package.

If you plan to use Turso, you might need the Turso CLI for setup: `npm install -g @tursodatabase/cli`

## Configuration

Initialize `LibSQLStorage` and pass it to your `Agent` configuration:

```typescript
import { Agent, LibSQLStorage } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Configure LibSQLStorage
const memoryStorage = new LibSQLStorage({
  // Required: Connection URL
  url: process.env.DATABASE_URL || "file:./voltagent-memory.db", // Example: Env var for Turso, fallback to local file

  // Required for Turso / Remote sqld (if not using TLS or auth is needed)
  authToken: process.env.DATABASE_AUTH_TOKEN,

  // Optional: Prefix for database table names
  tablePrefix: "my_agent_memory", // Defaults to 'voltagent_memory'

  // Optional: Storage limit (max number of messages per user/conversation)
  // storageLimit: 100, // Defaults to 100

  // Optional: Enable debug logging for the storage provider
  // debug: true, // Defaults to false
});

const agent = new Agent({
  name: "LibSQL Memory Agent",
  description: "An agent using LibSQL for memory.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  memory: memoryStorage,
});
```

**Configuration Options:**

- `url` (string, required): The connection URL for your LibSQL database.
  - **Local SQLite:** Use `file:<path-to-db-file>`.
    - `file:memory.db`: Creates/uses `memory.db` in the current working directory.
    - `file:.voltagent/memory.db`: Creates/uses `memory.db` inside a `.voltagent` subdirectory (created automatically if it doesn't exist).
    - `file:/path/to/your/database.db`: Absolute path.
  - **Turso:** Use the `libsql://your-database-name-username.turso.io` URL provided in your Turso dashboard.
  - **Remote `sqld`:** Use the appropriate `libsql://` or `http(s)://` URL for your server.
- `authToken` (string, optional): Required for authenticated connections to Turso or remote `sqld` instances.
- `tablePrefix` (string, optional): A prefix added to all database tables created by this provider (e.g., `my_prefix_messages`, `my_prefix_conversations`). Defaults to `voltagent_memory`.
- `storageLimit` (number, optional): The maximum number of messages to retain per user/conversation thread. Older messages are automatically pruned when the limit is exceeded. Defaults to `100`.
- `debug` (boolean, optional): Enables detailed logging from the storage provider to the console. Defaults to `false`.

## Automatic Table Creation

Unlike some other database providers, `LibSQLStorage` **automatically creates** the necessary tables (`messages`, `conversations`, `agent_history`, etc., with the configured `tablePrefix`) in the target database if they don't already exist. This simplifies setup, especially for local development using SQLite files.

## Use Cases

- **Local Development & Testing:** Quickly set up persistent memory using a local SQLite file without needing external database services.
- **Serverless & Edge Functions:** SQLite databases (via LibSQL) can often be used effectively in serverless environments.
- **Turso Integration:** Leverage Turso's distributed edge database for low-latency memory access for globally distributed applications.
- **Simple Deployments:** Suitable for applications where managing a separate database server is overkill.
