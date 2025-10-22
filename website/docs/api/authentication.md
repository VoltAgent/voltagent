---
title: Authentication
sidebar_label: Authentication
---

# API Authentication

VoltAgent Server supports pluggable authentication providers to secure your API endpoints. The authentication system is framework-agnostic and works with any server implementation.

## Overview

Authentication in VoltAgent:

- **Selective Protection** - Only execution endpoints require authentication by default
- **Pluggable Providers** - Use JWT, Auth0, Supabase, or custom providers
- **Automatic Context** - User information is injected into agent/workflow context
- **Flexible Configuration** - Customize which routes require authentication

## Default Route Protection

VoltAgent supports two authentication modes to give you full control over route security:

### Authentication Modes

#### Opt-In Mode (Default)

By default (`defaultPrivate: false` or not set), only specific execution endpoints require authentication. This is the traditional mode where you explicitly protect sensitive routes.

```typescript
auth: jwtAuth({
  secret: process.env.JWT_SECRET,
  // defaultPrivate: false (this is the default)
});
```

**Behavior**:

- VoltAgent execution routes (like `POST /agents/:id/text`) → Protected ✅
- VoltAgent management routes (like `GET /agents`) → Public 🌐
- Custom routes added via `configureApp` → Public 🌐

#### Opt-Out Mode

When you set `defaultPrivate: true`, all routes require authentication by default. You can selectively make routes public using the `publicRoutes` property.

```typescript
auth: jwtAuth({
  secret: process.env.JWT_SECRET,
  defaultPrivate: true, // Protect all routes by default
  publicRoutes: ["GET /health", "POST /api/webhooks/*"],
});
```

**Behavior**:

- VoltAgent execution routes → Protected ✅
- VoltAgent management routes → Protected ✅
- Custom routes added via `configureApp` → Protected ✅
- Routes in `publicRoutes` → Public 🌐

**Use Cases**:

- You're using third-party auth providers (Clerk, Auth0, Supabase)
- You want to protect all custom endpoints by default
- You need fine-grained control over which routes are public

### Public Routes (No Auth Required in Opt-In Mode)

In the default opt-in mode, these endpoints are public:

```javascript
// Management endpoints
GET /agents              // List agents
GET /agents/:id          // Get agent details
GET /workflows           // List workflows
GET /workflows/:id       // Get workflow details

// Documentation
GET /                    // Landing page
GET /doc                 // OpenAPI spec
GET /ui                  // Swagger UI

// Logs & monitoring
GET /api/logs            // Get logs (HTTP)
// (Optional) GET /health // Only if you add a health route
```

### Protected Routes (Auth Required)

These execution endpoints require authentication by default:

```javascript
// Agent execution
POST /agents/:id/text          // Generate text
POST /agents/:id/stream        // Stream text
POST /agents/:id/object        // Generate object
POST /agents/:id/stream-object // Stream object

// Workflow execution
POST /workflows/:id/execute    // Execute workflow
POST /workflows/:id/stream     // Stream workflow
```

Note:

- `POST /workflows/:id/executions/:executionId/suspend` and `POST /workflows/:id/executions/:executionId/resume` are currently NOT included in default protected patterns. If you need auth on these endpoints today, add a custom guard in `configureApp` or wrap them behind your own routes. Future versions may include them by default.
- WebSockets are currently unauthenticated. If you need auth on `/ws/*`, implement a custom provider or a proxy that enforces authentication.

````

## JWT Authentication

The built-in JWT provider supports standard JSON Web Tokens.

### Basic Setup

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { jwtAuth } from "@voltagent/server-core";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    auth: jwtAuth({
      secret: process.env.JWT_SECRET || "your-secret-key",
    }),
  }),
});
````

### Advanced Configuration

