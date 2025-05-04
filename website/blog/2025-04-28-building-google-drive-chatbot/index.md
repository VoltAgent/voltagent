---
title: Building a Google Drive Chatbot with VoltAgent & Composio MCP
description: A guide to implementing a Google Drive chatbot using VoltAgent framework and Composio MCP integration.
tags: [mcp, tutorial]
slug: building-google-drive-chatbot-with-composio-mcp
image: https://cdn.voltagent.dev/2025-04-28-building-google-drive-chatbot/social.png
authors: omeraplak
---

import GitHubExampleLink from '@site/src/components/blog-widgets/GitHubExampleLink';

## Introduction

We're excited to share something cool we've put together: a chatbot that can actually search through your Google Drive files.

To build this we'll use [VoltAgent](https://github.com/VoltAgent/voltagent), along with some neat tools like [Composio](https://composio.dev/) and the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction). If those names sound a bit technical, no worries, we'll explain everything as we go.

:::note What's the Goal Here?
Imagine asking a chatbot, `Find my presentation about Q3 results,` and _bam_, it digs through your Google Drive and gives you the link.

That's exactly the kind of thing we wanted to enable an AI agent that can securely connect to your personal tools, like Google Drive in this case.
:::

![Google Drive Chatbot](https://cdn.voltagent.dev/2025-04-28-building-google-drive-chatbot/google-drive-composio-demo.gif)

<GitHubExampleLink
  repoUrl="https://github.com/VoltAgent/voltagent/tree/main/examples/with-google-drive-mcp"
  npmCommand="npm create voltagent-app@latest -- --example with-google-drive-mcp"
/>

## The Tools We Need

To make this chatbot work, we needed a few essential pieces:

### 1. VoltAgent: Our Agent Framework

So, first things first: [VoltAgent](https://github.com/VoltAgent/voltagent). This is our baby, an open-source TypeScript framework we built specifically to make creating AI agents less painful. We've all been there, trying to cobble together different AI models, memory systems, and tool connections. It gets messy fast!

VoltAgent provides a structured way to do this. We designed it to be modular, so you can easily swap AI models (like GPT-4), manage how the agent remembers things, and crucially for this example hook up external tools and data sources, like Google Drive.

Our goal was to help developers (including ourselves!) build sophisticated agents faster while keeping the codebase clean and maintainable.

### 2. Composio: The Secure Bridge for Tools

Now, how does our VoltAgent-powered agent actually _talk_ to Google Drive? We needed a secure and straightforward way to handle that connection. Wrestling with Google's APIs and authentication flows directly can be time-consuming.

This is where we decided to use [Composio](https://composio.dev/). They offer ready-made, secure connections to a _ton_ of applications ([hundreds, actually!](https://mcp.composio.dev/)), including the [Google Drive](https://mcp.composio.dev/googledrive) integration we needed.

Instead of us building and maintaining the whole OAuth dance and API logic, Composio provides a secure "bridge" or tool that our agent can use. And the way it provides this tool is through a standard called MCP.

### 3. MCP (Model Context Protocol): A Common Language for Agents and Tools

Think of MCP as a universal translator. It's a standardized way for AI agents (like those built with VoltAgent) and external tools (like the Google Drive connection from Composio) to communicate securely and effectively.

We made sure VoltAgent understands MCP precisely because it simplifies integrations so much. Composio's tool speaks MCP, VoltAgent speaks MCP, and _boom_ they can talk to each other without us needing to write a bunch of custom glue code.

It's like having standard USB ports for AI tools. Composio conveniently hosts these MCP connection points (called "servers" or "endpoints"), so we didn't even need to worry about running or deploying that part ourselves.

:::tip **The TL;DR:**

- **VoltAgent:** Our framework for building the agent's logic.
- **Composio:** Provides the pre-built, secure Google Drive tool.
- **MCP:** The standard protocol that lets VoltAgent use Composio's tool easily.
  :::

## Let's Get it Running!

The best part? We've packaged everything into a ready-to-use template, no need to start from scratch. Since we'll be sharing many VoltAgent tutorials, in this post we'll focus on an example MCP integration rather than walking through a full VoltAgent setup.

**Step 1: Grab the Example Code**

Pop open your terminal and run this:

```
npm create voltagent-app@latest -- --example with-google-drive-mcp
```

This command uses our `create-voltagent-app` tool to fetch the complete project code.

**Step 2: Jump Into the Project Directory**

```bash
cd with-google-drive-mcp
```

**Step 3: Install Dependencies**

Our example has two main parts: the `server` (where the VoltAgent logic runs) and the `client` (the simple chat interface you'll see in your browser). We need to install the necessary Node.js packages for both.

```bash
# Install server dependencies
cd server
npm install

# Go back and install client dependencies
cd ../client
npm install

# Go back to the project root
cd ..
```

**Step 4: Configure Your API Keys**

The agent needs credentials to talk to OpenAI (for the AI model) and Composio (for the Google Drive tool).

- Navigate into the `server` directory (`cd server` if you're in the root).
- Create a new file named `.env` (just `.env`, no name before the dot).
- Paste the following into your new `server/.env` file:

  ```env
  # Get your Composio API key from https://app.composio.dev/developers
  COMPOSIO_API_KEY="your_composio_api_key"

  # Get your Google Drive Integration ID from Composio (https://app.composio.dev/app/googledrive)
  # You might need to add the Google Drive app in Composio first.
  GOOGLE_INTEGRATION_ID="your_google_integration_id"

  # Get your OpenAI API key from https://platform.openai.com/api-keys
  OPENAI_API_KEY="your_openai_api_key"
  ```

- Now, replace the placeholder values:
  - Log into [Composio](https://app.composio.dev/). Find your API Key under Developer settings and paste it in.
  - In Composio, go to the Apps section, find (or add) Google Drive, and copy its Integration ID. Paste that in.
  - Head over to [OpenAI](https://platform.openai.com/api-keys) to get your API key and paste it in.
  - Save the `.env` file. **Remember to keep these keys private!** Don't commit them to Git.

**Step 5: Start the App**

You'll need two separate terminal windows for this.

- **Terminal 1: Start the Server**

  ```bash
  # Make sure you're in the project root `with-google-drive-mcp` first
  cd server
  npm run dev
  ```

  You should see some output indicating the server is running, usually on `http://localhost:3000`.

- **Terminal 2: Start the Client**

  ```bash
  # Make sure you're in the project root `with-google-drive-mcp` first
  cd client
  npm run dev
  ```

  This command usually opens the chat interface automatically in your default web browser (likely at `http://localhost:5173`).

**Step 6: Connect Google Drive & Start Chatting!**

The first time you load the web interface, Composio will likely guide you through a quick process to authorize access to your Google Account (securely, using OAuth). Once you've done that, you're ready! You can start asking the chatbot to find files in your Google Drive.

![Google Drive Chatbot](https://cdn.voltagent.dev/2025-04-28-building-google-drive-chatbot/google-drive-composio-demo.gif)

## Seeing What's Going On: Observability

When we build agents, figuring out _why_ they did something (or why they failed) is super important. That's observability. We knew this would be critical, so we built observability features right into VoltAgent.

You can easily connect your VoltAgent applications to the [VoltAgent Console](https://console.voltagent.dev). It gives you detailed logs and traces, showing exactly what steps the agent took, which tools it called (like the Google Drive search), the data flowing in and out, and any errors that occurred. It makes debugging and just understanding the agent's behavior _so_ much easier.

![VoltAgent Console](https://cdn.voltagent.dev/2025-04-28-building-google-drive-chatbot/voltagent-developer-console-demo.gif)

## Conclusion

And that's pretty much it! By combining our VoltAgent framework with Composio's handy MCP-based tool integration, we were able to quickly spin up a useful chatbot that talks securely to Google Drive. We think this example really shows the power of using standardized protocols like MCP and frameworks like VoltAgent to accelerate agent development.

The `create-voltagent-app` command makes trying out examples like this a breeze. We encourage you to grab the code, play around with it, check out the [VoltAgent documentation](https://voltagent.dev/docs/), and see what kinds of cool agents _you_ can build. Let us know what you create!
