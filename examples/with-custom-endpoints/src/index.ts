import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, registerCustomEndpoints } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Simple endpoint examples - Part 1: Register via function call
const endpointsViaFunction = [
  // Health check
  {
    path: "/api/health",
    method: "get" as const,
    handler: async (c: any) => {
      return c.json({
        success: true,
        data: {
          status: "healthy",
          timestamp: new Date().toISOString(),
        },
      });
    },
  },

  // Hello endpoint
  {
    path: "/api/hello/:name",
    method: "get" as const,
    handler: async (c: any) => {
      const name = c.req.param("name");
      return c.json({
        success: true,
        data: {
          message: `Hello ${name}!`,
          timestamp: new Date().toISOString(),
        },
      });
    },
  },
];

// Simple endpoint examples - Part 2: Register via VoltAgent constructor
const endpointsViaConstructor = [
  // Simple calculator
  {
    path: "/api/calculate",
    method: "post" as const,
    handler: async (c: any) => {
      try {
        const { a, b, operation } = await c.req.json();

        let result: number | string;
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
            result = b !== 0 ? a / b : "Cannot divide by zero";
            break;
          default:
            throw new Error("Invalid operation");
        }

        return c.json({
          success: true,
          data: {
            a,
            b,
            operation,
            result,
          },
        });
      } catch {
        return c.json(
          {
            success: false,
            error: "Invalid input",
          },
          400,
        );
      }
    },
  },

  // Additional example endpoint
  {
    handler: async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: { message: "All data deleted successfully" },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
    method: "delete" as const,
    path: "/api/delete-all",
    description: "delete all data",
  },
];

// Create the agent
const agent = new Agent({
  name: "Simple Custom Endpoints Agent",
  description:
    "You are a helpful assistant with access to simple custom endpoints: /api/health, /api/hello/:name, /api/calculate, and /api/delete-all",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Method 1: Register endpoints using the function call
// This is useful when you want to register endpoints before creating VoltAgent
// or when you want to register endpoints conditionally
registerCustomEndpoints(endpointsViaFunction);

// Method 2: Register endpoints via VoltAgent constructor
// This is the most common and convenient way to register endpoints
// Both methods work together - all endpoints will be registered and displayed
new VoltAgent({
  agents: {
    agent,
  },
  customEndpoints: endpointsViaConstructor,
});
