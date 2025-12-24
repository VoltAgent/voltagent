---
title: Custom Endpoints
sidebar_label: Custom Endpoints
---

# Custom REST Endpoints

VoltAgent Server allows you to add custom REST endpoints alongside the built-in agent and workflow endpoints. This enables extending your API with business logic, integrations, and custom functionality.

## Overview

With `@voltagent/server-hono`, you can add custom routes using the `configureApp` callback which gives you direct access to the Hono app instance.

## Basic Setup

Add custom endpoints through the server configuration:

```typescript
import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    configureApp: (app) => {
      // Add custom routes here
      app.get("/api/health", (c) => c.json({ status: "healthy" }));

      app.post("/api/data", async (c) => {
        const body = await c.req.json();
        // Process data
        return c.json({ success: true, data: body });
      });
    },
  }),
});
```

## CORS Configuration

Configure Cross-Origin Resource Sharing (CORS) for your API using the `cors` field in server configuration. By default, VoltAgent allows all origins (`*`).

### Default CORS (Permissive)

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    // Default: allows all origins
  }),
});
```

### Custom CORS Settings

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    cors: {
      origin: "https://your-domain.com",
      allowHeaders: ["X-Custom-Header", "Content-Type", "Authorization"],
      allowMethods: ["POST", "GET", "OPTIONS"],
      exposeHeaders: ["Content-Length"],
      maxAge: 600,
      credentials: true,
    },
  }),
});
```

### Multiple Origins

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    cors: {
      origin: ["https://app1.com", "https://app2.com", "https://app3.com"],
      credentials: true,
    },
  }),
});
```

### Dynamic Origin

```typescript
new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    cors: {
      origin: (origin) => {
        // Allow specific domains
        const allowedDomains = ["app1.com", "app2.com"];
        if (allowedDomains.some((domain) => origin.includes(domain))) {
          return origin;
        }
        return undefined; // Reject
      },
      credentials: true,
    },
  }),
});
```

### Route-Specific CORS

For advanced use cases where different routes need different CORS policies, disable the default CORS and configure route-specific CORS in `configureApp`:

```typescript
import { cors } from "hono/cors";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    cors: false, // Disable default CORS

    configureApp: (app) => {
      // Agent routes - strict CORS
      app.use(
        "/agents/*",
        cors({
          origin: "https://agents-app.com",
          credentials: true,
        }),
      );

      // Public API - permissive CORS
      app.use(
        "/api/public/*",
        cors({
          origin: "*",
        }),
      );

      // Admin routes - very strict CORS
      app.use(
        "/api/admin/*",
        cors({
          origin: ["https://admin.com", "https://admin-staging.com"],
          credentials: true,
          allowMethods: ["GET", "POST"],
        }),
      );

      // Your custom routes
      app.get("/api/public/status", (c) => c.json({ status: "ok" }));
      app.get("/api/admin/stats", (c) => c.json({ stats: {...} }));
    },
  }),
});
```

**Important**: When `cors: false`, you must manually configure CORS for all routes that need it, including VoltAgent's built-in routes.

## Route Patterns

Hono supports various route patterns:

### Static Routes

```typescript
configureApp: (app) => {
  app.get("/api/status", (c) => c.json({ status: "ok" }));
  app.post("/api/users", async (c) => {
    /* ... */
  });
  app.put("/api/settings", async (c) => {
    /* ... */
  });
  app.delete("/api/cache", async (c) => {
    /* ... */
  });
};
```

### Path Parameters

```typescript
configureApp: (app) => {
  // Single parameter
  app.get("/api/users/:id", (c) => {
    const userId = c.req.param("id");
    return c.json({ userId });
  });

  // Multiple parameters
  app.get("/api/posts/:postId/comments/:commentId", (c) => {
    const postId = c.req.param("postId");
    const commentId = c.req.param("commentId");
    return c.json({ postId, commentId });
  });

  // Optional parameters with regex
  app.get("/api/files/:filename{.+\\.pdf}", (c) => {
    const filename = c.req.param("filename");
    return c.json({ pdf: filename });
  });
};
```

### Wildcards

```typescript
configureApp: (app) => {
  // Match any path after /api/
  app.get("/api/*", (c) => {
    const path = c.req.path;
    return c.json({ path });
  });
};
```

## Request Handling

### Query Parameters

```typescript
app.get("/api/search", (c) => {
  // Single value
  const query = c.req.query("q");

  // Multiple values for same key
  const tags = c.req.queries("tag");

  // All query parameters
  const allParams = c.req.query();

  return c.json({
    query,
    tags,
    allParams,
  });
});
```

### Request Body

```typescript
// JSON body
app.post("/api/json", async (c) => {
  const body = await c.req.json();
  return c.json({ received: body });
});

