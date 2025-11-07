---
title: Quick Start
slug: /quick-start
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Quick Start

There are two ways to create a VoltAgent application: Automatic setup or manual setup. While both work, the automatic setup provides the smoothest experience, especially for new users. Be sure your environment is running **Node.js 20.19 or newer** so the generated tsdown build works without ESM resolution issues.

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

```
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

The CLI will guide you through the setup process:

1. **Project Name**: Choose a name for your project
2. **AI Provider**: Select from OpenAI, Anthropic, Google, Groq, Mistral, or Ollama (local)
3. **API Key** (optional): Enter your API key or skip to add it later
4. **Package Manager**: Choose from installed package managers (npm, yarn, or pnpm)
5. **IDE Configuration**: Optionally configure MCP Docs Server for your IDE

The tool will automatically:

- Create project files and structure (including a `tsdown.config.ts` build configuration)
- Generate a `.env` file with your API key (if provided)
- Initialize a git repository
- Install dependencies

Once the setup is complete, navigate to your project directory:

```bash
cd my-voltagent-app
```

### Add Your API Key

If you skipped API key entry during setup, create or edit the `.env` file in your project root and add your API key:

```bash
# For OpenAI
OPENAI_API_KEY=your-api-key-here

# For Anthropic
ANTHROPIC_API_KEY=your-api-key-here

# For Google
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here

# For Groq
GROQ_API_KEY=your-api-key-here

# For Mistral
MISTRAL_API_KEY=your-api-key-here

# For Ollama (no API key needed, runs locally)
# Make sure Ollama is installed and running
```

> **Get your API key:**
>
> - **OpenAI**: [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
> - **Anthropic**: [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)
> - **Google**: [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
> - **Groq**: [console.groq.com/keys](https://console.groq.com/keys)
> - **Mistral**: [console.mistral.ai/api-keys](https://console.mistral.ai/api-keys)
> - **Ollama**: [ollama.com/download](https://ollama.com/download)

### Start Your Application

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
  ✓ HTTP Server:  http://localhost:3141
  ↪ Share it:    pnpm volt tunnel 3141 (secure HTTPS tunnel for teammates)
     Docs: https://voltagent.dev/docs/deployment/local-tunnel/
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

Your agent is now running! To interact with it:

1.  **Open the Console:** Click the [`https://console.voltagent.dev`](https://console.voltagent.dev) link in your terminal output (or copy-paste it into your browser).
2.  **Find Your Agent:** On the VoltOps LLM Observability Platform page, you should see your agent listed (e.g., "my-agent").
3.  **Open Agent Details:** Click on your agent's name.
4.  **Start Chatting:** On the agent detail page, click the chat icon in the bottom right corner to open the chat window.
5.  **Send a Message:** Type a message like "Hello" and press Enter.

