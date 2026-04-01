---
id: recipe-creator
slug: recipe-generator
title: AI Recipe Generator Agent
description: Intelligent recipe recommendation system with MCP.
repository: https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator
---

<YouTubeEmbed url="https://youtu.be/KjV1c6AhlfY" title="AI Recipe Generator Agent Demo" />

Build an intelligent AI agent for recipe recommendations that creates personalized cooking suggestions based on available ingredients, dietary preferences, and time constraints. This example demonstrates how to build an AI agent using VoltAgent framework with MCP (Model Context Protocol) integration to access external data sources like Exa for comprehensive culinary information.

Try these prompts to interact with your recipe AI agent:

- "What’s a one-pan dinner I can make with salmon, zucchini, and quinoa?”
- “Suggest a low-carb lunch using eggs, avocado, and spinach.”
- “I need a gluten-free dinner with beef, peppers, and rice.”
- “Show me a no-bake dessert with peanut butter and oats.”
- “I only have 15 minutes—what can I make with eggs, cheese, and bread?

## Usage

### 1. Create a new VoltAgent AI agent app

Initialize a new AI agent project with the recipe creator example.

```bash
npm create voltagent-app@latest -- --example with-recipe-generator
```

You can find the source code of this example [here](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator).

### 2. Configure API keys

After signing up for Exa, get your API key from [dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys).

Create a `.env` file in your project root:

```env
OPENAI_API_KEY=your-openai-api-key
EXA_API_KEY=your-exa-api-key
```

### 3. Run the agent

Start the development server.

```bash
cd my-agent-app && npm run dev
```

Once your server starts successfully, you'll see the following output in your terminal:

```bash
════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  VoltOps Platform: https://console.voltagent.dev
════════════════════════════════════════════
[VoltAgent] All packages are up to date
```

The [VoltOps Platform](https://console.voltagent.dev) link will open automatically in your browser where you can interact with your AI agent.

## Code

```typescript
import path from "node:path";
import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";

const mcpConfig = new MCPConfiguration({
  servers: {
    exa: {
      type: "stdio",
      command: "npx",
      args: ["-y", "mcp-remote", "https://mcp.exa.ai/mcp?exaApiKey=<YOUR-API-KEY>"],
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
});
```

## How This AI Agent Works

**1. MCP Integration**: The recipe AI agent leverages MCP to connect with Exa's search API, enabling access to vast recipe databases and culinary knowledge.

**2. Intelligent Analysis**: Your AI agent analyzes available ingredients and cooking constraints to find the most suitable recipes in real-time.

**3. Personalization**: The agent adapts recommendations based on dietary preferences, cooking skill level, and time constraints.

**4. Comprehensive Output**: This AI agent provides not just recipes but complete cooking guidance including tips, substitutions, and nutritional information.

## Learn More

- [MCP Documentation](https://voltagent.dev/docs/getting-started/mcp-docs-server/)
- [VoltAgent Core Documentation](https://voltagent.dev/docs/)
- [Exa API Documentation](https://docs.exa.ai)
