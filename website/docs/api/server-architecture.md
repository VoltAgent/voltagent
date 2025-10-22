---
title: Server Architecture
sidebar_label: Server Architecture
---

# VoltAgent Server Architecture

VoltAgent 1.x introduces a **framework-agnostic** server architecture that separates core functionality from server implementation. This design allows you to use different server frameworks or create custom implementations.

## Architecture Overview

The server system consists of two main packages:

### @voltagent/server-core

The core package provides framework-agnostic components:

- **Route Definitions** - Standardized route specifications (`/packages/server-core/src/routes/definitions.ts`)
- **Request Handlers** - Business logic for all endpoints
- **Base Provider** - Abstract class for server implementations
- **WebSocket Support** - Real-time communication infrastructure
- **Auth Interface** - Pluggable authentication system

### @voltagent/server-hono

The official server implementation using [Hono](https://hono.dev/):

- Fast, lightweight web framework
- Built-in OpenAPI and Swagger UI support
- TypeScript-first with excellent DX
- Works with Node.js, Bun, Deno, and Edge runtimes

## Core Concepts

### Server Provider Interface

Every server implementation must satisfy the `IServerProvider` interface:

```typescript
interface IServerProvider {
  start(): Promise<{ port: number }>;
  stop(): Promise<void>;
  isRunning(): boolean;
}
```

### Server Provider Factory

Server providers are created using factory functions:

```typescript
type ServerProviderFactory = (deps: ServerProviderDeps) => IServerProvider;
```

The `ServerProviderDeps` provides access to:

- `agentRegistry` - Manage and access agents
- `workflowRegistry` - Manage and access workflows
- `logger` - Logging infrastructure
- `voltOpsClient` - Telemetry and prompt management
- `observability` - OpenTelemetry integration

### Base Server Provider

The `BaseServerProvider` class handles common server tasks:

```typescript
abstract class BaseServerProvider implements IServerProvider {
  // Manages port allocation
  // Sets up WebSocket server
  // Handles graceful shutdown
  // Prints startup messages

  protected abstract startServer(port: number): Promise<Server>;
  protected abstract stopServer(): Promise<void>;
}
```

## Using the Hono Server

### Basic Setup

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    port: 3141,
    enableSwaggerUI: true,
  }),
});
```

### Configuration Options

```typescript
interface HonoServerConfig {
  // Port to listen on (default: 3141)
  port?: number;

  // Hostname to bind the server to (default: "0.0.0.0")
  hostname?: string;

  // Enable Swagger UI (default: true in dev, false in prod)
  enableSwaggerUI?: boolean;

  // Configure the Hono app directly
  configureApp?: (app: OpenAPIHono) => void | Promise<void>;

  // Authentication provider
  auth?: AuthProvider;
}
```

### Network Binding Configuration

The `hostname` option controls which network interface the server binds to. This is particularly important for deployment on modern cloud platforms that use IPv6 or require dual-stack networking.

#### Default Behavior (IPv4)

By default, VoltAgent binds to `0.0.0.0`, which accepts connections on all IPv4 interfaces:

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    port: 3141,
    // hostname: "0.0.0.0" is the default
  }),
});
```

#### IPv6 Dual-Stack (Recommended for Production)

For platforms like Railway, Fly.io, or other IPv6-enabled environments, use `::` to bind to both IPv4 and IPv6:

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    port: 3141,
    hostname: "::", // Binds to both IPv4 and IPv6
  }),
});
```

This is the recommended configuration for production deployments as it ensures compatibility with modern networking infrastructure.

#### Localhost Only (Development)

For local development when you want to restrict access to localhost only:

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    port: 3141,
    hostname: "127.0.0.1", // IPv4 localhost only
  }),
});
```

#### Environment-Based Configuration

Use environment variables for flexible deployment configuration:

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    port: parseInt(process.env.PORT || "3141"),
    hostname: process.env.HOSTNAME || "::", // Default to dual-stack
  }),
});
```

Then set in your deployment environment:

```bash
# Railway, Fly.io, etc.
PORT=8080
HOSTNAME=::

# Local development
PORT=3141
HOSTNAME=127.0.0.1
```

### Advanced Configuration

Access the Hono app directly for custom middleware and routes:

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    configureApp: (app) => {
      // Add custom middleware
      app.use("/admin/*", authMiddleware);

      // Add custom routes
      app.get("/health", (c) => c.json({ status: "ok" }));

      // Create route groups
      const api = app.basePath("/api/v2");
      api.get("/users", getUsersHandler);

      // Add rate limiting
      app.use("*", rateLimiter());
    },
  }),
});
```

## Port Management

VoltAgent includes intelligent port management:

1. **Default Port**: 3141
2. **Fallback Ports**: If default is taken, tries 4310, 1337, etc.
3. **Port Allocation**: Central manager prevents conflicts
4. **Graceful Release**: Ports are released on shutdown

## WebSocket Support

WebSocket is automatically enabled for real-time features:

- **Base path**: `/ws`
- **Endpoints**:
  - `/ws` – connection test/echo
  - `/ws/logs` – real-time logs (filterable via query params)
  - `/ws/observability` – spans and logs for observability (optional `entityId`/`entityType` filters)
- **Protocol**: Standard WebSocket with JSON messages

Note: The Hono server config does not currently expose WebSocket configuration options. WebSockets are on by default and use the `/ws` path. If you need to change the path or behavior, implement a custom provider using `@voltagent/server-core`.

## Route Registration

