---
title: Authentication
sidebar_label: Authentication
---

# Authentication

VoltAgent supports optional authentication to secure your AI agents and workflows. You can run without authentication, use simple JWT tokens, or implement complex auth flows - the choice is yours.

## Getting Started

### Option 1: No Authentication (Default)

Perfect for development and internal tools:

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents: { myAgent },
  server: honoServer(), // No auth configuration needed
});
```

All endpoints are publicly accessible. This is the simplest way to get started.

### Option 2: Basic JWT Authentication

Protect execution endpoints while keeping management endpoints public:

```typescript
import { jwtAuth } from "@voltagent/server-core";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    auth: jwtAuth({
      secret: process.env.JWT_SECRET!, // Your JWT secret key
    }),
  }),
});
```

With this setup:

- ✅ Agent/workflow execution endpoints require JWT token
- ✅ Management endpoints (list agents, etc.) remain public
- ✅ Documentation endpoints remain public

### Option 3: Protect Everything (Recommended for Production)

Make all routes private by default, then explicitly make some public:

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    auth: jwtAuth({
      secret: process.env.JWT_SECRET!,
      defaultPrivate: true, // Protect all routes
      publicRoutes: [
        // Except these
        "GET /health",
        "GET /",
        "POST /webhooks/*",
      ],
    }),
  }),
});
```

### Environment Variables

```bash
# Required for JWT authentication
JWT_SECRET=your-secret-key-here  # Generate with: openssl rand -hex 32

# Required for Console in production
VOLTAGENT_CONSOLE_ACCESS_KEY=your-console-key-here  # Generate with: openssl rand -hex 32
NODE_ENV=production  # Set to enable Console authentication
```

## Common Use Cases

### Public API with Protected Admin Routes

Most endpoints are public, only admin operations require auth:

```typescript
auth: jwtAuth({
  secret: process.env.JWT_SECRET,
  // defaultPrivate: false (default - only execution endpoints protected)
  publicRoutes: [
    "GET /api/public/*", // Additional public routes
  ],
});
```

### Private API with Public Health Check

Everything requires auth except health monitoring:

```typescript
auth: jwtAuth({
  secret: process.env.JWT_SECRET,
  defaultPrivate: true, // Everything protected
  publicRoutes: [
    "GET /health", // Health check for load balancers
    "GET /metrics", // Metrics for monitoring
  ],
});
```

### Multi-Tenant SaaS Application

Extract tenant information from JWT tokens:

```typescript
auth: jwtAuth({
  secret: process.env.JWT_SECRET,
  defaultPrivate: true,

  // Transform JWT payload to your user model
  mapUser: (payload) => ({
    id: payload.sub,
    tenantId: payload.tenant_id,
    email: payload.email,
    role: payload.role,
  }),
});
```

Then access tenant info in your agents:

```typescript
const agent = new Agent({
  name: "TenantAgent",
  hooks: {
    onStart: async ({ context }) => {
      const user = context.context.get("user");
      const tenantId = user?.tenantId;
      // Filter data by tenant
    },
  },
});
```

## How Authentication Works

### What Gets Protected?

When you enable authentication with default settings:

| Endpoint Type                         | No Auth | With Auth (Default) | With Auth (defaultPrivate: true) |
| ------------------------------------- | ------- | ------------------- | -------------------------------- |
| **Execution** (`POST /agents/*/text`) | Public  | **Protected**       | **Protected**                    |
| **Management** (`GET /agents`)        | Public  | Public              | **Protected**                    |
| **Documentation** (`/doc`, `/ui`)     | Public  | Public              | **Protected**                    |
| **Your Custom Routes**                | Public  | Public              | **Protected**                    |

### User Context in Agents

When a request is authenticated, user information is automatically available:

```typescript
const agent = new Agent({
  name: "MyAgent",

  // Dynamic instructions based on user
  instructions: ({ context }) => {
    const user = context?.get("user");
    if (user?.role === "admin") {
      return "You have admin privileges...";
    }
    return "You are a standard user...";
  },

  // Access user in hooks
  hooks: {
    onStart: async ({ context }) => {
      const user = context.context.get("user");
      console.log("Request from:", user?.email);
    },
  },
});
```

### Testing Your Authentication

#### Generate a Test Token

Create `generate-token.js`:

```javascript
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const token = jwt.sign(
  {
    id: "test-user",
    email: "test@example.com",
    role: "admin",
  },
  process.env.JWT_SECRET,
  { expiresIn: "24h" }
);

console.log("Token:", token);
console.log("\nTest with curl:");
console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3141/agents/my-agent/text`);
```

#### Test Protected Endpoints

```bash
# Without token (will fail with 401)
curl -X POST http://localhost:3141/agents/my-agent/text \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello"}'

