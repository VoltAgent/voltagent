# @voltagent/server-elysia

## 2.0.2

### Patch Changes

- [#993](https://github.com/VoltAgent/voltagent/pull/993) [`48cc93f`](https://github.com/VoltAgent/voltagent/commit/48cc93f005684b48e882be78742e4d5c59d1665f) Thanks [@Artist-MOBAI](https://github.com/Artist-MOBAI)! - fix(server-elysia): Add Node.js compatibility and VoltOps Console support

## 2.0.1

### Patch Changes

- [#974](https://github.com/VoltAgent/voltagent/pull/974) [`a5bc28d`](https://github.com/VoltAgent/voltagent/commit/a5bc28deed4f4a92c020d3f1dace8422a5c66111) Thanks [@omeraplak](https://github.com/omeraplak)! - feat: add memory HTTP endpoints for conversations, messages, working memory, and search across server-core, Hono, Elysia, and serverless runtimes.

  ### Endpoints
  - `GET /api/memory/conversations`
  - `POST /api/memory/conversations`
  - `GET /api/memory/conversations/:conversationId`
  - `PATCH /api/memory/conversations/:conversationId`
  - `DELETE /api/memory/conversations/:conversationId`
  - `POST /api/memory/conversations/:conversationId/clone`
  - `GET /api/memory/conversations/:conversationId/messages`
  - `GET /api/memory/conversations/:conversationId/working-memory`
  - `POST /api/memory/conversations/:conversationId/working-memory`
  - `POST /api/memory/save-messages`
  - `POST /api/memory/messages/delete`
  - `GET /api/memory/search`

  Note: include `agentId` (query/body) when multiple agents are registered or no global memory is configured.

  ### Examples

  Create a conversation:

  ```bash
  curl -X POST http://localhost:3141/api/memory/conversations \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "user-123",
      "resourceId": "assistant",
      "title": "Support Chat",
      "metadata": { "channel": "web" }
    }'
  ```

  Save messages into the conversation:

  ```bash
  curl -X POST http://localhost:3141/api/memory/save-messages \
    -H "Content-Type: application/json" \
    -d '{
      "userId": "user-123",
      "conversationId": "conv-001",
      "messages": [
        { "role": "user", "content": "Hi there" },
        { "role": "assistant", "content": "Hello!" }
      ]
    }'
  ```

  Update working memory (append mode):

  ```bash
  curl -X POST http://localhost:3141/api/memory/conversations/conv-001/working-memory \
    -H "Content-Type: application/json" \
    -d '{
      "content": "Customer prefers email follow-ups.",
      "mode": "append"
    }'
  ```

  Search memory (requires embedding + vector adapters):

  ```bash
  curl "http://localhost:3141/api/memory/search?searchQuery=refund%20policy&limit=5"
  ```

- Updated dependencies [[`9221498`](https://github.com/VoltAgent/voltagent/commit/9221498c71eb77759380d17e50521abfd213a64c), [`a5bc28d`](https://github.com/VoltAgent/voltagent/commit/a5bc28deed4f4a92c020d3f1dace8422a5c66111)]:
  - @voltagent/core@2.1.6
  - @voltagent/server-core@2.1.3

## 2.0.0

### Major Changes

- [#898](https://github.com/VoltAgent/voltagent/pull/898) [`b322cf4`](https://github.com/VoltAgent/voltagent/commit/b322cf4c511c64872c178e51f9ddccb869385dee) Thanks [@MGrin](https://github.com/MGrin)! - feat: Initial release of @voltagent/server-elysia

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

### Patch Changes

- Updated dependencies [[`b322cf4`](https://github.com/VoltAgent/voltagent/commit/b322cf4c511c64872c178e51f9ddccb869385dee)]:
  - @voltagent/server-core@2.1.0