```typescript
const authProvider = jwtAuth({
  // JWT secret for verification
  secret: process.env.JWT_SECRET,

  // Map JWT payload to user object
  mapUser: (payload) => ({
    id: payload.sub,
    email: payload.email,
    name: payload.name,
    roles: payload.roles || [],
    tier: payload.tier || "free",
  }),

  // Additional public routes
  publicRoutes: ["GET /api/public/*", "POST /api/webhooks/*"],

  // Protect all routes by default (opt-out mode)
  // When true, all routes require auth unless listed in publicRoutes
  // defaultPrivate: true,

  // JWT verification options
  verifyOptions: {
    algorithms: ["HS256", "RS256"],
    audience: "https://api.example.com",
    issuer: "https://auth.example.com",
  },
});

new VoltAgent({
  agents: { myAgent },
  server: honoServer({ auth: authProvider }),
});
```

### Creating JWT Tokens

For testing or simple implementations:

```typescript
import { createJWT } from "@voltagent/server-core";

const token = createJWT(
  {
    sub: "user-123",
    email: "user@example.com",
    name: "John Doe",
    roles: ["admin"],
    tier: "premium",
  },
  "your-secret-key",
  {
    expiresIn: "24h",
    audience: "https://api.example.com",
    issuer: "https://auth.example.com",
  }
);

console.log("Bearer", token);
```

## Using Authentication

### Making Authenticated Requests

Include the JWT token in the Authorization header:

```bash
# Get token (from your auth system)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Make authenticated request
curl -X POST http://localhost:3141/agents/assistant/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "input": "Hello, who am I?"
  }'
```

### JavaScript Client

```javascript
const token = await getAuthToken(); // Your auth logic

const response = await fetch("http://localhost:3141/agents/assistant/text", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    input: "Process my request",
  }),
});

if (response.status === 401) {
  console.error("Authentication failed");
  // Refresh token or redirect to login
}
```

## User Context Injection

When authenticated, user information is automatically injected into the request. The middleware adds the user object to `body.context.user` and sets `userId`.

### Accessing User in Agent Hooks

The user context is available in the `OperationContext` Map:

```typescript
const agent = new Agent({
  name: "ContextAwareAgent",
  instructions: "You are a helpful assistant",
  model: openai("gpt-4"),

  hooks: {
    onStart: async ({ agent, context }) => {
      // User data is in the context Map
      const user = context.context.get("user");
      console.log("Processing request for:", user?.email);

      // userId is directly available
      console.log("User ID:", context.userId);

      // Customize behavior based on user
      if (user?.tier === "premium") {
        console.log("Premium user detected");
      }
    },

    onEnd: async ({ agent, context, output, error }) => {
      const user = context.context.get("user");
      console.log(`Request completed for user: ${user?.id}`);
    },
  },
});
```

### Dynamic Instructions Based on User

You can use dynamic instructions to customize agent behavior:

```typescript
const agent = new Agent({
  name: "DynamicAgent",
  instructions: ({ context }) => {
    // Access user from the context Map
    const user = context?.get("user");

    if (user?.roles?.includes("admin")) {
      return "You are an admin assistant with full access to all features.";
    }

    if (user?.tier === "premium") {
      return "You are a premium assistant with advanced capabilities.";
    }

    return "You are a helpful assistant with standard features.";
  },
  model: openai("gpt-4"),
});
```

### Workflow Context

Workflows receive user context in a similar way:

```typescript
const workflow = new Workflow({
  name: "UserWorkflow",

  run: async (input, { context }) => {
    // Context is a Map with user data
    const user = context?.get("user");
    const userId = context?.get("userId");

    if (user?.roles?.includes("admin")) {
      console.log("Admin workflow execution");
    }

    return {
      processedBy: userId,
      userTier: user?.tier,
    };
  },
});
```

## Custom Auth Providers

Create your own authentication provider by implementing the `AuthProvider` interface:

