/**
 * Example of integrating VoltAgent with an Express application
 *
 * This example demonstrates how to integrate VoltAgent with an existing Express application.
 *
 * To run this example:
 * 1. Install dependencies: `npm install`
 * 2. Run this example: `npm run start:express`
 */

import express from "express";
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

// Create your Express app
const app = express();
app.use(express.json());

// Set up your Express routes
app.get("/", (req, res) => {
  res.send(`
    <h1>Express + VoltAgent Integration Example</h1>
    <p>This is an Express route at port 3000</p>
    <p>VoltAgent API is running at port 3141</p>
    <h2>Test the Express routes:</h2>
    <ul>
      <li><a href="/api/info">GET /api/info</a></li>
      <li><a href="/api/time">GET /api/time</a></li>
    </ul>
    <h2>Test the VoltAgent custom endpoints:</h2>
    <ul>
      <li><a href="http://localhost:3141/custom/hello" target="_blank">GET /custom/hello</a></li>
      <li><a href="http://localhost:3141/custom/debug" target="_blank">GET /custom/debug</a></li>
    </ul>
  `);
});

app.get("/api/info", (req, res) => {
  res.json({
    name: "Express + VoltAgent Integration Example",
    description: "This is an Express route",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/time", (req, res) => {
  res.json({
    time: new Date().toISOString(),
    message: "Current server time",
  });
});

// Define custom endpoints for VoltAgent
const customEndpoints: CustomEndpointDefinition[] = [
  {
    path: "/custom/hello",
    method: "get",
    handler: (c) => {
      return c.json({
        success: true,
        message: "Hello from VoltAgent custom endpoint!",
        timestamp: new Date().toISOString(),
      });
    },
    description: "A simple hello endpoint",
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
  {
    path: "/custom/express-proxy",
    method: "get",
    handler: async (c) => {
      // This endpoint demonstrates how to proxy requests to the Express app
      try {
        // In a real application, you would use fetch or axios to make a request to the Express app
        return c.json({
          success: true,
          message: "This would proxy to the Express app",
          expressEndpoints: ["http://localhost:3000/api/info", "http://localhost:3000/api/time"],
          timestamp: new Date().toISOString(),
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
    description: "Proxy requests to the Express app",
  },
];

// Initialize VoltAgent with custom endpoints
const voltAgent = new VoltAgent({
  agents: { "my-agent": myAgent },
  customEndpoints,
  port: 3141, // Use a different port than your Express app
  autoStart: true,
});

// Start your Express app
app.listen(3000, () => {
  console.log("Express app listening on port 3000");
  console.log("VoltAgent API running on port 3141");
  console.log("\nOpen http://localhost:3000 in your browser to see the example");
});