# With token (will succeed)
curl -X POST http://localhost:3141/agents/my-agent/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"input": "Hello"}'
```

## Advanced Configuration

### Custom User Mapping

Transform JWT payload into your application's user model:

```typescript
auth: jwtAuth({
  secret: process.env.JWT_SECRET,

  mapUser: (payload) => ({
    // Map JWT claims to your user object
    id: payload.sub || payload.user_id,
    email: payload.email,
    name: payload.name || payload.given_name,

    // Add custom fields
    tenantId: payload.tenant_id || payload.org_id,
    permissions: payload.permissions || [],
    tier: payload.subscription_tier || "free",

    // Add computed properties
    isAdmin: payload.role === "admin" || payload.admin === true,
    canAccessPremiumFeatures: ["premium", "enterprise"].includes(payload.tier),
  }),
});
```

### JWT Verification Options

Configure how JWT tokens are verified:

```typescript
auth: jwtAuth({
  secret: process.env.JWT_SECRET,

  verifyOptions: {
    // Accepted signing algorithms
    algorithms: ["HS256", "RS256"],

    // Token audience (aud claim)
    audience: "https://api.example.com",

    // Token issuer (iss claim)
    issuer: "https://auth.example.com",
  },
});
```

### Using RS256 (Public Key)

For tokens signed with RS256:

```typescript
import fs from "fs";

auth: jwtAuth({
  secret: fs.readFileSync("public-key.pem"),
  verifyOptions: {
    algorithms: ["RS256"],
  },
});
```

### Complete Configuration Example

All options together:

```typescript
auth: jwtAuth({
  // JWT secret or public key
  secret: process.env.JWT_SECRET!,

  // Protect all routes by default
  defaultPrivate: true,

  // Routes that don't require auth
  publicRoutes: ["GET /health", "GET /", "POST /webhooks/*", "GET /api/public/*"],

  // Transform JWT to user object
  mapUser: (payload) => ({
    id: payload.sub,
    email: payload.email,
    tenantId: payload.tenant_id,
    permissions: payload.permissions || [],
  }),

  // JWT verification settings
  verifyOptions: {
    algorithms: ["HS256"],
    audience: "voltagent-api",
    issuer: "my-auth-service",
  },
});
```

## Console & Observability Authentication

VoltAgent Console uses a separate authentication system for observability endpoints.

### Understanding Dual Authentication

VoltAgent uses two independent auth systems:

1. **End-User Auth (JWT)**: For your application's users accessing agents/workflows
2. **Console Auth**: For developers accessing the observability dashboard

### Developer Mode

In development (`NODE_ENV !== "production"`), the Console works automatically:

```bash
# Console connects without authentication
npm run dev  # NODE_ENV is not "production"
```

The Console sends `x-voltagent-dev: true` header which is accepted in development mode.

### Production Mode

In production, set a Console Access Key:

```bash
# Server environment variables
NODE_ENV=production
VOLTAGENT_CONSOLE_ACCESS_KEY=your-secure-key-here
```

When accessing the Console:

1. Console detects 401 error
2. Prompts for access key
3. Stores key locally
4. Automatically retries requests

### WebSocket Authentication

Browsers cannot send headers during WebSocket handshake, so use query parameters:

```javascript
// User authentication (JWT)
const token = "your-jwt-token";
const ws = new WebSocket(`ws://localhost:3141/ws?token=${token}`);

// Console authentication (development)
const ws = new WebSocket("ws://localhost:3141/ws/observability?dev=true");

