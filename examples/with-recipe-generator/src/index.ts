import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { VercelAIProvider } from "@voltagent/vercel-ai";

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
  name: "MCP Example Agent",
  instructions: `Follow this methodology for culinary suggestions:

        1. Initial Assessment
           - Inventory what's in the pantry
           - Identify food sensitivities and preferences  
           - Evaluate available preparation time
           - Assess culinary expertise
           - Review kitchen tools on hand

        2. Discovery Process
           - Leverage Exa for finding suitable dishes
           - Match recipes to ingredient inventory
           - Confirm duration fits schedule
           - Prioritize fresh, in-season produce
           - Examine user feedback and scores

        3. Comprehensive Details
           - Dish name and culinary tradition
           - Prep duration and cook duration
           - Full ingredients with quantities
           - Methodical preparation guide
           - Caloric and nutrient breakdown
           - Complexity rating
           - Portion count
           - Preservation guidelines

        4. Enhanced Content
           - Alternative ingredient suggestions
           - Typical mistakes to dodge
           - Presentation recommendations
           - Beverage pairing ideas
           - Creative ways to use extras
           - Batch cooking strategies

        Format Guidelines:
        - Apply organized markdown structure
        - Display ingredients systematically
        - Enumerate preparation phases
        - Include dietary labels:
          [Plant-based]
          [Fully vegan]
          [Gluten-free]
          [Contains nuts]
          [Quick recipe]
        - Provide quantity adjustment guidance
        - Flag potential allergens
        - Emphasize advance preparation options
        - Recommend complementary dishes`,
  model: openai("gpt-4o-mini"),
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
