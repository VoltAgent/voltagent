# Custom Endpoints Feature for VoltAgent

This document describes the implementation of the custom endpoints feature for VoltAgent, which allows developers to extend the VoltAgent API server with their own custom endpoints.

## Overview

The custom endpoints feature allows developers to:

1. Register custom HTTP endpoints with the VoltAgent API server
2. Define handlers for these endpoints
3. Add endpoints during initialization or after the server has started
4. Integrate with the existing VoltAgent middleware and error handling
5. Create specialized endpoints that interact with agents

## Implementation Details

### 1. Custom Endpoint Types and Validation

The feature defines several types and validation functions for custom endpoints:

```typescript
// HTTP methods supported by custom endpoints
export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "options" | "head";

// Handler function for custom endpoints
export type CustomEndpointHandler = (c: Context) => Promise<Response> | Response;

// Definition for a custom endpoint
export interface CustomEndpointDefinition {
  // The path for the endpoint, relative to the API root
  path: string;

  // The HTTP method for the endpoint
  method: HttpMethod;

  // The handler function for the endpoint
  handler: CustomEndpointHandler;

  // Optional description for the endpoint
  description?: string;
}
```

Validation is performed using Zod schemas to ensure that custom endpoints are properly defined:

```typescript
// Schema for validating custom endpoint definitions
export const CustomEndpointSchema = z.object({
  path: z.string().startsWith("/"),
  method: z.enum(["get", "post", "put", "patch", "delete", "options", "head"]),
  handler: z.function().args(z.any()).returns(z.any()),
  description: z.string().optional(),
});
```

### 2. Server Integration

The feature integrates with the VoltAgent server by providing functions to register custom endpoints:

```typescript
// Register a single custom endpoint
export function registerCustomEndpoint(endpoint: CustomEndpointDefinition): void {
  // Validate and register the endpoint with the Hono app
}

// Register multiple custom endpoints
export function registerCustomEndpoints(endpoints: CustomEndpointDefinition[]): void {
  // Validate and register all endpoints
}
```

### 3. VoltAgent Class Integration

The VoltAgent class is extended to support custom endpoints:

```typescript
// VoltAgent constructor options
type VoltAgentOptions = {
  // ... existing options

  /**
   * Optional array of custom endpoint definitions to register with the API server
   */
  customEndpoints?: CustomEndpointDefinition[];
};

// VoltAgent class methods
class VoltAgent {
  // ... existing methods

  /**
   * Register a custom endpoint with the API server
   */
  public registerCustomEndpoint(endpoint: CustomEndpointDefinition): void {
    // Add to internal list and register if server is running
  }

  /**
   * Register multiple custom endpoints with the API server
   */
  public registerCustomEndpoints(endpoints: CustomEndpointDefinition[]): void {
    // Add to internal list and register if server is running
  }
}
```

## Usage Examples

### 1. Adding Custom Endpoints During Initialization

```typescript
import { VoltAgent, CustomEndpointDefinition } from "@voltagent/core";

// Define custom endpoints
const customEndpoints: CustomEndpointDefinition[] = [
  {
    path: "/custom/hello",
    method: "get",
    handler: (c) => {
      return c.json({
        success: true,
        message: "Hello from custom endpoint!",
        timestamp: new Date().toISOString(),
      });
    },
    description: "A simple hello endpoint",
  },
  {
    path: "/custom/echo",
    method: "post",
    handler: async (c) => {
      const body = await c.req.json();
      return c.json({
        success: true,
        data: body,
        message: "Echo from custom endpoint",
        timestamp: new Date().toISOString(),
      });
    },
    description: "Echo back the request body",
  },
];

// Initialize VoltAgent with custom endpoints
const voltAgent = new VoltAgent({
  agents: {
    /* your agents */
  },
  customEndpoints,
  autoStart: true,
});
```

### 2. Adding Custom Endpoints After Initialization

```typescript
// Add a single custom endpoint after initialization
voltAgent.registerCustomEndpoint({
  path: "/custom/late-addition",
  method: "get",
  handler: (c) => {
    return c.json({
      success: true,
      message: "This endpoint was added after initialization",
      timestamp: new Date().toISOString(),
    });
  },
  description: "An endpoint added after initialization",
});
```

### 3. Creating an Agent Proxy Endpoint

```typescript
// Create a proxy endpoint that uses an agent
voltAgent.registerCustomEndpoint({
  path: "/custom/agent-proxy",
  method: "post",
  handler: async (c) => {
    try {
      const { input } = await c.req.json();

      if (!input || typeof input !== "string") {
        return c.json(
          {
            success: false,
            error: "Input is required and must be a string",
          },
          400
        );
      }

      // Get the agent
      const agent = voltAgent.getAgent("my-agent");

      if (!agent) {
        return c.json(
          {
            success: false,
            error: "Agent not found",
          },
          404
        );
      }

      // Generate text using the agent
      const response = await agent.generateText(input);

      return c.json({
        success: true,
        data: {
          response,
          processed: true,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      return c.json(
        {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        500
      );
    }
  },
  description: "Proxy requests to an agent with additional processing",
});
```

## Error Handling

The feature includes robust error handling:

```typescript
// Custom error class for endpoint-related errors
export class CustomEndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CustomEndpointError";
  }
}

// Error handling in endpoint registration
try {
  // Register endpoint
} catch (error) {
  console.error(
    `Failed to register custom endpoint: ${error instanceof Error ? error.message : String(error)}`
  );
  throw error;
}
```

## Testing

The feature includes a test script that demonstrates how to use custom endpoints and verifies that they work correctly.

## Using Custom Endpoints with a Built VoltAgent Application

