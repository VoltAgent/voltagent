<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Escape the limitations of no-code builders and the complexity of starting from scratch.
    <br />
    <br />
</div>

<div align="center">
    
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)
    
</div>

<br/>

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="VoltAgent Schema" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## VoltAgent: Build AI Agents Fast and Flexibly

VoltAgent is an open-source TypeScript framework for creating and managing AI agents. It provides modular components to build, customize, and scale agents with ease. From connecting to APIs and memory management to supporting multiple LLMs, VoltAgent simplifies the process of creating sophisticated AI systems. It enables fast development, maintains clean code, and offers flexibility to switch between models and tools without vendor lock-in.

## Try Example

```bash
npm create voltagent-app@latest -- --example with-recipe-generator
```

This example demonstrates how to integrate VoltAgent with Exa's Model Context Protocol (MCP) server to create an intelligent recipe generator agent that can search for recipes, suggest meal ideas, and provide comprehensive culinary guidance.

## Features

- **Exa MCP Integration:** Shows how to configure `MCPConfiguration` for Exa's search capabilities via MCP server.
- **Intelligent Recipe Search:** Leverage Exa's powerful search API to find relevant recipes based on ingredients, dietary restrictions, and preferences.
- **Comprehensive Culinary Guidance:** The agent provides detailed recipe information including preparation steps, nutritional data, and cooking tips.
- **Customizable Food Preferences:** Handles dietary restrictions, allergies, and personal taste preferences.

## Prerequisites

- Node.js 22 or later
- pnpm (or npm/yarn)
- An OpenAI API key (or setup for another supported LLM provider)
- An Exa API key (sign up at [https://exa.ai/](https://exa.ai/))

## Setup

1. **Create Environment File:**
   Create a `.env` file in the `examples/with-recipe-generator` directory:

   ```env
   # .env
   OPENAI_API_KEY=your_openai_api_key_here
   EXA_API_KEY=your_exa_api_key_here
   ```

   Replace `your_openai_api_key_here` with your actual OpenAI API key and `your_exa_api_key_here` with your Exa API key.

2. **Get an Exa API Key:**
   - Visit [https://exa.ai/](https://exa.ai/)
   - Sign up for an account
   - Navigate to your dashboard to obtain your API key
   - Copy the API key for use in your configuration

3. **Configure the Exa MCP Server:**
   Update the `src/index.ts` file with your Exa API key:

   ```typescript
   const mcpConfig = new MCPConfiguration({
     servers: {
       exa: {
         type: "stdio",
         command: "npx",
         args: ["-y", "mcp-remote", "https://mcp.exa.ai/mcp?exaApiKey=YOUR_EXA_API_KEY"],
       },
     },
   });
   ```

## Running the Agent

Start the agent in development mode:

```bash
 npm run dev
# or pnpm dev / yarn dev
```

You should see logs indicating the MCP connection and tool fetching, followed by the standard VoltAgent startup message.

## Interacting with the Agent

1. Open the VoltAgent VoltOps Platform: [`https://console.voltagent.dev`](https://console.voltagent.dev)
2. Find the agent named `MCP Example Agent`
3. Click on the agent name, then click the chat icon
4. Try asking the agent for recipe suggestions:
   - "I have chicken, tomatoes, and basil. What can I make?"
   - "Find me a quick vegan dinner recipe under 30 minutes"
   - "Suggest a gluten-free dessert recipe"
   - "What's a good meal prep recipe for the week?"