```typescript
import type { AuthProvider } from "@voltagent/server-core";

export function customAuth(config: CustomAuthConfig): AuthProvider<Request> {
  return {
    type: "custom",

    // Verify token and return user object
    async verifyToken(token: string, request?: Request): Promise<any> {
      // Your verification logic
      const user = await verifyWithYourService(token);

      if (!user) {
        throw new Error("Invalid token");
      }

      return user;
    },

    // Extract token from request (optional)
    extractToken(request: Request): string | undefined {
      // Check Authorization header
      const authHeader = request.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7);
      }

      // Check cookie
      const cookie = request.headers.get("Cookie");
      const token = parseCookie(cookie, "auth_token");
      if (token) return token;

      // Check query parameter
      const url = new URL(request.url);
      return url.searchParams.get("token") || undefined;
    },

    // Protect all routes by default (recommended for custom providers)
    defaultPrivate: true,

    // Additional public routes
    publicRoutes: ["GET /api/status", "POST /api/login"],
  };
}
```

## Error Responses

Authentication failures return consistent error responses:

### 401 - No Token

```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 401 - Invalid Token

```json
{
  "success": false,
  "error": "Invalid token: jwt malformed"
}
```

### 401 - Expired Token

```json
{
  "success": false,
  "error": "Token expired"
}
```

## Security Best Practices

### 1. Secure Token Storage

Never store JWT secrets in code:

```typescript
// ❌ Bad
const secret = "my-secret-key";

// ✅ Good
const secret = process.env.JWT_SECRET;
if (!secret) {
  throw new Error("JWT_SECRET environment variable is required");
}
```

### 2. Use HTTPS in Production

Always use HTTPS to prevent token interception:

```typescript
// Production configuration
if (process.env.NODE_ENV === "production") {
  if (!request.url.startsWith("https://")) {
    throw new Error("HTTPS required in production");
  }
}
```

### 3. Token Expiration

Set reasonable expiration times:

```typescript
createJWT(payload, secret, {
  expiresIn: "15m", // Short-lived for sensitive operations
  // or
  expiresIn: "7d", // Longer for less sensitive apps
});
```

### 4. Refresh Tokens

Implement refresh token logic for long sessions:

```typescript
// Public route for token refresh
publicRoutes: (["POST /auth/refresh"],
  // In your refresh handler
  app.post("/auth/refresh", async (c) => {
    const refreshToken = c.req.header("X-Refresh-Token");
    if (validateRefreshToken(refreshToken)) {
      const newToken = createJWT(payload, secret, { expiresIn: "15m" });
      return c.json({ token: newToken });
    }
    return c.json({ error: "Invalid refresh token" }, 401);
  }));
```

### 5. Rate Limiting

Protect auth endpoints from brute force:

```typescript
import { rateLimiter } from "hono-rate-limiter";

server: honoServer({
  configureApp: (app) => {
    // Rate limit auth endpoints
    app.use(
      "/agents/*/text",
      rateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        limit: 100, // Max 100 requests per window
      })
    );
  },
  auth: jwtAuth({ secret }),
});
```

## Testing Authentication

### Generate Test Tokens

Create a test token generator:

```typescript
// test-token.ts
import { createJWT } from "@voltagent/server-core";

const testUsers = {
  admin: {
    sub: "admin-123",
    email: "admin@test.com",
    roles: ["admin"],
    tier: "enterprise",
  },
  user: {
    sub: "user-456",
    email: "user@test.com",
    roles: ["user"],
    tier: "free",
  },
};

const token = createJWT(testUsers.admin, process.env.JWT_SECRET || "test-secret", {
  expiresIn: "1h",
});

console.log(`Bearer ${token}`);
```

### Test Protected Endpoints

```bash
# Without token (should fail)
curl -X POST http://localhost:3141/agents/assistant/text \
  -H "Content-Type: application/json" \
  -d '{"input": "Hello"}'
# Response: 401 {"success": false, "error": "Authentication required"}

# With token (should succeed)
curl -X POST http://localhost:3141/agents/assistant/text \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"input": "Hello"}'
# Response: 200 {"success": true, "data": {...}}
```

## Next Steps

- Explore [Custom Endpoints](./custom-endpoints.md) to add auth-protected routes
- Learn about [Streaming](./streaming.md) with authentication
- Check [Agent Endpoints](./endpoints/agents.md) for authenticated requests
