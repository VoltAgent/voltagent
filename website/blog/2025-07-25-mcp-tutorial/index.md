---
title: MCP Tutorial - Connect Your AI Agent to Any External System
description: Learn how to use Model Context Protocol (MCP) to give your VoltAgent access to external systems like GitHub, databases, and AI models with simple plug-and-play integration.
slug: llm-mcp-tutorial
image: https://cdn.voltagent.dev/2025-07-25-mcp-tutorial/social.png
authors: omeraplak
---

import ZoomableMermaid from '@site/src/components/blog-widgets/ZoomableMermaid';

# MCP Tutorial: Connect Your AI Agent to Any External System

Building AI agents is exciting until you realize they're isolated from the real world. Most agents can process text and use basic tools, but they can't access files, databases, or external APIs that developers actually need.

This tutorial will show you how Model Context Protocol (MCP) solves this problem by providing a universal standard for connecting AI agents to external systems.

## The Isolation Problem in AI Development

Standard AI agents face significant limitations when it comes to external system access. They can't:

- Read or write files on your computer
- Access GitHub repositories or databases
- Query external APIs or services
- Integrate with the tools developers use daily

Traditional solutions require building custom integrations for each service - writing authentication logic, handling rate limits, and maintaining separate connections. This approach doesn't scale and creates maintenance overhead.

MCP provides a standardized protocol that allows AI agents to connect to any external system through a unified interface.

## Understanding MCP: The Universal Connector

Model Context Protocol is just the USB protocol for AI agents. Just as USB makes it so you can stick any device into any computer, MCP makes it so that you can connect any agent to any external service through a standardized interface.

The architecture is beautifully simple:

- **MCP Servers** expose external services (files, databases, APIs)
- **MCP Clients** (your VoltAgent) reach out to them
- **Everything happens securely** with proper authentication

Here's how the communication flows between all components:

![mcp tutorial diagram](https://cdn.voltagent.dev/2025-07-25-mcp-tutorial/mcp-diagram.png)

This sequence shows how seamlessly MCP coordinates between different services - your agent can use local filesystem tools and remote AI models in a single workflow, all through the same standardized protocol.

## Building an MCP-Enabled Agent

Let's build a practical example by creating a weather agent with file system access through MCP. This demonstrates how to add external capabilities to any AI agent.

```typescript
import { VoltAgent, Agent, createTool, MCPConfiguration } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import path from "node:path";

// Simple weather functionality
const weatherTool = createTool({
  name: "get_weather",
  description: "Get current weather for any city",
  parameters: z.object({
    location: z.string().describe("City and state, e.g. New York, NY"),
  }),
  execute: async ({ location }) => {
    console.log(`Fetching weather data for ${location}...`);
    if (location.toLowerCase().includes("new york")) {
      return { temperature: "18°C", condition: "Partly cloudy" };
    }
    return { temperature: "24°C", condition: "Sunny" };
  },
});

// Here's where MCP magic happens
const mcpConfig = new MCPConfiguration({
  servers: {
    filesystem: {
      type: "stdio",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        path.join(process.env.HOME || "", "Desktop"),
      ],
      cwd: process.env.HOME,
      timeout: 10000,
    },
  },
});

(async () => {
  const mcpTools = await mcpConfig.getTools();

  const agent = new Agent({
    name: "weather-file-agent",
    instructions: `You're a weather assistant with file management capabilities. 
    You can check weather conditions and save reports to files for future reference.
    When users ask for weather, consider offering to save the information.`,
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    tools: [weatherTool, ...mcpTools],
  });

  new VoltAgent({ agents: { agent } });
})();
```

Let me break down what's happening in this code:

**The Weather Tool**: This is our basic function that simulates getting weather data. It's a simple tool that returns temperature and conditions based on the location.

**MCP Configuration**: The real magic happens here. We're telling VoltAgent to connect to a filesystem MCP server via `stdio` (standard input/output). The server runs through `npx` and gives our agent access to file operations on the Desktop directory.

**Tool Integration**: The `mcpConfig.getTools()` call discovers all available MCP tools (like `read_file`, `write_file`, `list_directory`) and we combine them with our weather tool using the spread operator `...mcpTools`.

**Agent Setup**: Finally, we create an agent that understands it can both check weather AND manage files. The instructions tell it to offer file saving when appropriate.

With minimal configuration, the agent now has file system capabilities in addition to weather functionality. The MCP integration automatically provides tools like `read_file`, `write_file`, and `list_directory`.

## MCP in Action

Here's how the agent uses MCP filesystem tools in a real interaction:

![MCP Filesystem Demo](https://cdn.voltagent.dev/docs/mco-demo.gif)

_Agent seamlessly combining weather data with file operations_

The key advantage is how naturally the agent integrates multiple capabilities. It doesn't just have file access - it intelligently uses these tools to enhance weather reporting, save data, and organize information without requiring explicit instructions for each operation.

## Scaling Up: Remote AI Models over HTTP MCP

Beyond local file access, MCP also supports HTTP connections to remote services. This opens up access to cloud-based AI models and external APIs. Let's add Hugging Face's AI model ecosystem to our agent.

First, obtain a free API token from [Hugging Face](https://huggingface.co/settings/tokens) and add it to your environment:

```bash
HUGGING_FACE_TOKEN=hf_your_token_here
```

Next, configure the enhanced MCP setup with both local and remote capabilities:

```typescript
const enhancedMCPConfig = new MCPConfiguration({
  servers: {
    // Keep the filesystem access
    filesystem: {
      type: "stdio",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        path.join(process.env.HOME || "", "Desktop"),
      ],
      cwd: process.env.HOME,
      timeout: 10000,
    },
    // Add remote AI capabilities
    huggingface: {
      url: "https://huggingface.co/mcp",
      requestInit: {
        headers: {
          Authorization: `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
        },
      },
      type: "http",
      timeout: 30000,
    },
  },
});

