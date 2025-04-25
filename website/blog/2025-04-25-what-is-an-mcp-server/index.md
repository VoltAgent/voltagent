---
title: What's MCP and Why Should I Care?
description: Learn about the Model Context Protocol (MCP) and how it helps AI agents like VoltAgent interact with external tools, with a practical example.
slug: what-is-mcp
tags: [mcp]
authors: omeraplak
image: https://cdn.voltagent.dev/2025-04-25-what-is-an-mcp-server/social.png
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import GitHubExampleLink from '@site/src/components/blog-widgets/GitHubExampleLink';

## Introduction

Ever built an AI agent and wondered how it actually _does_ stuff in the real world? Like, how does it browse the web, read a file from your computer, or talk to a database?

It turns out a key piece of the puzzle is something called the **Model Context Protocol**, or **MCP**. It sounds technical, but the core idea is pretty neat and solves a big problem.

In this post, I'll walk you through:

- [What is MCP](#what-is-mcp)
- [Why Should I Care About MCP?](#why-should-i-care-about-mcp)
- [Finding MCP Servers](#finding-mcp-servers)
- [Introducing VoltAgent](#introducing-voltagent)
- [VoltAgent and MCP](#voltagent-and-mcp)
- [Let's Build an Example with VoltAgent!](#lets-build-an-example-with-voltagent)
  - [Setting Up the Project](#setting-up-the-project)
  - [Implementing the Agent and MCP Configuration](#implementing-the-agent-and-mcp-configuration)
  - [Running the Agent](#running-the-agent)
  - [Testing in the Console](#testing-in-the-console)

## What is MCP?

I like to think of an AI agent as a very smart brain in a jar. It's brilliant at understanding and generating language, but it's stuck inside its digital container. It doesn't have built-in hands or eyes to interact directly with the outside world files, websites, databases, APIs, etc. To do useful tasks, it needs **tools**.

:::info Think of it like this:

Imagine you have a bunch of different power tools: a drill, a saw, a sander. If each one needed a completely different type of power cord and plug, it would be a nightmare.

MCP acts like a **universal adapter** or a **standard plug socket** for AI tools.
:::

Instead of every tool (like a file reader or a web browser) needing a unique, custom connection to the AI agent, MCP provides a **standard way** for agents and tools (which we call "MCP servers") to communicate.

This means an agent I build with a framework that understands MCP can potentially connect to _any_ service or tool that also speaks this standard MCP language. This could be a tool for:

- Accessing my computer's **filesystem** (reading/writing files).
- **Browsing the web**.
- Interacting with **databases**.
- Connecting to specific **APIs** (like GitHub, Slack, Google Maps, etc.).
- Running **local scripts** or applications on my machine.

The main benefit I see is **standardization**. It makes life _much_ easier. Developers can create tools (MCP servers) knowing that any compatible agent can use them, and agent builders like me can easily add diverse capabilities without writing tons of custom integration code for each one.

## Why Should I Care About MCP?

Okay, standardization is cool, but what does that _really_ mean for me when I'm trying to build a useful AI agent? Here's why I find it valuable:

1.  **Easier Tool Integration:** This is the big one. I don't need to become an expert in every single API or system I want my agent to interact with. If someone's already built an MCP server for it (like reading files or searching the web), I can often just "plug it in" to my agent configuration. Less custom code, faster development.
2.  **Access to Specialized Tools:** The AI community is building amazing things! Maybe someone created a powerful MCP server for complex financial data analysis, controlling smart home devices, or generating specific types of images. MCP allows me to potentially leverage that specialized work directly in my agent.
3.  **Reusability:** An MCP server built for one purpose (e.g., interacting with GitHub) isn't tied to just one specific agent or even one agent framework. If another agent or platform supports MCP, that same server can potentially be reused there. Build once, use many times.
4.  **Focus on Agent Logic:** Because MCP handles the _how_ of communication, I can spend more of my time and brainpower designing the _what_ and _why_ of my agent its goals, its personality, its core decision-making process rather than getting bogged down in the plumbing of tool connections.

## Finding MCP Servers

So, where do I find these useful MCP servers? The ecosystem is definitely growing. While there isn't one single, official, all-encompassing directory (yet!), here are the places I usually look:

- **Official Examples:** The creators of MCP (Anthropic) and communities maintain lists of reference implementations and examples. These are great starting points:
  - [Model Context Protocol - Example Servers](https://modelcontextprotocol.io/examples)
- **Community Aggregators:** Several websites have popped up specifically to collect and categorize MCP servers developed by the community. These can be gold mines:
  - [mcp.so](https://mcp.so/)
  - [MCP Explorer by Composio](https://mcp.composio.dev/)
- **Tool/Platform Documentation:** Sometimes, the documentation for a specific service or tool (like a database, an API platform like Stripe, or even software like Blender) might mention if an official or community-built MCP server is available.
- **Package Managers:** I can also search package managers like npm (for Node.js/TypeScript projects) for packages often named like `@modelcontextprotocol/server-*` or similar.

## Introducing VoltAgent

Before we dive into building, let me briefly mention [**VoltAgent**](https://github.com/VoltAgent/voltagent). It simplifies building sophisticated AI agents, handling things like state management, tool usage, and, crucially for this post, integrating external systems like MCP servers. It lets me focus more on the agent's capabilities rather than the underlying infrastructure.

### VoltAgent and MCP

VoltAgent makes integrating MCP servers relatively straightforward. The core idea is to define the servers you want to use within an `MCPConfiguration` object and then pass the tools provided by that configuration to your `Agent`.

VoltAgent handles the process of:

1.  **Starting the Server:** Running the command you specify for the MCP server (like `npx @modelcontextprotocol/server-filesystem ...`).
2.  **Connecting:** Establishing communication with the running server.
3.  **Fetching Tools:** Asking the server what capabilities (tools) it offers.
4.  **Making Tools Available:** Exposing these tools (like `readFile`, `writeFile`) so your agent's LLM can understand and decide to use them.

You essentially declare _what_ server you want and _where_ it is, and VoltAgent takes care of wiring it up to your agent.

### Let's Build an Example with VoltAgent

Let's build something. I'll show you how I created a very basic VoltAgent project and connected it to the standard filesystem MCP server. This will allow our agent to read files from a specific directory on my computer.

![VoltAgent MCP Demo](https://cdn.voltagent.dev/2025-04-25-what-is-an-mcp-server/mcp-demo.gif)

<GitHubExampleLink 
  repoUrl="https://github.com/VoltAgent/voltagent/tree/main/examples/with-mcp-server" 
  npmCommand="npm create voltagent-app@latest -- --example with-mcp-server" 
/>

#### Setting Up the Project

The quickest way to get started with VoltAgent is using the `create-voltagent-app` command-line tool. Let's call our project `mcp-filesystem-agent`. I opened my terminal and ran:

```bash
npm create voltagent-app@latest mcp-filesystem-agent
```

This command guides you through setup. I mostly chose the defaults but made sure to select **TypeScript**. (For more details, check the [VoltAgent Quick Start guide](/docs/quick-start)).

After it finished, I navigated into the new project directory:

```bash
cd mcp-filesystem-agent
```

This sets up a basic project structure:

```
mcp-filesystem-agent/
├── src/
│   └── index.ts     # Our main agent logic goes here!
├── package.json     # Project dependencies
├── tsconfig.json    # TypeScript configuration
├── .gitignore       # Files for Git to ignore
└── .env             # For API keys (you'll need to add your key here)
```

#### Implementing the Agent and MCP Configuration

Now for the core part. I opened `src/index.ts` and set up the MCP configuration and the agent definition.

```typescript title="src/index.ts"
import { openai } from "@ai-sdk/openai";
import { VoltAgent, Agent, MCPConfiguration } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
// Node.js 'path' module helps create safe, cross-platform file paths
import path from "node:path";

const mcpConfig = new MCPConfiguration({
  servers: {
    filesystem: {
      // 'stdio' means VoltAgent will run this as a local command-line process
      // and communicate with it via standard input/output.
      type: "stdio",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", path.resolve("./data")],
    },
  },
});

const agent = new Agent({
  name: "MCP Filesystem Agent",
  description:
    "I am an agent that can read and write files inside a specific 'data' directory, using tools provided by an MCP server.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: await mcpConfig.getTools(),
});

new VoltAgent({
  agents: {
    fsAgent: agent,
  },
});
```

**Code Breakdown (My Understanding):**

- **`MCPConfiguration`:** This is where I defined the `filesystem` server connection.
  - `type: "stdio"` tells VoltAgent it's a local command to run.
  - `command: "npx"` specifies _how_ to run it.
  - `args: [...]` provides the details: the MCP server package (`@modelcontextprotocol/server-filesystem`) and, crucially, `path.resolve("./data")`. This locks the server down, only allowing it to see inside a `./data` folder within my project. **I had to remember to actually create this `data` folder later (`mkdir data`)!** This is super important for security.
- **`Agent` Definition:** I created my `Agent` instance. The key part is `tools: await mcpConfig.getTools()`. This line tells VoltAgent: "Go connect to all the servers I defined in `mcpConfig`, find out what tools they offer (like `readFile`, `writeFile` from the filesystem server), and make those tools available for this agent's LLM to use."
- **`VoltAgent` Initialization:** I started the main VoltAgent server and registered my `agent` under the key `fsAgent`. This key is how I'll select it in the VoltAgent Console.

#### Running the Agent

Before running, we need two things: an API key for the LLM and the `data` directory we restricted the MCP server to.

1.  **Create `.env` file:** In the root of the `mcp-filesystem-agent` project, I created a file named `.env`.
2.  **Add API Key:** Inside `.env`, I added my OpenAI key:
    ```bash title=".env"
    OPENAI_API_KEY=your_openai_api_key_here
    ```
    (Obviously, replace `your_openai_api_key_here` with your actual key).
3.  **Create `data` Directory and Test File:** In the terminal, still in the project root:
    ```bash
    mkdir data
    echo "Hello from the MCP agent's accessible file!" > data/test.txt
    ```
4.  **Install Dependencies:** Make sure all packages are installed:
    <Tabs>
    <TabItem value="npm" label="npm" default>

        ```bash
        npm install
        ```

          </TabItem>
          <TabItem value="yarn" label="yarn">

        ```bash
        yarn install
        ```

          </TabItem>
          <TabItem value="pnpm" label="pnpm">

        ```bash
        pnpm install
        ```

          </TabItem>
        </Tabs>

5.  **Start the Agent:** Run the development server:
    <Tabs>
    <TabItem value="npm" label="npm" default>

        ```bash
        npm run dev
        ```

          </TabItem>
          <TabItem value="yarn" label="yarn">

        ```bash
        yarn dev
        ```

          </TabItem>
          <TabItem value="pnpm" label="pnpm">

        ```bash
        pnpm dev
        ```

          </TabItem>
        </Tabs>

I saw the VoltAgent server startup message, including the link to the Developer Console:

```bash
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  Developer Console:    https://console.voltagent.dev
══════════════════════════════════════════════════
```

This also automatically started the filesystem MCP server process in the background.

#### Testing in the Console

Now for the moment of truth!

1.  **Open Console:** I went to [`https://console.voltagent.dev`](https://console.voltagent.dev) in my browser.
2.  **Find Agent:** My agent was listed with the key `fsAgent` (and the name "MCP Filesystem Agent"). I clicked on it.
3.  **Chat:** I clicked the chat icon (bottom-right) to open the chat window.
4.  **Ask it to Read:** I typed the following message and hit Enter:
    `Please read the file named test.txt in the data directory.`

![VoltAgent MCP Demo](https://cdn.voltagent.dev/2025-04-25-what-is-an-mcp-server/mcp-demo.gif)

Here's what happened behind the scenes (which I could see in the console's trace):

1.  My agent received the message.
2.  The LLM understood I wanted to read a file and saw it had a `readFile` tool available (thanks to MCP and VoltAgent).
3.  The agent decided to use the `readFile` tool, passing `test.txt` as the argument.
4.  VoltAgent routed this tool call to the running filesystem MCP server process.
5.  The MCP server (safely restricted to the `./data` directory) read `test.txt` and sent its content back.
6.  VoltAgent passed the content back to the agent's LLM.
7.  The LLM formulated a response like, "Okay, I read the file test.txt. The content is: Hello from the MCP agent's accessible file!" and sent it to me in the chat.

The agent used an external tool via MCP to interact with my local filesystem, exactly as planned.

## Conclusion

MCP felt a bit abstract at first, but seeing it work makes its value clear. It really does act like that universal adapter, allowing my AI agent to gain new capabilities (like accessing files) just by configuring the right MCP server. VoltAgent made the process of connecting that server to the agent pretty painless.

By providing this standard communication layer, MCP opens the door for agents to safely and reliably interact with a huge range of external systems.
