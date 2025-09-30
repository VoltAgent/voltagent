import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool, generateEndpointsFromTools } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

console.log("[Simple Tool Endpoints] Demo - Endpoints as a Toggle");
console.log("=".repeat(60));

// =============================================================================
// EXAMPLE 1: Regular Tool (No Endpoint)
// =============================================================================

const regularTool = createTool({
  name: "regularTool",
  description: "A regular tool without endpoint capability",
  parameters: z.object({
    input: z.string(),
  }),
  execute: async ({ input }) => {
    return { output: `Regular: ${input}` };
  },
  // No endpoint config = no endpoint generated
});

console.log(`\n[Tool 1] ${regularTool.name}`);
console.log(`  Endpoint enabled: ${regularTool.canBeEndpoint()}`); // false

// =============================================================================
// EXAMPLE 2: Tool with Endpoint DISABLED (Explicit)
// =============================================================================

const disabledEndpointTool = createTool({
  name: "disabledTool",
  description: "Tool with endpoint explicitly disabled",
  parameters: z.object({
    input: z.string(),
  }),
  execute: async ({ input }) => {
    return { output: `Disabled: ${input}` };
  },
  endpoint: {
    enabled: false, // Explicitly disabled
  },
});

console.log(`\n[Tool 2] ${disabledEndpointTool.name}`);
console.log(`  Endpoint enabled: ${disabledEndpointTool.canBeEndpoint()}`); // false

// =============================================================================
// EXAMPLE 3: Tool with Endpoint ENABLED (Simple)
// =============================================================================

const simpleTool = createTool({
  name: "calculator",
  description: "Perform mathematical calculations",
  parameters: z.object({
    operation: z.enum(["add", "subtract", "multiply", "divide"]),
    a: z.number(),
    b: z.number(),
  }),
  execute: async ({ operation, a, b }) => {
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
    }
    return { result, operation, a, b };
  },
  endpoint: {
    enabled: true, // Just toggle it on!
  },
});

console.log(`\n[Tool 3] ${simpleTool.name}`);
console.log(`  Endpoint enabled: ${simpleTool.canBeEndpoint()}`); // true

// =============================================================================
// EXAMPLE 4: Tool with Endpoint + Custom Configuration
// =============================================================================

const advancedTool = createTool({
  name: "textProcessor",
  description: "Process text with various operations",
  parameters: z.object({
    text: z.string(),
    operation: z.enum(["uppercase", "lowercase", "reverse", "length"]),
  }),
  execute: async ({ text, operation }) => {
    let result: string | number;
    switch (operation) {
      case "uppercase":
        result = text.toUpperCase();
        break;
      case "lowercase":
        result = text.toLowerCase();
        break;
      case "reverse":
        result = text.split("").reverse().join("");
        break;
      case "length":
        result = text.length;
        break;
    }
    return { result, operation, originalText: text };
  },
  endpoint: {
    enabled: true, // Toggle on
    method: "post",
    supportsGet: true, // Also allow GET requests
    responseTransformer: (result, context) => ({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    }),
  },
});

console.log(`\n[Tool 4] ${advancedTool.name}`);
console.log(`  Endpoint enabled: ${advancedTool.canBeEndpoint()}`); // true
console.log(`  Supports GET: ${advancedTool.endpoint?.supportsGet}`); // true

// =============================================================================
// EXAMPLE 5: Tool with Environment-Based Toggle
// =============================================================================

const envControlledTool = createTool({
  name: "envTool",
  description: "Tool controlled by environment variable",
  parameters: z.object({
    input: z.string(),
  }),
  execute: async ({ input }) => {
    return { output: `Env: ${input}` };
  },
  endpoint: {
    enabled: process.env.ENABLE_ENV_TOOL === "true", // Environment toggle
  },
});

console.log(`\n[Tool 5] ${envControlledTool.name}`);
console.log(`  Endpoint enabled: ${envControlledTool.canBeEndpoint()}`);
console.log(`  (Set ENABLE_ENV_TOOL=true to enable)`);

