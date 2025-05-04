---
title: Building a Data-Aware Chatbot with VoltAgent and Peaka
description: Learn how to integrate Peaka's powerful data access into your VoltAgent AI applications using the Model Context Protocol (MCP).
slug: data-aware-chatbot-voltagent-peaka
tags: [mcp, tutorial]
image: https://cdn.voltagent.dev/2025-04-26-peaka-mcp-voltagent/social.png
authors: omeraplak
---

import GitHubExampleLink from '@site/src/components/blog-widgets/GitHubExampleLink';

## Introduction

In this article, I'll demonstrate how we can use the Model Context Protocol (MCP) by integrating **VoltAgent** and **Peaka** to create an AI agent with data retrieval capabilities.

![Peaka MCP VoltAgent](https://cdn.voltagent.dev/2025-04-26-peaka-mcp-voltagent/peaka-demo.gif)

<GitHubExampleLink
  repoUrl="https://github.com/VoltAgent/voltagent/tree/main/examples/with-peaka-mcp"
  npmCommand="npm create voltagent-app@latest -- --example with-peaka-mcp"
/>

## Wait, What's Peaka?

Right, before I show you the code stuff, let me tell you about [Peaka](https://www.peaka.com/).

Their idea is pretty simple: make it less annoying to work with data. Think of it like a data middleman. You hook up your databases, spreadsheets, whatever, to Peaka. Then you can ask it questions (using fancy SQL code or just regular English), and it pulls the info together from all those places for you.

Usually, connecting different data sources is a real pain and costs a lot. Peaka feels like a simpler option, especially if you're not a huge company or just don't want to mess with complicated data pipelines. They wanna be the easy button for getting data.

## And VoltAgent?

It's our toolkit for putting together AI powered applications. We provide the core engine (`@voltagent/core`) to get you started, and then you can add extra capabilities, like voice interaction (`@voltagent/voice`) or support for different LLMs (OpenAI, Google, etc.). VoltAgent handles the complex stuff (like history and tool connections) so you can focus on your agent's unique features.

We designed VoltAgent to hit a nice sweet spot. It gives you more helpful structure than trying to build everything from raw AI libraries, but it offers a lot more freedom and customization than the simpler no-code platforms out there.

:::tip
We also built the [VoltAgent Console](https://console.voltagent.dev) a web interface that lets you monitor your agents, see exactly how they're working, and chat with them directly. We find it incredibly useful ourselves for debugging and testing!
:::

## Making My Agent Talk to Peaka

Okay, so my plan was: build a chatbot with VoltAgent that could answer questions by checking data in Peaka.

To make these two talk, I used something called **MCP (Model Context Protocol)**. It sounds fancy, but it's basically just a standard way for different programs to give each other tasks. If you wanna know more, I wrote about [what MCP is over here](https://voltagent.dev/blog/what-is-mcp/).

For this project, it lets VoltAgent tell Peaka, "Hey, go run this data query!"

To follow along, you'll want to sign up for a free Peaka account first over at [https://www.peaka.com/](https://www.peaka.com/). For this example, I'm just using the sample data they provide, which you'll have access to once you sign up.

Here's how I did it.

### 1. Starting a New VoltAgent Project

First up, I needed a blank VoltAgent project. Their setup tool makes this easy:

```bash
npm create voltagent-app@latest my-peaka-agent
# Answer the questions it asks
cd my-peaka-agent
```

That just makes a folder with the basic files I need to get started.

### 2. Telling VoltAgent About Peaka (The MCP Bit)

This is where the magic happens. I had to edit the main code file (`src/index.ts`) to tell VoltAgent how to find and talk to the Peaka tool using MCP.

This is the key chunk of code I put in:

```typescript title="src/index.ts"
import { VoltAgent, Agent, MCPConfiguration } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai"; // Using Vercel's helper stuff for the AI
import { openai } from "@ai-sdk/openai"; // And using OpenAI's model

// 1. Set up the connection to the Peaka MCP tool
const mcp = new MCPConfiguration({
  id: "peaka-mcp", // Just a nickname for this setup
  servers: {
    // Here's the info for the Peaka tool
    peaka: {
      type: "stdio", // Means it runs like a command-line program
      command: "npx", // The command to start it
      // npx is neat, it grabs the latest Peaka MCP tool automatically
      args: ["-y", "@peaka/mcp-server-peaka@latest"],
      // Gotta give it my Peaka API key (stored safely elsewhere!)
      env: { PEAKA_API_KEY: process.env.PEAKA_API_KEY || "" },
    },
  },
});

// 2. Find out what the Peaka tool can actually *do*
// (Need this `async` stuff because it takes a moment to connect)
(async () => {
  // Ask the MCP connection: "What tools does Peaka give us?"
  const tools = await mcp.getTools();

  // 3. Create our actual chatbot agent
  const agent = new Agent({
    name: "Peaka Data Assistant",
    description: "I can look things up in Peaka's data.",
    llm: new VercelAIProvider(), // Which AI service to use
    model: openai("gpt-4o-mini"), // Which specific AI brain
    tools, // <-- Super important! Give the agent the tools from Peaka!
  });

  // 4. Fire up VoltAgent
  new VoltAgent({
    agents: {
      // Make our agent live
      agent,
    },
  });

  console.log("VoltAgent is running with Peaka powers!");
})();
```

So, what's happening here?

1.  **`MCPConfiguration`**: I'm telling VoltAgent, "There's this Peaka tool you can run. Use `npx` to find the `@peaka/mcp-server-peaka` thing, and give it my API key when you run it." The `stdio` part just means it runs like a regular program on my computer.
2.  **`mcp.getTools()`**: This is the clever bit. VoltAgent starts the Peaka tool and then asks it, "What can you do?" Peaka sends back a list of its abilities (like querying data).
3.  **`new Agent(...)`**: I'm making the chatbot itself. I give it a name, tell it what AI brain to use (`gpt-4o-mini`), and crucially, pass in those `tools` I got from Peaka. Now the chatbot knows it has these extra data powers.
4.  **`new VoltAgent(...)`**: This just starts the main VoltAgent system with my new agent included.

Before running, I needed my API keys. I made a file called `.env` in the project folder and put them in there:

```.env title=".env"
PEAKA_API_KEY=your_secret_peaka_key
# Don't forget your OpenAI key!
OPENAI_API_KEY=your_secret_openai_key
```

(Use your real keys, obviously! Keep 'em secret!)

### 3. Running It and Asking Stuff

Okay, code's ready, keys are in place. Time to run it!

```bash
npm run dev
```

My terminal showed VoltAgent starting up, and it also started the Peaka tool automatically in the background. I saw something like this:

```bash
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  Developer Console:    https://console.voltagent.dev
══════════════════════════════════════════════════
```

Now the fun test:

1.  I popped open the [VoltAgent Console](https://console.voltagent.dev) in my browser.
2.  Found my agent ("Peaka Data Assistant").
3.  Opened the chat window.
4.  Asked it something that needed data from Peaka, maybe like:

    > "Hey, what was my Stripe balance yesterday?"

Here's the cool part of what goes on:

- The chatbot AI gets my question.
- It figures out I need data and sees it has that Peaka tool.
- It decides to use the tool.
- VoltAgent sends the request over to the Peaka tool (using MCP).
- The Peaka tool does its thing, querying my actual Stripe data (or whatever I connected).
- Peaka sends the answer back to VoltAgent.
- VoltAgent gives the raw answer back to the chatbot AI.
- The AI turns that raw data into a normal sentence and shows it to me in the chat.

It looks something like this:

![Peaka MCP VoltAgent](https://cdn.voltagent.dev/2025-04-26-peaka-mcp-voltagent/peaka-demo.gif)

## Conclusion

Getting Peaka hooked up to my VoltAgent bot with MCP wasn't too bad! It's pretty awesome to have a chatbot that can actually use real-time data from different places. I can see this being useful for building smarter internal tools, helpdesk bots that know current info, or anything where the AI needs to know more than just what it was trained on.

Definitely worth playing around with if you're building AI stuff!