// Form data
app.post("/api/form", async (c) => {
  const formData = await c.req.formData();
  const name = formData.get("name");
  return c.json({ name });
});

// Text body
app.post("/api/text", async (c) => {
  const text = await c.req.text();
  return c.text(`Received: ${text}`);
});

// Raw body
app.post("/api/raw", async (c) => {
  const buffer = await c.req.arrayBuffer();
  return c.json({ size: buffer.byteLength });
});
```

### Headers

```typescript
app.get("/api/headers", (c) => {
  // Get specific header
  const auth = c.req.header("Authorization");
  const contentType = c.req.header("Content-Type");

  // Get all headers
  const headers = c.req.header();

  return c.json({ auth, contentType, headers });
});
```

## Response Types

### JSON Response

```typescript
app.get("/api/data", (c) => {
  return c.json(
    { success: true, data: { id: 1, name: "Item" } },
    200 // Optional status code
  );
});
```

### Text Response

```typescript
app.get("/api/text", (c) => {
  return c.text("Hello World", 200);
});
```

### HTML Response

```typescript
app.get("/api/html", (c) => {
  return c.html("<h1>Hello World</h1>", 200);
});
```

### File Response

```typescript
app.get("/api/file", async (c) => {
  const file = await readFile("./data.pdf");
  return c.body(file, 200, {
    "Content-Type": "application/pdf",
    "Content-Disposition": 'attachment; filename="data.pdf"',
  });
});
```

### Redirect

```typescript
app.get("/api/redirect", (c) => {
  return c.redirect("/new-location", 301);
});
```

### Custom Headers

```typescript
app.get("/api/custom", (c) => {
  c.header("X-Custom-Header", "value");
  c.header("Cache-Control", "max-age=3600");
  return c.json({ data: "with custom headers" });
});
```

## Middleware

Add middleware to your custom routes:

### Route-Specific Middleware

```typescript
import { logger } from "hono/logger";
import { compress } from "hono/compress";

configureApp: (app) => {
  // Apply to specific routes
  app.use("/api/*", logger());
  app.use("/api/*", compress());

  // Custom middleware
  app.use("/api/admin/*", async (c, next) => {
    // Check admin access
    const user = c.get("authenticatedUser");
    if (!user?.roles?.includes("admin")) {
      return c.json({ error: "Admin access required" }, 403);
    }
    await next();
  });
};
```

### Request Validation

```typescript
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().min(0).max(120),
});

