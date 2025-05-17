import { VoltAgent, type CustomEndpointDefinition } from "../../packages/core/src";
import { Context } from "hono";

// Create a simple agent
const agent = {
  id: "example-agent",
  name: "Example Agent",
  description: "An example agent for demonstrating custom endpoints",
  generateText: async (input: string) => {
    return `You said: ${input}`;
  },
  getFullState: () => ({
    id: "example-agent",
    name: "Example Agent",
    description: "An example agent for demonstrating custom endpoints",
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
    handler: (c: Context) => {
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
    handler: async (c: Context) => {
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
    handler: async (c: Context) => {
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

        // Get the VoltAgent instance
        const voltAgent = c.get("voltAgent") as VoltAgent;

        // Get the agent
        const exampleAgent = voltAgent.getAgent("example-agent");

        if (!exampleAgent) {
          return c.json(
            {
              success: false,
              error: "Agent not found",
            },
            404,
          );
        }

        // Generate text using the agent
        const response = await exampleAgent.generateText(input);

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
    description: "Proxy requests to the example agent with additional processing",
  },
];

// Initialize VoltAgent with custom endpoints
const voltAgent = new VoltAgent({
  agents: { "example-agent": agent },
  customEndpoints,
  autoStart: true,
});

// You can also register custom endpoints after initialization
voltAgent.registerCustomEndpoint({
  path: "/custom/late-addition",
  method: "get",
  handler: (c: Context) => {
    return c.json({
      success: true,
      message: "This endpoint was added after initialization",
      timestamp: new Date().toISOString(),
    });
  },
  description: "An endpoint added after initialization",
});

console.log("VoltAgent started with custom endpoints");
console.log("Try the following endpoints:");
console.log("- GET /custom/hello");
console.log("- POST /custom/echo");
console.log("- POST /custom/agent-proxy");
console.log("- GET /custom/late-addition");