![VoltOps LLM Observability Platform](https://cdn.voltagent.dev/readme/demo.gif)

You should receive a response from your AI agent in the chat window. This confirms that your VoltAgent application is set up correctly and communicating with the LLM.

The `dev` script uses `tsx watch`, so it will automatically restart if you make changes to your code in the `src` directory. Press `Ctrl+C` in the terminal to stop the agent.

### Share Your Local Server (Optional)

When you need to demo your agent remotely or receive external webhooks, install the VoltAgent CLI and open a tunnel:

```bash title="Install the CLI (adds a volt script and dev dependency)"
npx @voltagent/cli init
```

Then expose your local server:

```bash
pnpm volt tunnel 3141
```

The command prints an HTTPS URL (for example `https://your-tunnel-address.tunnel.voltagent.dev`) that forwards traffic to your local port until you press `Ctrl+C`. You can also run it ad‑hoc without installing dependencies:

> Tip: skipping the port (`pnpm volt tunnel`) uses the default `3141`.

```bash
npx @voltagent/cli tunnel 3141
```

See the [Local Tunnel guide](/docs/deployment/local-tunnel) for details and limitations.

### Build for Production

When you're ready to deploy, bundle the app and run the compiled JavaScript with Node:

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
npm run build
npm start
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
yarn build
yarn start
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
pnpm build
pnpm start
```

  </TabItem>
</Tabs>

The `build` script invokes **tsdown**, which bundles your TypeScript entrypoint (and any sibling directories such as `./workflows` or `./tools`) into `dist/index.js`. This extra step keeps the Node ESM loader from throwing `ERR_UNSUPPORTED_DIR_IMPORT` while preserving extensionless imports during development.

### Explore and Run Your Workflow from the Console

Your new project isn't just an agent; it's a powerful automation engine. We've included an expense approval workflow example to get you started, and you can run it directly from the VoltOps console.

This workflow demonstrates how to chain together all the core steps of VoltAgent:

- **Data Transformation** (`andThen`)
- **AI Agent Calls** (`andAgent`)
- **Parallel Processing** (`andAll`)
- **Racing Operations** (`andRace`)
- **Conditional Logic** (`andWhen`)

#### How to Run the Workflow

![VoltOps Workflow Observability](https://cdn.voltagent.dev/docs/workflow-observability-demo.gif)

1.  **Go to the Workflows Page:** After starting your server, go directly to the [Workflows page](https://console.voltagent.dev/workflows).
2.  **Select Your Project:** Use the project selector on the page to choose your newly created project (e.g., "my-agent-app").
3.  **Find and Run the Workflow:** You will see **"Expense Approval Workflow"** listed. Click on it to open the detail page, then click the **"Run"** button.
4.  **Provide Input:** An input form will appear. The workflow expects a JSON object with expense details. Try one of the following inputs to see how it works:
    - For automatic approval (under $100):

```json
{
  "amount": 75,
  "category": "office supplies",
  "description": "Notebooks and pens for team meeting"
}
```

    -   For manual review (over $100):

```json
{
  "amount": 450,
  "category": "equipment",
  "description": "New monitor for development workstation"
}
```

5.  **View the Results:** After execution, you can inspect the detailed logs for each step and see the final output directly in the console.

This interactive experience is a great way to understand how to build and test complex automations with VoltAgent without needing to modify your code for every run.

## Next Steps

Ready to build real AI agents? Follow our step-by-step tutorial:

- **[Start the Tutorial](/tutorial/introduction)** - Learn to build agents with tools, memory, and real-world integrations

Or explore specific topics:

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
    "module": "ES2022",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "outDir": "dist",
    "strict": true
  },
  "include": ["src"]
}
```

Add a `tsdown.config.ts` alongside `tsconfig.json` so production builds bundle correctly:

```typescript
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  sourcemap: true,
  outDir: "dist",
});
```

#### Install Dependencies

<Tabs>
  <TabItem value="npm" label="npm" default>

```bash
# Install development dependencies
npm install --save-dev typescript tsx tsdown @types/node @voltagent/cli

# Install dependencies
npm install @voltagent/core @voltagent/libsql @voltagent/server-hono @voltagent/logger ai @ai-sdk/openai@^2 zod@3
```

  </TabItem>
  <TabItem value="yarn" label="yarn">

```bash
# Install development dependencies
yarn add --dev typescript tsx tsdown @types/node @voltagent/cli

# Install dependencies
yarn add @voltagent/core @voltagent/libsql @voltagent/server-hono @voltagent/logger ai @ai-sdk/openai@^2 zod@3
```

  </TabItem>
  <TabItem value="pnpm" label="pnpm">

```bash
# Install development dependencies
pnpm add --save-dev typescript tsx tsdown @types/node @voltagent/cli

# Install dependencies
pnpm add @voltagent/core @voltagent/libsql @voltagent/server-hono @voltagent/logger ai @ai-sdk/openai@^2 zod@3
```

  </TabItem>
</Tabs>

Create a source directory:

```bash
mkdir src
```

Create a basic agent in `src/index.ts`:

```typescript
import { VoltAgent, Agent, Memory } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono"; // HTTP server
import { LibSQLMemoryAdapter } from "@voltagent/libsql"; // For persistent memory
import { openai } from "@ai-sdk/openai"; // Example model
import { createPinoLogger } from "@voltagent/logger";

// Create logger (optional but recommended)
const logger = createPinoLogger({
  name: "my-agent",
  level: "info",
});

// Define a simple agent
const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that answers questions without using tools",
  // VoltAgent uses ai-sdk directly - pick any ai-sdk model
  model: openai("gpt-4o-mini"),
  // Optional: Add persistent memory (remove this to use default in-memory storage)
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),
});

// Initialize VoltAgent with your agent(s)
new VoltAgent({
  agents: { agent },
  server: honoServer(), // Default port: 3141
  logger,
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
  "build": "tsdown",
  "dev": "tsx watch --env-file=.env ./src",
  "start": "node dist/index.js",
  "volt": "volt" // Requires @voltagent/cli
}
```

`npm run build` (or `yarn build` / `pnpm build`) bundles your sources with tsdown before handing the output to Node via `npm start`.

Your project structure should now look like this:

```
my-voltagent-project/
├── node_modules/
├── src/
│   └── index.ts
├── package.json
├── tsconfig.json
├── tsdown.config.ts
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
  ✓ HTTP Server:  http://localhost:3141
  ↪ Share it:    pnpm volt tunnel 3141 (secure HTTPS tunnel for teammates)
     Docs: https://voltagent.dev/docs/deployment/local-tunnel/
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

Your agent is now running! To interact with it:

1.  **Open the Console:** Click the `https://console.voltagent.dev` link in your terminal output (or copy-paste it into your browser).
2.  **Find Your Agent:** On the VoltOps LLM Observability Platform page, you should see your agent listed (e.g., "my-agent").
3.  **Open Agent Details:** Click on your agent's name.
4.  **Start Chatting:** On the agent detail page, click the chat icon in the bottom right corner to open the chat window.
5.  **Send a Message:** Type a message like "Hello" and press Enter.

_[Placeholder for GIF showing Console interaction: Finding agent, clicking chat, sending message]_

You should receive a response from your AI agent in the chat window. This confirms that your VoltAgent application is set up correctly and communicating with the LLM.

The `dev` script uses `tsx watch`, so it will automatically restart if you make changes to your code in the `src` directory. Press `Ctrl+C` in the terminal to stop the agent.

## Next Steps

Ready to build real AI agents? Follow our step-by-step tutorial:

- **[Start the Tutorial](/tutorial/introduction)** - Learn to build agents with tools, memory, and real-world integrations

Or explore specific topics:

- Explore [Agent](../agents/overview.md) options
- Learn about [Memory](../agents/memory/overview.md)
- Check out [Tool Creation](../agents/tools.md) for more advanced use cases