Routes are defined in a framework-agnostic format:

```typescript
const AGENT_ROUTES = {
  listAgents: {
    method: "get" as const,
    path: "/agents",
    summary: "List all registered agents",
    tags: ["Agent Management"],
    responses: {
      200: { description: "Success" },
      500: { description: "Server error" },
    },
  },
  // ... more routes
};
```

Server implementations use these definitions to:

- Generate OpenAPI documentation
- Register routes with proper handlers
- Ensure consistency across implementations

## Middleware and Plugins

The Hono server supports standard middleware. Middleware configured in `configureApp` runs **before** the default VoltAgent middleware, allowing you to override default behavior.

### Middleware Execution Order

1. **User's `configureApp`** - Your custom middleware and routes (runs first)
2. **Default CORS** - Applied only if you didn't configure custom CORS
3. **Authentication** - If configured via `auth` option
4. **VoltAgent Routes** - Built-in agent and workflow endpoints

### Example: Custom Middleware

```typescript
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { compress } from "hono/compress";

configureApp: (app) => {
  // Custom CORS (disables default CORS)
  app.use(
    "*",
    cors({
      origin: "https://your-domain.com",
      credentials: true,
    })
  );

  // Logging
  app.use("*", logger());

  // Compression
  app.use("*", compress());
};
```

**Important**: If you configure CORS middleware in `configureApp`, the default permissive CORS (`origin: "*"`) is automatically disabled.

## Graceful Shutdown

VoltAgent provides comprehensive shutdown handling to ensure clean resource cleanup and compatibility with other frameworks.

### How Shutdown Works

When VoltAgent receives a shutdown signal (SIGINT/SIGTERM):

1. **Server stops first** - Prevents new requests from being accepted
2. **Workflows suspend** - All active workflows are gracefully suspended
3. **Telemetry shuts down** - Observability resources are properly closed
4. **Process exits (conditionally)** - Only if VoltAgent is the sole signal handler

### Automatic Shutdown Handling

VoltAgent automatically registers SIGINT and SIGTERM handlers that clean up resources:

```typescript
const voltAgent = new VoltAgent({
  agents: { myAgent },
  server: honoServer({ port: 3141 }),
});

// When you press Ctrl+C or the process receives SIGTERM:
// 1. Server stops accepting new connections
// 2. Active workflows are suspended
// 3. Telemetry is flushed and closed
// 4. Process exits (if no other handlers exist)
```

### Programmatic Shutdown

Use the `shutdown()` method for manual resource cleanup:

```typescript
const voltAgent = new VoltAgent({
  agents: { myAgent },
  server: honoServer({ port: 3141 }),
});

// Later in your application
await voltAgent.shutdown();
// All resources are now cleaned up
```

### Framework Integration

VoltAgent respects other frameworks' shutdown handlers. When multiple handlers exist (e.g., from Adonis, NestJS, Express), VoltAgent:

1. Performs its cleanup (server, workflows, telemetry)
2. **Does not** call `process.exit()`
3. Allows other handlers to complete their cleanup
4. Lets the framework control the final exit

Example with Express:

```typescript
import express from "express";
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

const app = express();
const voltAgent = new VoltAgent({
  agents: { myAgent },
  server: honoServer({ port: 3141 }),
});

// Express graceful shutdown
process.on("SIGTERM", async () => {
  console.log("Express: Closing server...");

  // VoltAgent already cleaned up its resources
  // Now Express can do its cleanup
  server.close(() => {
    console.log("Express: Server closed");
    process.exit(0);
  });
});
```

### Server Provider Shutdown

The `BaseServerProvider` handles common shutdown tasks:

- Closes WebSocket connections
- Stops the HTTP server
- Releases allocated ports
- Ensures all pending operations complete

Custom server providers should implement proper cleanup:

```typescript
class CustomServerProvider extends BaseServerProvider {
  protected async stopServer(): Promise<void> {
    // Close all connections
    await this.closeConnections();

    // Stop the server
    if (this.server) {
      await new Promise((resolve) => {
        this.server.close(resolve);
      });
    }

    // Clean up any custom resources
    await this.cleanupCustomResources();
  }
}
```

### Shutdown Order Matters

Resources are cleaned up in a specific order to prevent issues:

1. **Server first** - Stop accepting new work
2. **Workflows second** - Suspend active operations
3. **Telemetry last** - Ensure all events are recorded

This order ensures that:

- No new requests arrive during cleanup
- Active operations can complete or suspend gracefully
- All telemetry data is captured before shutdown

## Best Practices

1. **Use the Official Implementation**: Start with `@voltagent/server-hono` unless you have specific requirements
2. **Configure for Your Deployment**: Use `hostname: "::"` for production deployments to support both IPv4 and IPv6
3. **Leverage configureApp**: Add custom routes and middleware through the configuration
4. **Follow Route Definitions**: Use the standardized route definitions for consistency
5. **Handle Errors Properly**: Implement proper error handling in custom providers
6. **Support Graceful Shutdown**: Always clean up resources properly
7. **Test Shutdown Behavior**: Verify your application exits cleanly in different scenarios
8. **Use `shutdown()` in Tests**: Ensure proper cleanup in test suites
9. **Environment Variables**: Use environment variables for port and hostname configuration to support different deployment environments

## Next Steps

- Learn about [Authentication](./authentication.md) to secure your API
- Explore [Custom Endpoints](./custom-endpoints.md) to extend the API
- Check [Agent Endpoints](./endpoints/agents.md) for API usage
