---
title: Add to Existing Project
slug: /manual-setup
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

# Add to Existing Project

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

## Install Dependencies

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

## Run Your Agent

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

You should receive a response from your AI agent in the chat window. This confirms that your VoltAgent application is set up correctly and communicating with the LLM.

The `dev` script uses `tsx watch`, so it will automatically restart if you make changes to your code in the `src` directory. Press `Ctrl+C` in the terminal to stop the agent.

## Next Steps

Ready to build real AI agents? Follow our step-by-step tutorial:

- **[Start the Tutorial](/tutorial/introduction)** - Learn to build agents with tools, memory, and real-world integrations

Or explore specific topics:

- Explore [Agent](../agents/overview.md) options
- Learn about [Memory](../agents/memory/overview.md)
- Check out [Tool Creation](../agents/tools.md) for more advanced use cases
