# VoltAgent with NestJS Example (Middleware Integration)

This example demonstrates how to integrate VoltAgent with a NestJS application **as a middleware**, serving the VoltAgent console on the same port as your NestJS app. It shows how to use agents directly in NestJS services while having the VoltAgent developer console integrated at `/voltagent/*`.

## Features

- **Middleware Integration**: VoltAgent console runs on the same port as NestJS at `/voltagent/*`
- **WebSocket Support**: Real-time logs and observability via WebSocket
- **Dependency Injection**: Proper NestJS DI pattern for agents
- **Single Port**: Both NestJS app and VoltAgent console on port 3000
- **Multiple Endpoints**: REST API endpoints using agents
- **Text Processing**: Example agent with custom tools

## Architecture

- **NestJS App**: Runs on port 3000 (configurable via `PORT`)
- **VoltAgent Console**: Integrated at http://localhost:3000/voltagent
- **WebSocket**: Available at ws://localhost:3000/voltagent/ws
- **Agents**: Injected into controllers via NestJS DI

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- OpenAI API key

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Add your OpenAI API key to .env
```

### Running the Application

```bash
# Development mode with watch
pnpm start:dev

# Production mode
pnpm build
pnpm start:prod
```

The application will start on a single port with all services:

```
🚀 NestJS Application is running on: http://localhost:3000
📊 VoltAgent Console is available at: http://localhost:3000/voltagent
   - Swagger UI: http://localhost:3000/voltagent/ui
   - OpenAPI Docs: http://localhost:3000/voltagent/doc
🔌 VoltAgent WebSocket: ws://localhost:3000/voltagent/ws
   - Logs stream: ws://localhost:3000/voltagent/ws/logs
   - Observability: ws://localhost:3000/voltagent/ws/observability
```

### Available Endpoints

#### NestJS API (Port 3000)

- `GET /` - Welcome message
- `POST /api/process` - Process text with the agent
  ```bash
  curl -X POST http://localhost:3000/api/process \
    -H "Content-Type: application/json" \
    -d '{"text": "hello world"}'
  ```

#### VoltAgent Console (Same Port - /voltagent/\*)

- `GET /voltagent` - Console landing page
- `GET /voltagent/ui` - Swagger UI (development only)
- `GET /voltagent/doc` - OpenAPI documentation
- `GET /voltagent/agents` - List all agents
- `POST /voltagent/agents/:agentName/generateText` - Generate text with an agent
- WebSocket endpoints for real-time logs and observability

## Project Structure

```
src/
├── app.module.ts                    # Main app module
├── app.controller.ts                # Example controller using agents
├── main.ts                          # NestJS bootstrap with WebSocket setup
└── voltagent/
    ├── voltagent.module.ts          # VoltAgent module with middleware config
    ├── voltagent.service.ts         # Agent initialization and management
    ├── voltagent.middleware.ts      # HTTP middleware for console routing
    └── voltagent-websocket.setup.ts # WebSocket integration setup
```

## Key Concepts

### Middleware Integration

VoltAgent console is integrated as NestJS middleware, allowing it to run on the same port:

```typescript
// In VoltAgentModule
configure(consumer: MiddlewareConsumer) {
  consumer
    .apply(VoltAgentMiddleware)
    .forRoutes('/voltagent*');
}
```

### WebSocket Setup

WebSocket support is configured in `main.ts` before the app starts listening:

```typescript
const voltAgentService = app.get(VoltAgentService);
setupVoltAgentWebSocket(app, voltAgentService, "/voltagent/ws");
```

### Using Agents

Inject the `VoltAgentService` into any controller or service:

```typescript
@Controller("api")
export class AppController {
  constructor(private readonly voltAgentService: VoltAgentService) {}

  @Post("process")
  async process(@Body() body: { text: string }): Promise<any> {
    const result = await this.voltAgentService.textAgent.generateText(`Process: ${body.text}`);
    return { result: result.text };
  }
}
```

### Observability

The VoltAgent console provides:

- Real-time agent execution logs via WebSocket
- Tool usage monitoring
- Performance metrics
- OpenAPI documentation with Swagger UI
- Live observability streams

## Configuration

### Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `PORT` - Application port (default: 3000)
- `NODE_ENV` - Environment (development/production)

### Accessing the Console

With middleware integration, you access VoltAgent console via:

- **Landing Page**: http://localhost:3000/voltagent
- **Swagger UI**: http://localhost:3000/voltagent/ui
- **Agents API**: http://localhost:3000/voltagent/agents

### WebSocket Endpoints

- `ws://localhost:3000/voltagent/ws` - Test connection
- `ws://localhost:3000/voltagent/ws/logs` - Real-time logs with filters
- `ws://localhost:3000/voltagent/ws/observability` - Observability stream

## Development

```bash
# Watch mode
pnpm start:dev

# Type checking
pnpm typecheck

# Linting
pnpm lint
pnpm lint:fix
```

## How It Works

### HTTP Requests

1. Request comes to `/voltagent/*`
2. NestJS middleware intercepts it
3. Converts Express Request → Web Standard Request
4. Calls Hono app's `fetch()` method
5. Converts Web Response → Express Response

### WebSocket Connections

1. WebSocket upgrade request comes to `/voltagent/ws/*`
2. NestJS HTTP server emits 'upgrade' event
3. Custom handler strips prefix and routes to VoltAgent
4. VoltAgent's WebSocket handlers process the connection

## Advantages of Middleware Integration

✅ **Single Port** - Simplifies deployment and firewall rules
✅ **Unified App** - Everything in one process
✅ **NestJS Guards** - Can protect console with your existing auth
✅ **No Port Conflicts** - No need to manage multiple ports
✅ **Easy Deployment** - Single container, single service

## Security

### Protect Console in Production

Use NestJS guards to restrict access to the console:

```typescript
@Injectable()
export class VoltAgentAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // Only allow internal network in production
    if (process.env.NODE_ENV === "production") {
      const req = context.switchToHttp().getRequest();
      const ip = req.ip;
      return ip.startsWith("10.") || ip.startsWith("192.168.");
    }
    return true;
  }
}

// Apply to middleware
consumer.apply(VoltAgentAuthGuard, VoltAgentMiddleware).forRoutes("/voltagent*");
```

## Alternative: Separate Port

If you prefer VoltAgent console on a separate port (original approach), see the [NestJS integration docs](https://voltagent.ai/docs/integrations/nestjs) for the separate port configuration.

## Learn More

- [VoltAgent Documentation](https://voltagent.ai/docs)
- [NestJS Integration Guide](https://voltagent.ai/docs/integrations/nestjs)
- [Agent Documentation](https://voltagent.ai/docs/agents)
- [NestJS Documentation](https://docs.nestjs.com)

## License

MIT
