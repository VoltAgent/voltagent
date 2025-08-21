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
npm create voltagent-app@latest -- --example with-research-assistant
```

This example demonstrates how to build an AI-powered research assistant using VoltAgent's workflow system. It creates a multi-agent system where different AI agents collaborate to research topics and generate comprehensive reports.

## Features

- **Multi-Agent Workflow:** Shows how to orchestrate multiple agents working together to accomplish complex research tasks.
- **Exa MCP Integration:** Leverages Exa's search capabilities via Model Context Protocol for gathering research data.
- **Intelligent Query Generation:** The assistant agent formulates effective search terms for comprehensive research coverage.
- **Professional Report Writing:** The writer agent synthesizes research findings into well-structured analytical reports.
- **Type-Safe Data Flow:** Demonstrates workflow chaining with Zod schemas for runtime validation and TypeScript integration.

## Prerequisites

- Node.js (v18 or later recommended)
- pnpm (or npm/yarn)
- An OpenAI API key (or setup for another supported LLM provider)
- An Exa API key (sign up at [https://exa.ai/](https://exa.ai/))

## Setup

1. **Create Environment File:**
   Create a `.env` file in the `examples/with-research-assistant` directory:

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
   The MCP configuration in `src/index.ts` automatically uses your environment variable:

   ```typescript
   const mcpConfig = new MCPConfiguration({
     servers: {
       exa: {
         type: "stdio",
         command: "npx",
         args: ["-y", "mcp-remote", `https://mcp.exa.ai/mcp?exaApiKey=${process.env.EXA_API_KEY}`],
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
2. Find the workflow named `Research Assistant Workflow`
3. Click on the workflow to interact with it
4. Try research topics like:
   - "Latest developments in quantum computing"
   - "Impact of AI on healthcare in 2024"
   - "Sustainable energy storage solutions"
   - "Future of remote work technologies"

## How It Works

The research workflow follows these steps:

1. **Research Phase:** The assistant agent takes your topic and generates distinct search queries to gather comprehensive information
2. **Writing Phase:** The writer agent analyzes the research materials and composes a structured two-paragraph analysis

The workflow demonstrates:

- Sequential data flow between agents
- Type-safe input/output handling
- Integration with external tools via MCP
- Different LLM models for different tasks (GPT-4o-mini for research, GPT-4o for writing)
