/**
 * Standalone example of using custom endpoints with VoltAgent
 *
 * This example demonstrates how to create a standalone application
 * that uses VoltAgent with custom endpoints.
 *
 * To run this example:
 * 1. Install dependencies: `npm install`
 * 2. Run this example: `npm run start:standalone`
 */

import { VoltAgent, CustomEndpointDefinition } from "../../packages/core/src";

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
            400,
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
            404,
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
          500,
        );
      }
    },
    description: "Proxy requests to the agent with additional processing",
  },
  {
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
  console.log("\nAdding a late endpoint...");
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
  console.log("Late endpoint added: GET /custom/late-addition");
}, 3000);

console.log("VoltAgent server starting...");
console.log("\nOnce the server is running, test the endpoints with the following curl commands:");
console.log("\n# Test the hello endpoint");
console.log("curl http://localhost:3141/custom/hello");
console.log("\n# Test the echo endpoint");
console.log(
  'curl -X POST -H "Content-Type: application/json" -d \'{"message":"Hello World"}\' http://localhost:3141/custom/echo',
);
console.log("\n# Test the agent proxy endpoint");
console.log(
  'curl -X POST -H "Content-Type: application/json" -d \'{"input":"What is the weather?"}\' http://localhost:3141/custom/agent-proxy',
);
console.log("\n# Test the debug endpoint");
console.log("curl http://localhost:3141/custom/debug");
console.log("\n# Test the late-addition endpoint (after 3 seconds)");
console.log("curl http://localhost:3141/custom/late-addition");
