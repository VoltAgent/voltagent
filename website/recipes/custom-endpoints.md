---
id: custom-endpoints
title: Custom Endpoints
slug: custom-endpoints
description: Add custom API routes alongside your VoltAgent server.
---

# Custom Endpoints

Add your own REST API endpoints to the VoltAgent server using Hono's routing.

## Quick Setup

```typescript
import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";

const agent = new Agent({
  name: "API Agent",
  instructions: "A helpful assistant",
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { agent },
  server: honoServer({
    port: 3141,
    configureApp: (app) => {
      // Health check
      app.get("/api/health", (c) => {
        return c.json({ status: "ok", timestamp: new Date().toISOString() });
      });

      // Dynamic route
      app.get("/api/hello/:name", (c) => {
        const name = c.req.param("name");
        return c.json({ message: `Hello ${name}!` });
      });

      // POST endpoint
      app.post("/api/calculate", async (c) => {
        const { a, b, operation } = await c.req.json();

        let result: number;
        switch (operation) {
          case "add":
            result = a + b;
            break;
          case "subtract":
            result = a - b;
            break;
          case "multiply":
            result = a * b;
            break;
          case "divide":
            result = a / b;
            break;
          default:
            return c.json({ error: "Invalid operation" }, 400);
        }

        return c.json({ result });
      });

      // DELETE endpoint
      app.delete("/api/items/:id", (c) => {
        const id = c.req.param("id");
        return c.json({ deleted: id });
      });
    },
  }),
});
```

## Using Middleware

```typescript
configureApp: (app) => {
  // Apply middleware to route group
  app.use("/api/admin/*", async (c, next) => {
    const token = c.req.header("Authorization");
    if (!token) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    await next();
  });

  // Protected admin route
  app.get("/api/admin/stats", (c) => {
    return c.json({
      totalRequests: 1000,
      activeUsers: 42,
    });
  });
};
```

## Accessing Request Data

```typescript
app.post("/api/data", async (c) => {
  // Query params
  const page = c.req.query("page");

  // Route params
  const id = c.req.param("id");

  // Headers
  const auth = c.req.header("Authorization");

  // Body
  const body = await c.req.json();

  return c.json({ received: body });
});
```

## Error Handling

```typescript
app.post("/api/process", async (c) => {
  try {
    const data = await c.req.json();
    // Process data...
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: "Invalid request" }, 400);
  }
});
```

## Full Example

See the complete example: [with-custom-endpoints on GitHub](https://github.com/VoltAgent/voltagent/tree/main/examples/with-custom-endpoints)