configureApp: (app) => {
  app.post("/api/users", zValidator("json", userSchema), async (c) => {
    const data = c.req.valid("json");
    // data is typed and validated
    return c.json({ success: true, user: data });
  });
};
```

## Error Handling

### Try-Catch Pattern

```typescript
app.get("/api/risky", async (c) => {
  try {
    const result = await riskyOperation();
    return c.json({ success: true, data: result });
  } catch (error) {
    logger.error("Operation failed:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});
```

### Global Error Handler

```typescript
configureApp: (app) => {
  // Add error handler
  app.onError((err, c) => {
    console.error("Global error:", err);
    return c.json(
      {
        success: false,
        error: err.message,
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      },
      500
    );
  });

  // Add not found handler
  app.notFound((c) => {
    return c.json({ success: false, error: "Route not found" }, 404);
  });
};
```

## Route Groups

Organize related routes:

```typescript
configureApp: (app) => {
  // Create a sub-application
  const api = app.basePath("/api/v2");

  // User routes
  api.get("/users", listUsers);
  api.get("/users/:id", getUser);
  api.post("/users", createUser);
  api.put("/users/:id", updateUser);
  api.delete("/users/:id", deleteUser);

  // Product routes
  api.get("/products", listProducts);
  api.get("/products/:id", getProduct);
  api.post("/products", createProduct);
};
```

## Integration Examples

### Database Integration

```typescript
import { db } from "./database";

configureApp: (app) => {
  app.get("/api/items", async (c) => {
    const items = await db.query("SELECT * FROM items");
    return c.json({ success: true, data: items });
  });

  app.post("/api/items", async (c) => {
    const data = await c.req.json();
    const result = await db.insert("items", data);
    return c.json({ success: true, id: result.id }, 201);
  });
};
```

### External API Integration

```typescript
configureApp: (app) => {
  app.get("/api/weather/:city", async (c) => {
    const city = c.req.param("city");

    const response = await fetch(`https://api.weather.com/v1/weather?city=${city}`, {
      headers: { "API-Key": process.env.WEATHER_API_KEY },
    });

    const weather = await response.json();
    return c.json({ success: true, data: weather });
  });
};
```

### WebSocket Upgrade

```typescript
import { createWebSocketHandler } from "./websocket";

configureApp: (app) => {
  app.get("/api/ws", (c) => {
    // Upgrade to WebSocket
    const wsHandler = createWebSocketHandler();
    return wsHandler(c.req.raw, c.env);
  });
};
```

## Authentication for Custom Endpoints

**Important**: Custom routes added via `configureApp` are registered AFTER the authentication middleware. This means your custom routes follow the same auth rules as built-in routes.

### How Authentication Works with Custom Routes

VoltAgent applies authentication middleware before `configureApp`:

```typescript
// Authentication flow:
// 1. CORS middleware applied
// 2. Auth middleware applied (if configured)
// 3. VoltAgent built-in routes registered
// 4. configureApp called → your custom routes registered
```

### authNext (Default Behavior)

With `authNext`, custom routes are **user** routes by default. To make a route public, add it to `authNext.publicRoutes`. To make a route console-only, add it to `authNext.consoleRoutes`.

```typescript
import { DEFAULT_CONSOLE_ROUTES, jwtAuth } from "@voltagent/server-core";

new VoltAgent({
  agents: { myAgent },
  server: honoServer({
    authNext: {
      provider: jwtAuth({ secret: process.env.JWT_SECRET! }),
      publicRoutes: ["GET /api/health"],
      consoleRoutes: [...DEFAULT_CONSOLE_ROUTES, "GET /api/admin/metrics"],
    },
    configureApp: (app) => {
      // Public route
      app.get("/api/health", (c) => c.json({ status: "ok" }));

      // Console-only route
      app.get("/api/admin/metrics", (c) => c.json({ ok: true }));

      // User route (JWT required)
      app.get("/api/user/profile", (c) => {
        const user = c.get("authenticatedUser");
        return c.json({ user });
      });
    },
  }),
});
```

Notes:

- `consoleRoutes` replaces the default console list. Include `DEFAULT_CONSOLE_ROUTES` if you want the built-in console endpoints to stay console-protected.
- If `NODE_ENV` is not `"production"`, you can send `x-voltagent-dev: true` to bypass auth.

### Legacy auth (Deprecated)

Legacy `auth` uses `DEFAULT_LEGACY_PUBLIC_ROUTES` (alias `DEFAULT_PUBLIC_ROUTES`) and `PROTECTED_ROUTES`. Custom routes are public by default unless you set `defaultPrivate: true`. See [Authentication](./authentication.md) for details.

## Best Practices

### 1. Consistent Response Format

```typescript
// Create a standard response helper
const apiResponse = (success: boolean, data?: any, error?: string) => ({
  success,
  ...(data && { data }),
  ...(error && { error }),
  timestamp: new Date().toISOString(),
});

app.get("/api/example", (c) => {
  return c.json(apiResponse(true, { message: "Hello" }));
});
```

### 2. Input Validation

Always validate user input:

```typescript
app.post("/api/data", async (c) => {
  const body = await c.req.json();

  // Validate required fields
  if (!body.name || !body.email) {
    return c.json(apiResponse(false, null, "Missing required fields"), 400);
  }

  // Process valid data
  return c.json(apiResponse(true, body));
});
```

### 3. Async Error Handling

Use try-catch for async operations:

```typescript
app.get("/api/async", async (c) => {
  try {
    const result = await someAsyncOperation();
    return c.json(apiResponse(true, result));
  } catch (error) {
    logger.error("Async operation failed:", error);
    return c.json(apiResponse(false, null, "Internal server error"), 500);
  }
});
```

### 4. Rate Limiting

Protect endpoints from abuse:

```typescript
import { rateLimiter } from "hono-rate-limiter";

configureApp: (app) => {
  app.use(
    "/api/*",
    rateLimiter({
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 100, // Max requests per window
      standardHeaders: "draft-6",
      keyGenerator: (c) => c.req.header("x-forwarded-for") || "anonymous",
    })
  );
};
```

## Testing Custom Endpoints

```bash
# Test GET endpoint
curl http://localhost:3141/api/health

# Test POST with JSON
curl -X POST http://localhost:3141/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "John", "email": "john@example.com"}'

# Test with authentication
curl http://localhost:3141/api/protected \
  -H "Authorization: Bearer $TOKEN"

# Test with query parameters
curl "http://localhost:3141/api/search?q=test&limit=10"
```

## Next Steps

- Learn about [Authentication](./authentication.md) to secure custom endpoints
- Check [API Reference](./api-reference.md) for complete endpoint list
- Explore [Server Architecture](./server-architecture.md) for advanced configuration
