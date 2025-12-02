---
title: Create from scratch
slug: /manual-setup
hide_table_of_contents: true
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import ApiKeyButton from '@site/src/components/docs-widgets/ApiKeyButton';
import StepSection from '@site/src/components/docs-widgets/StepSection';
import ExpandableCode from '@site/src/components/docs-widgets/ExpandableCode';

# Create from scratch

Add VoltAgent to an existing TypeScript project. This guide walks through setting up the configuration, installing dependencies, and creating your first agent. To start from scratch, see [Create with VoltAgent CLI](https://voltagent.dev/docs/quick-start/) guide.

<br/>

<StepSection stepNumber={1} title="Create Project Directory">

Create a new project directory and initialize npm:

```bash
mkdir my-voltagent-project
cd my-voltagent-project
npm init -y
```

</StepSection>

<StepSection stepNumber={2} title="Configure TypeScript">

Create a `tsconfig.json` file:

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

</StepSection>

<StepSection stepNumber={3} title="Install Dependencies">

Install VoltAgent packages and development tools:

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

</StepSection>

<StepSection stepNumber={4} title="Create Your Agent">

Create the source directory and agent file:

```bash
mkdir src
```

Create `src/index.ts`:

<ExpandableCode title="src/index.ts" previewLines={12}>

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

</ExpandableCode>

</StepSection>

<StepSection stepNumber={5} title="Configure Environment">

Create a `.env` file and add your API key:

<Tabs>
  <TabItem value="openai" label="OpenAI" default>

```bash
OPENAI_API_KEY=your-api-key-here
```

<ApiKeyButton provider="OpenAI" href="https://platform.openai.com/api-keys" />

  </TabItem>
  <TabItem value="anthropic" label="Anthropic">

```bash
ANTHROPIC_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Anthropic" href="https://console.anthropic.com/settings/keys" />

  </TabItem>
  <TabItem value="google" label="Google Gemini">

```bash
GOOGLE_GENERATIVE_AI_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Google" href="https://aistudio.google.com/app/apikey" />

  </TabItem>
  <TabItem value="groq" label="Groq">

```bash
GROQ_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Groq" href="https://console.groq.com/keys" />

  </TabItem>
  <TabItem value="mistral" label="Mistral">

```bash
MISTRAL_API_KEY=your-api-key-here
```

<ApiKeyButton provider="Mistral" href="https://console.mistral.ai/api-keys" />

  </TabItem>
</Tabs>

Add the following to your `package.json`:

```json
"type": "module",
"scripts": {
  "build": "tsdown",
  "dev": "tsx watch --env-file=.env ./src",
  "start": "node dist/index.js",
  "volt": "volt"
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
├── tsdown.config.ts
├── .env
└── .voltagent/ (created automatically when you run the agent)
```

</StepSection>

<StepSection stepNumber={6} title="Run Your Agent">

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

You should see the VoltAgent server startup message:

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

</StepSection>

<StepSection stepNumber={7} title="Test Your Agent">

Open [`https://console.voltagent.dev`](https://console.voltagent.dev) and click **Agents & Workflows** in the sidebar to find your agent.

Select it, click the chat icon in the bottom right corner, and try sending a message like _"Hello"_.

You should receive a response from your AI agent. The `dev` script uses `tsx watch`, so it will automatically restart if you make changes to your code.

</StepSection>

## Next Steps

- [Tutorial](/tutorial/introduction) - Build agents with tools, memory, and integrations
- [Agent Configuration](../agents/overview.md) - Agent options and settings
- [Memory](../agents/memory/overview.md) - Conversation history and persistence
- [Tools](../agents/tools.md) - Create custom tools for your agent