(async () => {
  const allTools = await enhancedMCPConfig.getTools();

  const superAgent = new Agent({
    name: "multi-capability-agent",
    instructions: `You're an advanced assistant with multiple capabilities:
    
    🌤️ Weather: Get current conditions for any location
    📁 Files: Read, write, and organize documents
    🎨 AI Models: Generate images, translate text, analyze content
    
    You can combine these abilities creatively. For example:
    - Generate weather-themed images
    - Translate weather reports to different languages  
    - Create illustrated weather summaries
    
    Always explain what you're doing and suggest creative combinations.`,
    llm: new VercelAIProvider(),
    model: openai("gpt-4o-mini"),
    tools: [weatherTool, ...allTools],
  });

  new VoltAgent({ agents: { superAgent } });
})();
```

Here's what's new in this enhanced setup:

**HTTP MCP Server**: Unlike the filesystem server that runs locally via `stdio`, the Hugging Face server connects over HTTP. We specify the URL and authentication headers with our API token. The `type: "http"` tells VoltAgent this is a remote connection.

**Dual Server Configuration**: Now we have both servers running simultaneously - the local filesystem server AND the remote Hugging Face server. Each provides different tools that our agent can use.

**Enhanced Agent Instructions**: The agent now knows it has three main capabilities: weather checking, file management, and AI model access. The instructions specifically encourage creative combinations of these tools.

**Tool Discovery**: `allTools` now contains tools from BOTH servers - file operations (read_file, write_file) AND AI capabilities (generate_image, translate_text). The agent can use any of these tools as needed.

**Authorization**: The HTTP MCP handles authentication automatically using the Bearer token we provided, so our agent can access Hugging Face models securely.

## Testing the Enhanced Agent

The enhanced agent can now handle complex multi-capability requests that combine weather, file operations, and AI model access:

**Creative Weather Reports:**

> "Check the weather in Tokyo and draw an image of those conditions"

**Multilingual Content:**

> "Get the weather report for Barcelona and write it out in Spanish with images"

**Data Analysis:**

> "Process the weather trends in my saved reports and output a summary image"

![HTTP MCP Demo](https://cdn.voltagent.dev/docs/tutorial/mcp-hugging-face-demo.gif)

_Agent coordinating local file operations with remote AI services_

The agent seamlessly orchestrates between local file operations and remote AI model inference, demonstrating how MCP enables complex workflows across multiple systems.

## What This Means for AI Development

MCP represents a paradigm shift in AI application development. Instead of building isolated agents with limited capabilities, developers can now create connected agents that access the entire ecosystem of available tools and services.

**Immediate Benefits:**

- **Zero infrastructure overhead** - no need to host AI models
- **Instant access to cutting-edge capabilities** - new models are available immediately
- **Composable functionality** - mix and match capabilities as needed
- **Future-proof architecture** - new MCP servers extend your agent automatically

**Long-term Impact:**

- AI agents become integration platforms rather than standalone applications
- Development speed increases dramatically
- Innovation shifts from building basic capabilities to orchestrating complex workflows
- The barrier to entry for sophisticated AI applications drops significantly

## Next Steps

To implement MCP in your own AI agents, explore the [VoltAgent MCP directory](https://voltagent.dev/mcp/) which contains ready-to-use configurations for dozens of services. Whether you need database access, social media integration, or specialized AI models, there's likely an MCP server already available.

The examples in this tutorial demonstrate basic MCP integration. The real power emerges when combining multiple MCP servers to create workflows that would be complex to build with custom integrations.

MCP transforms how we think about AI agent capabilities - shifting from "what can my agent do?" to "what external systems should it connect to?" This architectural approach makes sophisticated AI applications accessible with minimal configuration effort.
