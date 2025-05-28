---
title: Quick Start
slug: /quick-start
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quick Start

There are two ways to create a VoltAgent application: Automatic setup or manual setup. While both work, the automatic setup provides the smoothest experience, especially for new users.

### Automatic Setup (Recommended)

You can quickly create a new project using the `create-voltagent-app` CLI tool:

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm create voltagent-app@latest my-agent-app
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn create voltagent-app my-agent-app
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm create voltagent-app my-agent-app
```

  </TabItem>
</Tabs>

After running the command, you'll see the VoltAgent Generator welcome screen:

```bash
 _    __      ____  ___                    __
| |  / /___  / / /_/   | ____ ____  ____  / /_
| | / / __ \/ / __/ /| |/ __ `/ _ \/ __ \/ __/
| |/ / /_/ / / /_/ ___ / /_/ /  __/ / / / /_
|___/\____/_/\__/_/  |_\__, /\___/_/ /_/\__/
                      /____/

   ╭───────────────────────────────────────────────╮
   │                                               │
   │   Welcome to VoltAgent Generator!             │
   │                                               │
   │   Create powerful AI agents with VoltAgent.   │
   │                                               │
   ╰───────────────────────────────────────────────╯

Let's create your next AI application...


? What is your project named? (my-voltagent-app) _
```

This command will ask you a few questions and automatically set up a VoltAgent project based on your preferences. Once the setup is complete, navigate to your project directory and start your application:

```bash
cd my-voltagent-app
```

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

When you run the `dev` command, `tsx` will compile and run your code. You should see the VoltAgent server startup message in your terminal:

```bash
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  Developer Console:    https://console.voltagent.dev
══════════════════════════════════════════════════
[VoltAgent] All packages are up to date
```

Your agent is now running! To interact with it:

1.  **Open the Console:** Click the [`https://console.voltagent.dev`](https://console.voltagent.dev) link in your terminal output (or copy-paste it into your browser).
2.  **Find Your Agent:** On the VoltAgent Console page, you should see your agent listed (e.g., "my-agent").
3.  **Open Agent Details:** Click on your agent's name.
4.  **Start Chatting:** On the agent detail page, click the chat icon in the bottom right corner to open the chat window.
5.  **Send a Message:** Type a message like "Hello" and press Enter.

![VoltAgent Console](https://cdn.voltagent.dev/readme/demo.gif)

You should receive a response from your AI agent in the chat window. This confirms that your VoltAgent application is set up correctly and communicating with the LLM.

The `dev` script uses `tsx watch`, so it will automatically restart if you make changes to your code in the `src` directory. Press `Ctrl+C` in the terminal to stop the agent.

## Next Steps

- Explore [Agent](../agents/overview.md) options
- Learn about [Memory](../agents/memory/overview.md)
- Check out [Tool Creation](../agents/tools.md) for more advanced use cases

### Manual Setup

Follow these steps to create a new TypeScript project and add VoltAgent:

Create a new project directory:

```bash
mkdir my-voltagent-project
cd my-voltagent-project
```

Initialize a new npm project:

```bash
npm init -y
```

Create a basic TypeScript configuration file (tsconfig.json):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "outDir": "dist",
    "strict": true
  },
  "include": ["src"]
}
```

#### Install Dependencies

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
# Install development dependencies
npm install --save-dev typescript tsx @types/node @voltagent/cli

# Install dependencies
npm install @voltagent/core @voltagent/vercel-ai @ai-sdk/openai zod
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
# Install development dependencies
yarn add --dev typescript tsx @types/node @voltagent/cli

# Install dependencies
yarn add @voltagent/core @voltagent/vercel-ai @ai-sdk/openai zod
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
# Install development dependencies
pnpm add --save-dev typescript tsx @types/node @voltagent/cli

# Install dependencies
# Note: @voltagent/cli was already included here in the original docs, kept for consistency.
pnpm add @voltagent/core @voltagent/cli @voltagent/vercel-ai @ai-sdk/openai zod
```

  </TabItem>
</Tabs>

Create a source directory:

```bash
mkdir src
```

Create a basic agent in `src/index.ts`:

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai"; // Example provider
import { openai } from "@ai-sdk/openai"; // Example model

// Define a simple agent
const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that answers questions without using tools",
  // Note: You can swap VercelAIProvider and openai with other supported providers/models
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Initialize VoltAgent with your agent(s)
new VoltAgent({
  agents: {
    agent,
  },
});
```

Create a `.env` file and add your OpenAI API key:

```bash
# Make sure to replace 'your_openai_api_key' with your actual key
OPENAI_API_KEY=your_openai_api_key
```

Add the following to your package.json:

```json
"type": "module",
"scripts": {
  "build": "tsc",
  "dev": "tsx watch --env-file=.env ./src",
  "start": "node dist/index.js",
  "volt": "volt" // Requires @voltagent/cli
}
```

Your project structure should now look like this:

```
my-voltagent-project/
├── node_modules/
├── src/
│   └── index.ts
├── package.json
├── tsconfig.json
├── .env
└── .voltagent/ (created automatically when you run the agent)
```

#### Run Your Agent

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

When you run the `dev` command, `tsx` will compile and run your code. You should see the VoltAgent server startup message in your terminal:

```bash
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  Developer Console:    https://console.voltagent.dev
══════════════════════════════════════════════════
[VoltAgent] All packages are up to date
```

Your agent is now running! To interact with it:

1.  **Open the Console:** Click the `https://console.voltagent.dev` link in your terminal output (or copy-paste it into your browser).
2.  **Find Your Agent:** On the VoltAgent Console page, you should see your agent listed (e.g., "my-agent").
3.  **Open Agent Details:** Click on your agent's name.
4.  **Start Chatting:** On the agent detail page, click the chat icon in the bottom right corner to open the chat window.
5.  **Send a Message:** Type a message like "Hello" and press Enter.

_[Placeholder for GIF showing Console interaction: Finding agent, clicking chat, sending message]_

You should receive a response from your AI agent in the chat window. This confirms that your VoltAgent application is set up correctly and communicating with the LLM.

The `dev` script uses `tsx watch`, so it will automatically restart if you make changes to your code in the `src` directory. Press `Ctrl+C` in the terminal to stop the agent.

## Next Steps

- Explore [Agent](../agents/overview.md) options
- Learn about [Memory](../agents/memory/overview.md)
- Check out [Tool Creation](../agents/tools.md) for more advanced use cases
