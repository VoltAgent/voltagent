<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Escape the limitations of no-code builders and the complexity of starting from scratch.
    <br />
    <br />
</div>

<div align="center">
    
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)
    
</div>

<br/>

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="VoltAgent Schema" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## VoltAgent with PostgreSQL Memory

This example demonstrates how to use VoltAgent with PostgreSQL for persistent memory storage. PostgreSQL provides enterprise-grade reliability, scalability, and advanced features for production applications.

## Features

- **Persistent Memory**: Store conversation history in PostgreSQL
- **Connection Pooling**: Efficient database connection management
- **Flexible Configuration**: Support for both connection objects and connection strings
- **SSL Support**: Secure connections to your PostgreSQL database
- **Automatic Schema**: Tables and indexes are created automatically
- **Debug Mode**: Optional logging for development

## Prerequisites

- Node.js 18+
- PostgreSQL 12+ database
- OpenAI API key

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set up PostgreSQL

You can use a local PostgreSQL installation, Docker, or a cloud provider like:

- [Supabase](https://supabase.com/)
- [Neon](https://neon.tech/)
- [Railway](https://railway.app/)
- [Render](https://render.com/)

#### Using Docker (Local Development)

```bash
docker run --name postgres-voltagent \
  -e POSTGRES_DB=voltagent \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  -d postgres:15
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=voltagent
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_SSL=false

# Alternative: Use connection string
# DATABASE_URL=postgresql://postgres:password@localhost:5432/voltagent

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key_here

# Development settings
NODE_ENV=development
```

### 4. Run the Example

```bash
npm run dev
```

## Configuration Options

The PostgreSQL storage supports various configuration options:

```typescript
const memoryStorage = new PostgresStorage({
  // Connection configuration (object)
  connection: {
    host: "localhost",
    port: 5432,
    database: "voltagent",
    user: "postgres",
    password: "password",
    ssl: false, // or SSL configuration object
  },

  // Alternative: Connection string
  // connection: "postgresql://postgres:password@localhost:5432/voltagent",

  // Optional configurations
  tablePrefix: "voltagent_memory", // Table name prefix
  maxConnections: 10, // Connection pool size
  storageLimit: 100, // Message storage limit
  debug: true, // Enable debug logging
});
```

## Database Schema

The PostgreSQL storage automatically creates the following tables:

- `voltagent_memory_conversations`: Stores conversation metadata
- `voltagent_memory_messages`: Stores conversation messages
- `voltagent_memory_agent_history`: Stores agent history entries
- `voltagent_memory_agent_history_events`: Stores agent history events
- `voltagent_memory_agent_history_steps`: Stores agent history steps

## Production Deployment

For production use:

1. Use a managed PostgreSQL service
2. Enable SSL connections
3. Set appropriate connection pool sizes
4. Configure proper backup strategies
5. Monitor database performance

## Try Example

```bash
npm create voltagent-app@latest -- --example with-postgres
```
