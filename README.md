<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/9259e833-0f5c-4eb6-8cc7-4e6930cc27e1" />
</a>

<br/>
<br/>
<div align="center">
English | <a href="i18n/README-cn-traditional.md">繁體中文</a> | <a href="i18n/README-cn-bsc.md">简体中文</a> | <a href="i18n/README-jp.md">日本語</a> | <a href="i18n/README-kr.md">한국어</a>
</div>

<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> 
</div>
</div>

<br/>

<div align="center">

[![GitHub stars](https://img.shields.io/github/stars/voltagent/voltagent?style=social)](https://github.com/voltagent/voltagent)
[![GitHub issues](https://img.shields.io/github/issues/voltagent/voltagent)](https://github.com/voltagent/voltagent/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/voltagent/voltagent)](https://github.com/voltagent/voltagent/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)

[![npm downloads](https://img.shields.io/npm/dm/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

<br/>

<div align="center">
⭐ Like what we're doing? Give us a star ⬆️
</div>

<br/>

**VoltAgent** is an open source TypeScript framework for building and orchestrating AI agents.
You can build production-ready agents with memory, workflows, tools, and built-in LLM observability.

## Why VoltAgent?

- **Production-Ready from Day One**: Ship agents with built-in memory, workflows, and observability instead of building infrastructure from scratch.
- **Code with Confidence**: Full TypeScript support with type-safe tools, automatic inference, and compile time safety across your entire agent system.
- **Debug Like a Pro**: Built-in VoltOps observability lets you trace every decision, monitor performance, and optimize workflows in real-time without external tools.
- **Build Complex Systems Simply**: Orchestrate multi-agent teams with supervisor coordination, declarative workflows, and modular architecture that scales from prototypes to production.

## Agent Development Platform

VoltAgent provides a complete platform for developing and monitoring AI agents through two complementary tools.

### Core Framework

With the core framework, you can build intelligent agents with memory, tools, and multi-step workflows while connecting to any AI provider. Create sophisticated multi-agent systems where specialized agents work together under supervisor coordination.

- **[Core Runtime](https://voltagent.dev/docs/agents/overview/) (`@voltagent/core`)**: Define agents with typed roles, tools, memory, and model providers in one place so everything stays organized.
- **[Workflow Engine](https://voltagent.dev/docs/workflows/overview/)**: Describe multi-step automations declaratively rather than stitching together custom control flow.
- **[Supervisors & Sub-Agents](https://voltagent.dev/docs/agents/sub-agents/)**: Run teams of specialized agents under a supervisor runtime that routes tasks and keeps them in sync.
- **[Tool Registry](https://voltagent.dev/docs/agents/tools/) & [MCP](https://voltagent.dev/docs/agents/mcp/)**: Ship Zod-typed tools with lifecycle hooks and cancellation, and connect to [Model Context Protocol](https://modelcontextprotocol.io/) servers without extra glue code.
- **[LLM Compatibility](https://voltagent.dev/docs/getting-started/providers-models/)**: Swap between OpenAI, Anthropic, Google, or other providers by changing config, not rewriting agent logic.
- **[Memory](https://voltagent.dev/docs/agents/memory/overview/)**: Attach durable memory adapters so agents remember important context across runs.
- **[Retrieval & RAG](https://voltagent.dev/docs/rag/overview/)**: Plug in retriever agents to pull facts from your data sources and ground responses (RAG) before the model answers.
- **[Evals](https://voltagent.dev/docs/evals/overview/)**: Ship guardrails faster by running agent eval suites alongside your workflows.

### VoltOps LLM Observability Platform

VoltAgent comes with built-in [VoltOps](#built-in-llm-observability-with-voltops) LLM observability to monitor and debug your agents in real-time with detailed execution traces, performance metrics, and visual dashboards. Inspect every decision your agents make, track tool usage, and optimize your workflows with built-in OpenTelemetry-based observability.

#### MCP Server (@voltagent/mcp-docs-server)

You can use the MCP server `@voltagent/mcp-docs-server` to teach your LLM how to use VoltAgent for AI-powered coding assistants like Claude, Cursor, or Windsurf. This allows AI assistants to access VoltAgent documentation, examples, and changelogs directly while you code.

📖 [How to setup MCP docs server](https://voltagent.dev/docs/getting-started/mcp-docs-server/)

## ⚡ Quick Start

Create a new VoltAgent project in seconds using the `create-voltagent-app` CLI tool:

```bash
npm create voltagent-app@latest
```

This command guides you through setup.

You'll see the starter code in `src/index.ts`, which now registers both an agent and a comprehensive workflow example found in `src/workflows/index.ts`.

```typescript
import { VoltAgent, Agent, Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { openai } from "@ai-sdk/openai";
import { expenseApprovalWorkflow } from "./workflows";
import { weatherTool } from "./tools";

// Create a logger instance
const logger = createPinoLogger({
  name: "my-agent-app",
  level: "info",
});

// Optional persistent memory (remove to use default in-memory)
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({ url: "file:./.voltagent/memory.db" }),
});

// A simple, general-purpose agent for the project.
const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that can check weather and help with various tasks",
  model: openai("gpt-4o-mini"),
  tools: [weatherTool],
  memory,
});

// Initialize VoltAgent with your agent(s) and workflow(s)
new VoltAgent({
  agents: {
    agent,
  },
  workflows: {
    expenseApprovalWorkflow,
  },
  server: honoServer(),
  logger,
});
```

Afterwards, navigate to your project and run:

```bash
npm run dev
```

When you run the dev command, tsx will compile and run your code. You should see the VoltAgent server startup message in your terminal:

```
══════════════════════════════════════════════════
VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
✓ HTTP Server: http://localhost:3141

Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

Your agent is now running! To interact with it:

1. Open the Console: Click the [VoltOps LLM Observability Platform](https://console.voltagent.dev) link in your terminal output (or copy-paste it into your browser).
2. Find Your Agent: On the VoltOps LLM Observability Platform page, you should see your agent listed (e.g., "my-agent").
3. Open Agent Details: Click on your agent's name.
4. Start Chatting: On the agent detail page, click the chat icon in the bottom right corner to open the chat window.
5. Send a Message: Type a message like "Hello" and press Enter.

![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)

### Running Your First Workflow

Your new project also includes a powerful workflow engine.

The expense approval workflow demonstrates human-in-the-loop automation with suspend/resume capabilities:

```typescript
import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";

export const expenseApprovalWorkflow = createWorkflowChain({
  id: "expense-approval",
  name: "Expense Approval Workflow",
  purpose: "Process expense reports with manager approval for high amounts",

  input: z.object({
    employeeId: z.string(),
    amount: z.number(),
    category: z.string(),
    description: z.string(),
  }),
  result: z.object({
    status: z.enum(["approved", "rejected"]),
    approvedBy: z.string(),
    finalAmount: z.number(),
  }),
})
  // Step 1: Validate expense and check if approval needed
  .andThen({
    id: "check-approval-needed",
    resumeSchema: z.object({
      approved: z.boolean(),
      managerId: z.string(),
      comments: z.string().optional(),
      adjustedAmount: z.number().optional(),
    }),
    execute: async ({ data, suspend, resumeData }) => {
      // If we're resuming with manager's decision
      if (resumeData) {
        return {
          ...data,
          approved: resumeData.approved,
          approvedBy: resumeData.managerId,
          finalAmount: resumeData.adjustedAmount || data.amount,
        };
      }

      // Check if manager approval is needed (expenses over $500)
      if (data.amount > 500) {
        await suspend("Manager approval required", {
          employeeId: data.employeeId,
          requestedAmount: data.amount,
        });
      }

      // Auto-approve small expenses
      return {
        ...data,
        approved: true,
        approvedBy: "system",
        finalAmount: data.amount,
      };
    },
  })
  // Step 2: Process the final decision
  .andThen({
    id: "process-decision",
    execute: async ({ data }) => {
      return {
        status: data.approved ? "approved" : "rejected",
        approvedBy: data.approvedBy,
        finalAmount: data.finalAmount,
      };
    },
  });
```

You can test the pre-built `expenseApprovalWorkflow` directly from the VoltOps console:

![VoltOps Workflow Observability](https://github.com/user-attachments/assets/9b877c65-f095-407f-9237-d7879964c38a)

1.  **Go to the Workflows Page:** After starting your server, go directly to the [Workflows page](https://console.voltagent.dev/workflows).
2.  **Select Your Project:** Use the project selector to choose your project (e.g., "my-agent-app").
3.  **Find and Run:** You will see **"Expense Approval Workflow"** listed. Click it, then click the **"Run"** button.
4.  **Provide Input:** The workflow expects a JSON object with expense details. Try a small expense for automatic approval:
    ```json
    {
      "employeeId": "EMP-123",
      "amount": 250,
      "category": "office-supplies",
      "description": "New laptop mouse and keyboard"
    }
    ```
5.  **View the Results:** After execution, you can inspect the detailed logs for each step and see the final output directly in the console.

## Built-in LLM Observability with VoltOps

VoltAgent comes with VoltOps, a LLM observability platform built-in to help you monitor, debug, and optimize your agents in real-time.

🎬 [Try Live Demo](https://console.voltagent.dev/demo)

📖 [VoltOps Documentation](https://voltagent.dev/voltops-llm-observability-docs/)

🚀 [VoltOps Platform](https://voltagent.dev/voltops-llm-observability/)

### Observability & Tracing

Deep dive into agent execution flow with detailed traces and performance metrics.

<br/>

![VoltOps Observability Overview](https://cdn.voltagent.dev/console/observability.png)

### Dashboard

Get a comprehensive overview of all your agents, workflows, and system performance metrics.

<br/>

![VoltOps Dashboard](https://cdn.voltagent.dev/console/dashboard.png)

### Logs

Track detailed execution logs for every agent interaction and workflow step.
<br/>

![VoltOps Logs](https://cdn.voltagent.dev/console/logs.png)

### Memory Management

Inspect and manage agent memory, context, and conversation history.

<br/>

![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### Traces

Analyze complete execution traces to understand agent behavior and optimize performance.

<br/>

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

### Prompt Builder

Design, test, and refine prompts directly in the console.

<br/>

![VoltOps Prompt Builder](https://cdn.voltagent.dev/console/prompt.png)

### Deployment

Deploy your agents to production with one-click GitHub integration and managed infrastructure.

<br/>

![VoltOps Deploy](https://cdn.voltagent.dev/website/feature-showcase/deployment.png)

📖 [VoltOps Deploy Documentation](https://voltagent.dev/docs/deployment/voltops/)

## Examples

Explore real-world implementations of VoltAgent with complete source code and video tutorials.

For more examples and use cases, visit our [examples repository](https://github.com/VoltAgent/voltagent/tree/main/examples).

### WhatsApp Order Agent

Build a WhatsApp chatbot that handles food orders through natural conversation, manages menu items from a database, and processes orders with full conversation context.

<br/>

<img width="1111" height="347" alt="whatsapp" src="https://github.com/user-attachments/assets/dc9c4986-3e68-42f8-a450-ecd79b4dbd99" />

<br/>
<br/>

- 📖 [Tutorial](https://voltagent.dev/examples/agents/whatsapp-ai-agent)
- 💻 [Source Code](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp)

### YouTube to Blog Agent

Convert YouTube videos into Markdown blog posts using a supervisor agent that coordinates subagents with MCP tools, shared working memory, and VoltOps observability.

<br/>

<img width="1113" height="363" alt="youtube" src="https://github.com/user-attachments/assets/f9c944cf-8a9a-4ac5-a5f9-860ce08f058b" />

<br/>
<br/>

- 📖 [Tutorial](https://voltagent.dev/examples/agents/youtube-blog-agent)
- 💻 [Source Code](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog)

### AI Ads Generator Agent

Implement an Instagram ad generator that uses BrowserBase Stagehand to analyze landing pages, extract brand data, and generate visuals through Google Gemini AI.

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator">
<img width="1115" height="363" alt="instagram" src="https://github.com/user-attachments/assets/973e79c7-34ec-4f8e-8a41-9273d44234c6" />
</a>

<br/>
<br/>

- 📖 [Tutorial](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)
- 💻 [Source Code](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator)

### AI Recipe Generator Agent

Build an intelligent recipe recommendation system that creates personalized cooking suggestions based on available ingredients, dietary preferences, and time constraints.

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator">
<img width="1111" height="363" alt="cook" src="https://github.com/user-attachments/assets/dde6ce2f-c963-4075-9825-f216bc6e3467" />
</a>

<br/>
<br/>

- 📖 [Tutorial](https://voltagent.dev/examples/agents/recipe-generator)
- 📹 [Watch Video](https://youtu.be/KjV1c6AhlfY)
- 💻 [Source Code](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator)

### AI Research Assistant Agent

Create a multi-agent research workflow where different AI agents collaborate to research topics and generate comprehensive reports with type-safe data flow.

<br/>

<a href="https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant">
<img width="2228" height="678" alt="research" src="https://github.com/user-attachments/assets/8f459748-132e-4ff3-9afe-0561fa5075c2" />
</a>

<br/>
<br/>

- 📖 [Tutorial](https://voltagent.dev/examples/agents/research-assistant)
- 📹 [Watch Video](https://youtu.be/j6KAUaoZMy4)
- 💻 [Source Code](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant)

## Use Cases

Build AI agents for real-world business needs across different industries:

- **[HR Agent](https://voltagent.dev/use-cases/hr-agent/)** - Automate recruiting, employee onboarding, and HR support tasks.
- **[Customer Support Agent](https://voltagent.dev/use-cases/customer-support-agent/)** - Build support agents that handle customer questions and issues.
- **[Sales Teams](https://voltagent.dev/use-cases/sales-teams/)** - Qualify leads, gather customer data, and personalize sales outreach.
- **[Finance Agent](https://voltagent.dev/use-cases/finance-agent/)** - Manage invoices, track expenses, and generate financial reports.
- **[Development Agent](https://voltagent.dev/use-cases/development-agent/)** - Review code, manage deployments, and help development teams.
- **[Marketing Agent](https://voltagent.dev/use-cases/marketing-agent/)** - Plan campaigns, create content, and analyze marketing performance.
- **[Legal Agent](https://voltagent.dev/use-cases/legal-agent/)** - Review contracts, check compliance, and handle legal tasks.
- **[Insurance Agent](https://voltagent.dev/use-cases/insurance-agent/)** - Process claims, evaluate risks, and manage policies.
- **[Industrial Agent](https://voltagent.dev/use-cases/industrial-agent/)** - Monitor equipment, predict maintenance needs, and ensure safety.
- **[Education Agent](https://voltagent.dev/use-cases/education-agent/)** - Provide personalized tutoring, track student progress, and support learning.
- **[Government Agent](https://voltagent.dev/use-cases/government-agent/)** - Handle permit applications, process benefits, and serve citizens.
- **[Documentation Agent](https://voltagent.dev/use-cases/documentation-agent/)** - Create API docs, write changelogs, and generate tutorials from code.

## Learning VoltAgent

- 📖 **[Start with interactive tutorial](https://voltagent.dev/tutorial/introduction/)** to learn the fundamentals building AI Agents.
- **[Documentation](https://voltagent.dev/docs/)**: Dive into guides, concepts, and tutorials.
- **[Examples](https://github.com/voltagent/voltagent/tree/main/examples)**: Explore practical implementations.
- **[Blog](https://voltagent.dev/blog/)**: Read more about technical insights, and best practices.

## Contribution

We welcome contributions! Please refer to the contribution guidelines (link needed if available). Join our [Discord](https://s.voltagent.dev/discord) server for questions and discussions.

## Contributor ♥️ Thanks

Big thanks to everyone who's been part of the VoltAgent journey, whether you've built a plugin, opened an issue, dropped a pull request, or just helped someone out on Discord or GitHub Discussions.

VoltAgent is a community effort, and it keeps getting better because of people like you.

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent&max=100)

Your stars help us reach more developers! If you find VoltAgent useful, please consider giving us a star on GitHub to support the project and help others discover it.

## License

Licensed under the MIT License, Copyright © 2025-present VoltAgent.
