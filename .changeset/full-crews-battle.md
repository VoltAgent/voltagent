---
"@voltagent/server-elysia": major
"@voltagent/server-core": minor
---

feat: Initial release of @voltagent/server-elysia

# @voltagent/server-elysia

## 1.0.0

### Major Changes

- Initial release of Elysia server implementation for VoltAgent
- Full feature parity with server-hono including:
  - Agent execution endpoints (text, stream, chat, object)
  - Workflow execution and lifecycle management
  - Tool execution and discovery
  - MCP (Model Context Protocol) support
  - A2A (Agent-to-Agent) communication
  - Observability and tracing
  - Logging endpoints
  - Authentication with authNext support
  - Custom endpoint configuration
  - CORS configuration
  - WebSocket support

### Features

- **High Performance**: Built on Elysia, optimized for speed and low latency
- **Type Safety**: Full TypeScript support with strict typing
- **Flexible Configuration**: Support for both `configureApp` and `configureFullApp` patterns
- **Auth Support**: JWT authentication with public route configuration via `authNext`
- **Extensible**: Easy to add custom routes, middleware, and plugins
- **OpenAPI/Swagger**: Built-in API documentation via @elysiajs/swagger
- **MCP Support**: Full Model Context Protocol implementation with SSE streaming
- **WebSocket Support**: Real-time updates and streaming capabilities

### Dependencies

- `@voltagent/core`: ^1.5.1
- `@voltagent/server-core`: ^1.0.36
- `@voltagent/mcp-server`: ^1.0.3
- `@voltagent/a2a-server`: ^1.0.2
- `elysia`: ^1.1.29

### Peer Dependencies

- `@voltagent/core`: ^1.x
- `elysia`: ^1.x
