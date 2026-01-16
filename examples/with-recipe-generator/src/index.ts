import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

const mcpConfig = new MCPConfiguration({
  servers: {
    exa: {
      type: "stdio",
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.exa.ai/mcp?exaApiKey=<YOUR_EXA_API_KEY>"],
    },
  },
});

const agent = new Agent({
  name: "Recipe Assistant",
  description: `You are a culinary expert AI assistant. Help users create delicious recipes.

        Core Capabilities:
        • Analyze available ingredients and suggest recipes
        • Account for dietary preferences and restrictions  
        • Optimize for preparation time and complexity
        • Provide detailed nutritional information
        • Suggest ingredient substitutions

        Recipe Process:
        1. Ingredient Analysis - Review what's available
        2. Recipe Search - Find matching recipes using Exa
        3. Customization - Adapt to user preferences
        4. Instructions - Provide clear, step-by-step guidance

        Output Format:
        • Recipe name and cuisine type
        • Prep and cook times
        • Ingredient list with measurements
        • Numbered cooking steps
        • Nutritional facts per serving
        • Storage and reheating tips

        Special Indicators:
        [Vegetarian] [Vegan] [Gluten-free]
        [Contains nuts] [Quick: under 30 min]
        
        Always include:
        - Difficulty level
        - Serving size adjustments
        - Common mistakes to avoid
        - Pairing suggestions`,
  model: "openai/gpt-4o-mini",
  tools: await mcpConfig.getTools(),
});

// Create logger
const logger = createPinoLogger({
  name: "with-mcp",
  level: "info",
});

new VoltAgent({
  agents: {
    agent,
  },
  logger,
  server: honoServer({ port: 3141 }),
});
