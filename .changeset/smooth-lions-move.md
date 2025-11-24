---
"@voltagent/server-core": patch
"@voltagent/server-hono": patch
"@voltagent/core": patch
---

feat: comprehensive authentication system with JWT, Console Access, and WebSocket support

## The Problem

VoltAgent's authentication system had several critical gaps that made it difficult to secure production deployments:

1. **No Authentication Support:** The framework lacked built-in authentication, forcing developers to implement their own security
2. **WebSocket Security:** WebSocket connections for observability had no authentication, exposing sensitive telemetry data
3. **Browser Limitations:** Browsers cannot send custom headers during WebSocket handshake, making authentication impossible
4. **Development vs Production:** No clear separation between development convenience and production security
5. **Console Access:** No secure way for the VoltAgent Console to access observability endpoints in production

## The Solution

**JWT Authentication (`@voltagent/server-core`, `@voltagent/server-hono`):**

- Added pluggable `jwtAuth` provider with configurable secret and options
- Implemented `mapUser` function to transform JWT payloads into user objects
- Created flexible route protection with `defaultPrivate` mode (opt-out vs opt-in)
- Added `publicRoutes` configuration for fine-grained control

**WebSocket Authentication:**

- Implemented query parameter authentication for browser WebSocket connections
- Added dual authentication support (headers for servers, query params for browsers)
- Created WebSocket-specific authentication helpers for observability endpoints
- Preserved user context throughout WebSocket connection lifecycle

**Console Access System:**

- Introduced `VOLTAGENT_CONSOLE_ACCESS_KEY` environment variable for production Console access
- Added `x-console-access-key` header support for HTTP requests
- Implemented query parameter `?key=` for WebSocket connections
- Created `hasConsoleAccess()` utility for unified access checking

**Development Experience:**

- Enhanced `x-voltagent-dev` header to work with both HTTP and WebSocket
- Added `isDevRequest()` helper that requires both header AND non-production environment
- Implemented query parameter `?dev=true` for browser WebSocket connections
- Maintained zero-config development mode while ensuring production security

**Route Matching Improvements:**

- Added wildcard support with `/observability/*` pattern for all observability endpoints
- Implemented double-star pattern `/api/**` for path and all children
- Enhanced `pathMatches()` function with proper segment matching
- Protected all observability, workflow control, and system update endpoints by default

## Impact

- ✅ **Production Ready:** Complete authentication system for securing VoltAgent deployments
- ✅ **WebSocket Security:** Browser-compatible authentication for real-time observability
- ✅ **Console Integration:** Secure access for VoltAgent Console in production environments
- ✅ **Developer Friendly:** Zero-config development with automatic authentication bypass
- ✅ **Flexible Security:** Choose between opt-in (default) or opt-out authentication modes
- ✅ **User Context:** Automatic user injection into agent and workflow execution context

## Technical Details

**Protected Routes (Default):**

```typescript
// Agent/Workflow Execution
POST /agents/:id/text
POST /agents/:id/stream
POST /workflows/:id/run

// All Observability Endpoints
/observability/*  // Traces, logs, memory - all methods

// Workflow Control
POST /workflows/:id/executions/:executionId/suspend
POST /workflows/:id/executions/:executionId/resume

// System Updates
GET /updates
POST /updates/:packageName
```

**Authentication Modes:**

```typescript
// Opt-in mode (default) - Only execution endpoints protected
auth: jwtAuth({
  secret: process.env.JWT_SECRET,
});

// Opt-out mode - Everything protected except specified routes
auth: jwtAuth({
  secret: process.env.JWT_SECRET,
  defaultPrivate: true,
  publicRoutes: ["GET /health", "POST /webhooks/*"],
});
```

**WebSocket Authentication Flow:**

```typescript
// Browser WebSocket with query params
new WebSocket("ws://localhost:3000/ws/observability?key=console-key");
new WebSocket("ws://localhost:3000/ws/observability?dev=true");

// Server WebSocket with headers
ws.connect({
  headers: {
    "x-console-access-key": "console-key",
    "x-voltagent-dev": "true",
  },
});
```

## Migration Notes

**For Existing Users:**

1. **No Breaking Changes:** Authentication is optional. Existing deployments continue to work without configuration.

2. **To Enable Authentication:**

   ```typescript
   import { jwtAuth } from "@voltagent/server-hono";

   new VoltAgent({
     server: honoServer({
       auth: jwtAuth({
         secret: process.env.JWT_SECRET,
       }),
     }),
   });
   ```

3. **For Production Console:**

   ```bash
   # .env
   VOLTAGENT_CONSOLE_ACCESS_KEY=your-secure-key
   NODE_ENV=production
   ```

4. **Generate Secrets:**

   ```bash
   # JWT Secret
   openssl rand -hex 32

   # Console Access Key
   openssl rand -hex 32
   ```

5. **Test Token Generation:**
   ```javascript
   // generate-token.js
   import jwt from "jsonwebtoken";
   const token = jwt.sign({ id: "user-1", email: "test@example.com" }, process.env.JWT_SECRET, {
     expiresIn: "24h",
   });
   console.log(token);
   ```

## Documentation

Comprehensive authentication documentation has been added to `/website/docs/api/authentication.md` covering:

- Getting started with three authentication options
- Common use cases with code examples
- Advanced configuration with `mapUser` function
- Console and observability authentication
- Security best practices
- Troubleshooting guide
