# @voltagent/server-elysia

Elysia server implementation for VoltAgent - A high-performance, type-safe server provider built on [Elysia](https://elysiajs.com/).

## Features

- 🚀 **High Performance**: Built on Elysia, one of the fastest TypeScript frameworks
- 🔒 **Type Safe**: Full TypeScript support with strict typing
- 🔐 **Authentication**: JWT authentication with flexible configuration via `authNext`
- 🌐 **CORS Support**: Easy CORS configuration for cross-origin requests
- 📡 **WebSocket Support**: Real-time streaming and updates
- 🛠️ **Extensible**: Easy to add custom routes, middleware, and plugins
- 📚 **OpenAPI/Swagger**: Built-in API documentation via @elysiajs/swagger
- 🔌 **MCP Support**: Full Model Context Protocol implementation

## Installation

```bash
pnpm add @voltagent/server-elysia elysia
```

## Quick Start

```typescript
import { createVoltAgent } from "@voltagent/core";
import { elysiaServer } from "@voltagent/server-elysia";
import { openai } from "@ai-sdk/openai";

const volt = createVoltAgent({
  agents: [
    {
      id: "my-agent",
      model: openai("gpt-4"),
      instructions: "You are a helpful assistant",
    },
  ],
  server: elysiaServer({
    port: 3141,
  }),
});

volt.start();
```

## Configuration

### Basic Configuration

```typescript
elysiaServer({
  port: 3141,
  hostname: "0.0.0.0",
  enableSwaggerUI: true,
});
```

### CORS Configuration

```typescript
elysiaServer({
  cors: {
    origin: "https://example.com",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  },
});
```

### Authentication with authNext

```typescript
import { jwtAuth } from "@voltagent/server-elysia";

elysiaServer({
  authNext: {
    provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
    publicRoutes: ["GET /health", "POST /webhooks/*"],
  },
});
```

### Custom Routes

```typescript
elysiaServer({
  configureApp: (app) => {
    // Add custom routes
    app.get("/health", () => ({ status: "ok" }));

    // Add route groups
    app.group("/api/v2", (app) => app.get("/users", () => ({ users: [] })));

    // Add middleware
    app.use(customPlugin);
  },
});
```

### Full App Configuration

For complete control over route and middleware ordering:

```typescript
elysiaServer({
  configureFullApp: ({ app, routes, middlewares }) => {
    // Apply middleware first
    middlewares.cors();
    middlewares.auth();

    // Register routes in custom order
    routes.agents();

    // Add custom routes between VoltAgent routes
    app.get("/custom", () => ({ custom: true }));

    // Register remaining routes
    routes.workflows();
    routes.tools();
    routes.doc();
  },
});
```

## API Endpoints

Once running, the following endpoints are available:

### Agent Endpoints

- `GET /agents` - List all agents
- `GET /agents/:id` - Get agent details
- `POST /agents/:id/text` - Generate text
- `POST /agents/:id/stream` - Stream text generation
- `POST /agents/:id/chat` - Stream chat messages
- `POST /agents/:id/object` - Generate structured objects

### Workflow Endpoints

- `GET /workflows` - List all workflows
- `GET /workflows/:id` - Get workflow details
- `POST /workflows/:id/execute` - Execute a workflow
- `POST /workflows/:id/stream` - Stream workflow execution

### Tool Endpoints

- `GET /tools` - List all tools
- `POST /tools/:name/execute` - Execute a tool

### Observability Endpoints

- `GET /observability` - Get observability data
- `GET /observability/traces` - List traces
- `GET /observability/traces/:traceId` - Get specific trace

### Documentation

- `GET /` - Landing page
- `GET /doc` - OpenAPI specification
- `GET /ui` - Swagger UI (if enabled)

## Comparison with server-hono

Both `server-hono` and `server-elysia` provide the same VoltAgent features, but with different framework implementations:

| Feature     | server-hono           | server-elysia                           |
| ----------- | --------------------- | --------------------------------------- |
| Performance | Fast                  | Faster (Elysia is optimized for speed)  |
| Validation  | Zod (Native)          | TypeBox (via Zod Adapter)               |
| OpenAPI     | Via @hono/zod-openapi | Via @elysiajs/swagger (built-in)        |
| Middleware  | Hono middleware       | Elysia plugins                          |
| Type Safety | Full TypeScript       | Full TypeScript with enhanced inference |
| Bundle Size | ~28KB                 | ~26KB                                   |

### Architecture & Validation

One key difference is how validation is handled:

- **server-hono** uses `zod` natively for validation and OpenAPI generation.
- **server-elysia** uses `TypeBox` (Elysia's native validation engine) for maximum performance.

Since VoltAgent's core schemas are defined in `zod` (in `@voltagent/server-core`), `server-elysia` includes a specialized **Zod Adapter**. This adapter automatically transforms Zod schemas into TypeBox/JSON Schema format at runtime, ensuring:

1. **Compatibility**: All existing VoltAgent schemas work out of the box.
2. **Performance**: Validation runs using Elysia's optimized TypeBox compiler.
3. **Documentation**: OpenAPI specs are generated correctly using Elysia's Swagger plugin.

Choose `server-elysia` if you:

- Want maximum performance
- Prefer Elysia's plugin ecosystem
- Need built-in Eden (type-safe client)

Choose `server-hono` if you:

- Are already familiar with Hono
- Need compatibility with Cloudflare Workers
- Want a more mature ecosystem

## Advanced Usage

### Custom Middleware

```typescript
import { Elysia } from "elysia";

const customMiddleware = new Elysia().derive(({ request }) => ({
  userId: request.headers.get("x-user-id"),
}));

elysiaServer({
  configureApp: (app) => {
    app.use(customMiddleware);
  },
});
```

### Error Handling

```typescript
elysiaServer({
  configureApp: (app) => {
    app.onError(({ code, error }) => {
      if (code === "NOT_FOUND") {
        return { error: "Route not found" };
      }
      return { error: error.message };
    });
  },
});
```

## License

MIT

## Links

- [VoltAgent Documentation](https://voltagent.dev)
- [Elysia Documentation](https://elysiajs.com)
- [GitHub Repository](https://github.com/VoltAgent/voltagent)