// Console authentication (production)
const key = localStorage.getItem("voltagent_console_access_key");
const ws = new WebSocket(`ws://localhost:3141/ws/observability?key=${key}`);
```

## API Reference

### Protected Routes

When authentication is configured, these endpoints require valid tokens:

#### Agent Execution

- `POST /agents/:id/text` - Generate text
- `POST /agents/:id/stream` - Stream text
- `POST /agents/:id/chat` - Chat stream
- `POST /agents/:id/object` - Generate object
- `POST /agents/:id/stream-object` - Stream object

#### Workflow Execution

- `POST /workflows/:id/run` - Run workflow
- `POST /workflows/:id/stream` - Stream workflow
- `POST /workflows/:id/executions/:executionId/suspend` - Suspend
- `POST /workflows/:id/executions/:executionId/resume` - Resume
- `POST /workflows/:id/executions/:executionId/cancel` - Cancel

#### Observability (Console Auth)

- `GET /observability/*` - All observability endpoints
- `WS /ws/observability` - Real-time observability

### Public Routes (Default)

These remain public unless `defaultPrivate: true`:

#### Management

- `GET /agents` - List agents
- `GET /agents/:id` - Get agent details
- `GET /workflows` - List workflows
- `GET /workflows/executions` - List workflow executions
- `GET /workflows/:id` - Get workflow details

#### Documentation

- `GET /` - Landing page
- `GET /doc` - OpenAPI spec
- `GET /ui` - Swagger UI

#### Discovery

- `GET /agents/:id/card` - Agent card (A2A)
- `GET /mcp/servers` - MCP servers
- `GET /mcp/servers/:id` - MCP server details

### Error Responses

Authentication failures return consistent JSON errors:

```json
// No token provided
{
  "success": false,
  "error": "Authentication required"
}

// Invalid token
{
  "success": false,
  "error": "Invalid token: jwt malformed"
}

// Expired token
{
  "success": false,
  "error": "Token expired"
}
```

## Troubleshooting

### Console Shows 401 Errors

**Problem**: VoltAgent Console displays authentication errors.

**Solution for Development**:

```bash
# Ensure NODE_ENV is not "production"
unset NODE_ENV
# or
NODE_ENV=development npm run dev
```

**Solution for Production**:

```bash
# Set Console Access Key on server
export VOLTAGENT_CONSOLE_ACCESS_KEY=your-key-here
export NODE_ENV=production

# Console will prompt for the key - enter the same value
```

### WebSocket Connection Fails

**Problem**: WebSocket connections are rejected with 401.

**Common Causes**:

1. **Missing token in query params** - Browsers can't send headers in WebSocket handshake
2. **Expired JWT token** - Generate a new token
3. **Wrong authentication method** - Use JWT for user endpoints, Console Key for observability

**Solution**:

```javascript
// Correct: Token in query params
const ws = new WebSocket(`ws://localhost:3141/ws?token=${token}`);

// Wrong: Trying to send headers (doesn't work in browsers)
const ws = new WebSocket("ws://localhost:3141/ws", {
  headers: { Authorization: `Bearer ${token}` }, // ❌ Won't work
});
```

### Mixed Authentication Issues

**Problem**: Some endpoints work, others return 401.

**Remember the dual authentication**:

- **User endpoints** (`/agents/*/text`, `/workflows/*/run`) → JWT token
- **Observability** (`/observability/*`) → Console Access Key or dev bypass
- **WebSockets** → Query parameters for both types

### Console Access Key Not Working

**Problem**: Entered key but still getting 401.

**Checklist**:

1. Verify server has the key:

   ```bash
   echo $VOLTAGENT_CONSOLE_ACCESS_KEY
   ```

2. Check NODE_ENV:

   ```bash
   echo $NODE_ENV  # Should be "production" if using key
   ```

3. Clear browser storage:
   - Open DevTools → Application → Local Storage
   - Delete `voltagent_console_access_key`
   - Refresh and re-enter key

4. Verify key format (no extra spaces):

   ```javascript
   // Correct
   VOLTAGENT_CONSOLE_ACCESS_KEY = abc123;

   // Wrong (has quotes)
   VOLTAGENT_CONSOLE_ACCESS_KEY = "abc123";
   ```

## Security Best Practices

### 1. Use Environment Variables

```typescript
// ❌ Bad: Hardcoded secret
const auth = jwtAuth({
  secret: "my-secret-key",
});

// ✅ Good: Environment variable
const auth = jwtAuth({
  secret: process.env.JWT_SECRET!,
});

// ✅ Better: With validation
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
const auth = jwtAuth({
  secret: process.env.JWT_SECRET,
});
```

### 2. Generate Strong Secrets

```bash
# Generate secure random keys
openssl rand -hex 32

# Or using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Use HTTPS in Production

```typescript
// Enforce HTTPS in production
if (process.env.NODE_ENV === "production") {
  app.use(async (c, next) => {
    if (c.req.header("x-forwarded-proto") !== "https") {
      return c.redirect(`https://${c.req.header("host")}${c.req.url}`);
    }
    await next();
  });
}
```

### 4. Implement Token Refresh

```typescript
// Short-lived access tokens with refresh tokens
const accessToken = createJWT(payload, secret, { expiresIn: "15m" });
const refreshToken = createJWT(payload, refreshSecret, { expiresIn: "7d" });

// Add refresh endpoint to publicRoutes
publicRoutes: ["POST /auth/refresh"];
```

### 5. Rate Limiting

```typescript
import { rateLimiter } from "hono-rate-limiter";

server: honoServer({
  configureApp: (app) => {
    app.use(
      "/agents/*/text",
      rateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100, // Max 100 requests
        standardHeaders: "draft-6",
        keyGenerator: (c) => c.req.header("x-forwarded-for") || "anonymous",
      })
    );
  },
  auth,
});
```

## Next Steps

- Learn about [Custom Endpoints](./custom-endpoints.md) with authentication
- Explore [Streaming](./streaming.md) with authenticated connections
- Read about [Agent Endpoints](./endpoints/agents.md) in detail
- Set up [Observability](../observability/developer-console.md) with Console authentication
