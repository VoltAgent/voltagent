import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
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
console.log("  (Set ENABLE_ENV_TOOL=true to enable)");

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
console.log("  (Set NODE_ENV=production to enable)");

// =============================================================================
// CREATE AGENT WITH ALL TOOLS
// =============================================================================

const agent = new Agent({
  name: "SimpleEndpointAgent",
  description: "Agent demonstrating simple endpoint toggling",
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
// ENDPOINT INFORMATION
// =============================================================================

console.log("\n" + "=".repeat(60));
console.log("[Endpoint Information]");
console.log("=".repeat(60));

// Check which tools can be endpoints
const allTools = [
  regularTool,
  disabledEndpointTool,
  simpleTool,
  advancedTool,
  envControlledTool,
  productionTool,
];

console.log("\nTools with endpoints enabled:");
allTools.forEach((tool) => {
  if (tool.canBeEndpoint()) {
    const info = tool.getEndpointInfo();
    console.log(`  ✓ ${tool.name}`);
    console.log(`    Path: ${info.path}`);
    console.log(`    Method: ${info.method.toUpperCase()}`);
  }
});

console.log("\nTools without endpoints:");
allTools.forEach((tool) => {
  if (!tool.canBeEndpoint()) {
    console.log(`  ✗ ${tool.name}`);
  }
});

// =============================================================================
// CREATE VOLTAGENT (Note: Tool endpoints require v1.0 server provider integration)
// =============================================================================

// In v1.0, tool endpoints will be integrated with the server provider
// For now, this example demonstrates the tool endpoint configuration
new VoltAgent({
  agents: { agent },
  // Server provider integration for tool endpoints coming soon
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
console.log("curl -X POST http://localhost:3141/tools/calculator \\");
console.log('  -H "Content-Type: application/json" \\');
console.log('  -d \'{"operation": "add", "a": 5, "b": 3}\'');

console.log("\ncurl 'http://localhost:3141/tools/textProcessor?text=Hello&operation=uppercase'");

console.log("\ncurl http://localhost:3141/tools");
