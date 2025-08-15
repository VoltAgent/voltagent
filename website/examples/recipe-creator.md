---
id: 1
slug: recipe-creator
title: Recipe Creator
description: Intelligent recipe recommendation system with MCP and OpenAI.
tags: [MCP, OpenAI, TypeScript, Exa]
published: true
---

Build an intelligent recipe recommendation system that creates personalized recipes based on available ingredients, dietary preferences, and cooking constraints. This example demonstrates how to integrate MCP (Model Context Protocol) servers with VoltAgent to access external data sources like Exa for comprehensive recipe information.

## Usage

### Step 1: Create a new VoltAgent app

Initialize a new project with the recipe creator example.

```bash
npm create voltagent-app@latest -- --example with-recipe-generator
```

### Step 2: Get Exa and OpenAI API keys and set environment variables

Sign up for Exa, get your API key, and configure environment variables. After signing up for Exa, go to [https://dashboard.exa.ai/api-keys](https://dashboard.exa.ai/api-keys) to get your secret key.

Create a `.env` file in your project root:

```env
OPENAI_API_KEY=your-openai-api-key
EXA_API_KEY=your-exa-api-key
```

### Step 3: Run the agent

Start the development server.

```bash
npm run dev
```

## Example Prompts

Try these prompts to get started with your recipe assistant:

- "What can I cook with chicken, rice, and vegetables in 30 minutes?"
- "Give me a vegetarian pasta recipe using mushrooms and spinach"
- "Recommend healthy breakfast ideas with oats and fruits"
- "Suggest recipes for leftover turkey and potatoes"
- "Quick dessert recipe with chocolate and bananas"

## Code

```typescript
import path from "node:path";
import { openai } from "@ai-sdk/openai";
import { Agent, MCPConfiguration, VoltAgent } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VercelAIProvider } from "@voltagent/vercel-ai";

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
  llm: new VercelAIProvider(),
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

## How It Works

1. **MCP Integration**: The recipe creator uses MCP to connect with Exa's search API, enabling access to vast recipe databases and culinary information.

2. **Intelligent Analysis**: The agent analyzes your available ingredients and constraints to find the most suitable recipes.

3. **Personalization**: Adapts recipes based on dietary preferences, cooking skill level, and time constraints.

4. **Comprehensive Output**: Provides not just recipes but complete cooking guidance including tips, substitutions, and nutritional information.

## Learn More

- [MCP Documentation](/docs/mcp/overview)
- [VoltAgent Core Documentation](/docs/agents/getting-started)
- [Exa API Documentation](https://docs.exa.ai)