// =============================================================================
// EXAMPLE 6: Tool with Production-Only Endpoint
// =============================================================================

const productionTool = createTool({
  name: "prodTool",
  description: "Tool only available in production",
  parameters: z.object({
    input: z.string(),
  }),
  execute: async ({ input }) => {
    return { output: `Production: ${input}` };
  },
  endpoint: {
    enabled: process.env.NODE_ENV === "production", // Production-only toggle
  },
});

console.log(`\n[Tool 6] ${productionTool.name}`);
console.log(`  Endpoint enabled: ${productionTool.canBeEndpoint()}`);
console.log(`  (Set NODE_ENV=production to enable)`);

// =============================================================================
// CREATE AGENT WITH ALL TOOLS
// =============================================================================

const agent = new Agent({
  name: "SimpleEndpointAgent",
  description: "Agent demonstrating simple endpoint toggling",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [
    regularTool,
    disabledEndpointTool,
    simpleTool,
    advancedTool,
    envControlledTool,
    productionTool,
  ],
});

// =============================================================================
// GENERATE ENDPOINTS (Only for tools with enabled: true)
// =============================================================================

console.log("\n" + "=".repeat(60));
console.log("[Endpoint Generation]");
console.log("=".repeat(60));

// Pass the original tools array (not agent.getTools()) to preserve endpoint methods
const allTools = [
  regularTool,
  disabledEndpointTool,
  simpleTool,
  advancedTool,
  envControlledTool,
  productionTool,
];

const endpoints = generateEndpointsFromTools(allTools, {
  basePath: "/api/tools",
  includeBatch: true,
  includeListing: true,
});

console.log(`\nGenerated ${endpoints.length} endpoints:`);
endpoints.forEach((endpoint) => {
  console.log(`  ${endpoint.method.toUpperCase().padEnd(6)} ${endpoint.path}`);
});

// =============================================================================
// CREATE VOLTAGENT
// =============================================================================

const voltAgent = new VoltAgent({
  agents: { agent },
  customEndpoints: endpoints,
});

// =============================================================================
// SUMMARY
// =============================================================================

console.log("\n" + "=".repeat(60));
console.log("[Summary]");
console.log("=".repeat(60));
console.log("\nSimplified Approach:");
console.log("- Just add 'endpoint: { enabled: true }' to createTool()");
console.log("- No separate createEnhancedTool() needed");
console.log("- No withEndpoint() decorator needed");
console.log("- Same createTool() for everything");
console.log("- Endpoints are OFF by default");
console.log("- Toggle them on when needed");

console.log("\nTool Status:");
console.log(`  ${regularTool.name}: ${regularTool.canBeEndpoint() ? "ON" : "OFF"}`);
console.log(
  `  ${disabledEndpointTool.name}: ${disabledEndpointTool.canBeEndpoint() ? "ON" : "OFF"}`,
);
console.log(`  ${simpleTool.name}: ${simpleTool.canBeEndpoint() ? "ON" : "OFF"}`);
console.log(`  ${advancedTool.name}: ${advancedTool.canBeEndpoint() ? "ON" : "OFF"}`);
console.log(`  ${envControlledTool.name}: ${envControlledTool.canBeEndpoint() ? "ON" : "OFF"}`);
console.log(`  ${productionTool.name}: ${productionTool.canBeEndpoint() ? "ON" : "OFF"}`);

console.log("\n[Server] Started on http://localhost:3141");
console.log("\nExample Usage:");
console.log("curl -X POST http://localhost:3141/api/tools/calculator \\");
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"operation": "add", "a": 5, "b": 3}\'');

console.log(
  "\ncurl 'http://localhost:3141/api/tools/textProcessor?text=Hello&operation=uppercase'",
);

console.log("\ncurl http://localhost:3141/api/tools");