This section provides a complete guide on how to add custom endpoints to a built VoltAgent application.

### Creating a Standalone Application

Here's a complete example of how to create a standalone application with custom endpoints:

```typescript
// my-voltagent-app.ts
import { VoltAgent, CustomEndpointDefinition } from "@voltagent/core";

// Define your agent(s)
const myAgent = {
  id: "my-agent",
  name: "My Agent",
  description: "A simple agent for testing",
  generateText: async (input: string) => {
    return `You said: ${input}`;
  },
  getFullState: () => ({
    id: "my-agent",
    name: "My Agent",
    description: "A simple agent for testing",
    status: "idle",
    model: "example-model",
    tools: [],
    subAgents: [],
  }),
  getToolsForApi: () => [],
  getSubAgents: () => [],
};

// Define custom endpoints
const customEndpoints: CustomEndpointDefinition[] = [
  {
    path: "/custom/hello",
    method: "get",
    handler: (c) => {
      return c.json({
        success: true,
        message: "Hello from custom endpoint!",
        timestamp: new Date().toISOString(),
      });
    },
    description: "A simple hello endpoint",
  },
  {
    path: "/custom/echo",
    method: "post",
    handler: async (c) => {
      const body = await c.req.json();
      return c.json({
        success: true,
        data: body,
        message: "Echo from custom endpoint",
        timestamp: new Date().toISOString(),
      });
    },
    description: "Echo back the request body",
  },
  {
    path: "/custom/agent-proxy",
    method: "post",
    handler: async (c) => {
      try {
        const { input } = await c.req.json();

        if (!input || typeof input !== "string") {
          return c.json(
            {
              success: false,
              error: "Input is required and must be a string",
            },
            400
          );
        }

        // Get the agent
        const agent = voltAgent.getAgent("my-agent");

        if (!agent) {
          return c.json(
            {
              success: false,
              error: "Agent not found",
            },
            404
          );
        }

        // Generate text using the agent
        const response = await agent.generateText(input);

        return c.json({
          success: true,
          data: {
            response,
            processed: true,
            timestamp: new Date().toISOString(),
          },
        });
      } catch (error) {
        return c.json(
          {
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          },
          500
        );
      }
    },
    description: "Proxy requests to the agent with additional processing",
  },
];

// Initialize VoltAgent with custom endpoints
const voltAgent = new VoltAgent({
  agents: { "my-agent": myAgent },
  customEndpoints,
  autoStart: true, // This will automatically start the server
});

// You can also add endpoints after initialization
setTimeout(() => {
  console.log("Adding a late endpoint...");
  voltAgent.registerCustomEndpoint({
    path: "/custom/late-addition",
    method: "get",
    handler: (c) => {
      return c.json({
        success: true,
        message: "This endpoint was added after initialization",
        timestamp: new Date().toISOString(),
      });
    },
    description: "An endpoint added after initialization",
  });
}, 3000);

console.log("VoltAgent server starting...");
```

### Running the Application

#### If using TypeScript:

```bash
# Install dependencies
npm install @voltagent/core typescript ts-node

# Run the application
npx ts-node my-voltagent-app.ts
```

#### If using JavaScript:

```bash
# Install dependencies
npm install @voltagent/core

# Run the application
node my-voltagent-app.js
```

### Testing the Custom Endpoints

Once the server is running, you can test your custom endpoints using curl or any HTTP client:

```bash
# Test the hello endpoint
curl http://localhost:1337/custom/hello

# Test the echo endpoint
curl -X POST -H "Content-Type: application/json" -d '{"message":"Hello World"}' http://localhost:1337/custom/echo

# Test the agent proxy endpoint
curl -X POST -H "Content-Type: application/json" -d '{"input":"What is the weather?"}' http://localhost:1337/custom/agent-proxy

# Test the late-addition endpoint (after 3 seconds)
curl http://localhost:1337/custom/late-addition
```

### Integration with an Existing Application

If you're integrating VoltAgent with an existing application, you can modify the above approach to fit your needs:

```typescript
import express from "express";
import { VoltAgent, CustomEndpointDefinition } from "@voltagent/core";

// Create your Express app
const app = express();
app.use(express.json());

// Set up your Express routes
app.get("/api/some-route", (req, res) => {
  res.json({ message: "This is an Express route" });
});

// Initialize VoltAgent with custom endpoints
const voltAgent = new VoltAgent({
  agents: {
    /* your agents */
  },
  customEndpoints: [
    {
      path: "/custom/hello",
      method: "get",
      handler: (c) => {
        return c.json({
          success: true,
          message: "Hello from VoltAgent custom endpoint!",
        });
      },
    },
  ],
  port: 3141, // Use a different port than your Express app
  autoStart: true,
});

// Start your Express app
app.listen(3000, () => {
  console.log("Express app listening on port 3000");
});
```

### Debugging Custom Endpoints

If you encounter issues with your custom endpoints, you can add logging to help debug:

```typescript
const debugEndpoint: CustomEndpointDefinition = {
  path: "/custom/debug",
  method: "get",
  handler: (c) => {
    console.log("Debug endpoint called");
    console.log("Request headers:", c.req.headers);
    console.log("Request URL:", c.req.url);

    return c.json({
      success: true,
      message: "Debug information logged to console",
      timestamp: new Date().toISOString(),
    });
  },
  description: "Debug endpoint for logging request information",
};

// Add this endpoint to your customEndpoints array
customEndpoints.push(debugEndpoint);
```

## Conclusion

The custom endpoints feature provides a flexible and powerful way to extend the VoltAgent API server with custom functionality. It follows the existing VoltAgent architecture and coding style, making it easy to integrate with existing applications.
