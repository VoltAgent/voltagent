<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent Custom Endpoints Example</strong><br>
Learn how to extend the VoltAgent API server with your own custom REST endpoints.
    <br />
    <br />
</div>

<div align="center">
    
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)
    
</div>

<br/>

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="VoltAgent Schema" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## VoltAgent Custom Endpoints: Extend Your API Server

This example shows how to create custom API endpoints with VoltAgent's server-hono package. You can extend the VoltAgent API server with your own business logic, data endpoints, or integration points.

## Try Example

```bash
npm create voltagent-app@latest -- --example with-custom-endpoints
```

## Features

This example includes 4 simple endpoints:

- `GET /api/health` - Health check
- `GET /api/hello/:name` - Personalized greeting with URL parameters
- `POST /api/calculate` - Simple calculator with JSON body
- `DELETE /api/delete-all` - Delete all data example

## How to Register Custom Endpoints

Custom endpoints are registered through the `configureApp` callback, which gives you full access to the Hono app instance:

```typescript
import { honoServer } from "@voltagent/server-hono";
import { jwtAuth } from "@voltagent/server-core";

new VoltAgent({
  agents: { agent },
  server: honoServer({
    port: 3141,

    // Optional: Configure CORS
    cors: {
      origin: "https://your-domain.com",
      credentials: true,
    },

    // Optional: Add authentication
    auth: jwtAuth({
      secret: process.env.JWT_SECRET,
      defaultPrivate: true, // Protect all routes by default
      publicRoutes: ["GET /api/health"], // Except these
    }),

    configureApp: (app) => {
      // Add custom routes with full Hono API
      // Note: Routes are automatically protected when auth is configured with defaultPrivate: true
      app.get("/api/health", (c) => c.json({ status: "ok" }));

      // Use route parameters
      app.get("/api/user/:id", (c) => {
        const id = c.req.param("id");
        return c.json({ userId: id });
      });

      // Add middleware
      app.use("/api/admin/*", authMiddleware);

      // Use route groups
      const api = app.basePath("/api/v2");
      api.get("/users", getUsersHandler);
    },
  }),
});
```

With `configureApp`, you get:

- Full access to Hono's routing API
- Type-safe route handlers with proper IntelliSense
- Ability to use middleware and route groups
- Support for all Hono features (OpenAPI, validation, etc.)
- **Automatic auth protection** when `auth` is configured (routes are registered AFTER auth middleware)

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` file:

```bash
echo "OPENAI_API_KEY=your_api_key_here" > .env
```

## Running

```bash
npm run dev
```

## Testing

```bash
# Health check
curl http://localhost:3141/api/health

# Greeting
curl http://localhost:3141/api/hello/john

# Calculator
curl -X POST http://localhost:3141/api/calculate \
  -H "Content-Type: application/json" \
  -d '{"a": 10, "b": 5, "operation": "add"}'

# Delete all data
curl -X DELETE http://localhost:3141/api/delete-all

# Admin stats (middleware logs the access)
curl http://localhost:3141/api/admin/stats
```

## Chat with Agent

```bash
curl -X POST http://localhost:3141/agents/agent/text \
  -H "Content-Type: application/json" \
  -d '{"input": "What endpoints are available?"}'
```

## How it Works

1. Pass a `configureApp` callback to the `honoServer` configuration
2. The callback receives the Hono app instance as a parameter
3. Use Hono's native API to register routes, middleware, and plugins
4. The server calls your `configureApp` function after registering built-in routes
5. Your custom routes are now part of the API server

That's it! 🎉
