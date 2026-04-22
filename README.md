<div align="center">
<a href="https://voltagent.dev/">
<img width="1500" height="276" alt="voltagent" src="https://github.com/user-attachments/assets/d9ad69bd-b905-42a3-81af-99a0581348c0" />
</a>

<h3 align="center">
AI Agent Engineering Platform
</h3>

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

[![GitHub issues](https://img.shields.io/github/issues/voltagent/voltagent)](https://github.com/voltagent/voltagent/issues)
[![GitHub pull requests](https://img.shields.io/github/issues-pr/voltagent/voltagent)](https://github.com/voltagent/voltagent/pulls)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)

[![npm downloads](https://img.shields.io/npm/dm/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://x.com/voltagent_dev)

</div>

<h3 align="center">
⭐ Like what we're doing? Give us a star ⬆️
</h3>

VoltAgent is an end-to-end AI Agent Engineering Platform that consists of two main parts:

- **[Open-Source TypeScript Framework](#core-framework)** – Memory, RAG, Guardrails, Tools, MCP, Voice, Workflow, and more.
- **[VoltOps Console](#voltops-console)** `Cloud` `Self-Hosted` – Observability, Automation, Deployment, Evals, Guardrails, Prompts, and more.

Build agents with full code control and ship them with production-ready visibility and operations.

<h2 id="core-framework">Core TypeScript Framework</h2>

With the open-source framework, you can build intelligent agents with memory, tools, and multi-step workflows while connecting to any AI provider. Create sophisticated multi-agent systems where specialized agents work together under supervisor coordination.

- **[Core Runtime](https://voltagent.dev/docs/agents/overview/) (`@voltagent/core`)**: Define agents with typed roles, tools, memory, and model providers in one place so everything stays organized.
- **[Workflow Engine](https://voltagent.dev/docs/workflows/overview/)**: Describe multi-step automations declaratively rather than stitching together custom control flow.
- **[Supervisors & Sub-Agents](https://voltagent.dev/docs/agents/sub-agents/)**: Run teams of specialized agents under a supervisor runtime that routes tasks and keeps them in sync.
- **[Tool Registry](https://voltagent.dev/docs/agents/tools/) & [MCP](https://voltagent.dev/docs/agents/mcp/)**: Ship Zod-typed tools with lifecycle hooks and cancellation, and connect to [Model Context Protocol](https://modelcontextprotocol.io/) servers without extra glue code.
- **[LLM Compatibility](https://voltagent.dev/docs/getting-started/providers-models/)**: Swap between OpenAI, Anthropic, Google, or other providers by changing config, not rewriting agent logic.
- **[Memory](https://voltagent.dev/docs/agents/memory/overview/)**: Attach durable memory adapters so agents remember important context across runs.
- **[Resumable Streaming](https://voltagent.dev/docs/agents/resumable-streaming/)**: Let clients reconnect to in-flight streams after refresh and continue receiving the same response.
- **[Retrieval & RAG](https://voltagent.dev/docs/rag/overview/)**: Plug in retriever agents to pull facts from your data sources and ground responses (RAG) before the model answers.
- **[VoltAgent Knowledge Base](https://voltagent.dev/docs/rag/voltagent/)**: Use the managed RAG service for document ingestion, chunking, embeddings, and search.
- **[Voice](https://voltagent.dev/docs/agents/voice/)**: Add text-to-speech and speech-to-text capabilities with OpenAI, ElevenLabs, or custom voice providers.
- **[Guardrails](https://voltagent.dev/docs/guardrails/overview/)**: Intercept and validate agent input or output at runtime to enforce content policies and safety rules.
- **[Evals](https://voltagent.dev/docs/evals/overview/)**: Run agent eval suites alongside your workflows to measure and improve agent behavior.

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

[![VoltAgent Demo](thumbnail.png)](https://github.com/user-attachments/assets/26340c6a-be34-48a5-9006-e822bf6098a7)

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

[![expense-approval](thumbnail.png)](https://github.com/user-attachments/assets/3d3ea67b-4ab5-4dc0-932d-cedd92894b18)

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

## Examples

For more examples, visit our [examples repository](https://github.com/VoltAgent/voltagent/tree/main/examples).

- **[Airtable Agent](https://voltagent.dev/examples/guides/airtable-agent)** - React to new records and write updates back into Airtable with VoltOps actions.
- **[Slack Agent](https://voltagent.dev/examples/guides/slack-agent)** - Respond to channel messages and reply via VoltOps Slack actions.
- **[ChatGPT App With VoltAgent](https://voltagent.dev/examples/agents/chatgpt-app)** - Deploy VoltAgent over MCP and connect to ChatGPT Apps.
- **[WhatsApp Order Agent](https://voltagent.dev/examples/agents/whatsapp-ai-agent)** - Build a WhatsApp chatbot that handles food orders through natural conversation. ([Source](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp))
- **[YouTube to Blog Agent](https://voltagent.dev/examples/agents/youtube-blog-agent)** - Convert YouTube videos into Markdown blog posts using a supervisor agent with MCP tools. ([Source](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog))
- **[AI Ads Generator Agent](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)** - Generate Instagram ads using BrowserBase Stagehand and Google Gemini AI. ([Source](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator))
- **[AI Recipe Generator Agent](https://voltagent.dev/examples/agents/recipe-generator)** - Create personalized cooking suggestions based on ingredients and preferences. ([Source](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator) | [Video](https://youtu.be/KjV1c6AhlfY))
- **[AI Research Assistant Agent](https://voltagent.dev/examples/agents/research-assistant)** - Multi-agent research workflow for generating comprehensive reports. ([Source](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant) | [Video](https://youtu.be/j6KAUaoZMy4))

<h2 id="voltops-console">VoltOps Console: LLM Observability - Automation - Deployment</h2>

VoltOps Console is the platform side of VoltAgent, providing observability, automation, and deployment so you can monitor and debug agents in production with real-time execution traces, performance metrics, and visual dashboards.

🎬 [Try Live Demo](https://console.voltagent.dev/demo)

📖 [VoltOps Documentation](https://voltagent.dev/voltops-llm-observability-docs/)

🚀 [VoltOps Platform](https://voltagent.dev/voltops-llm-observability/)

### Observability & Tracing

Deep dive into agent execution flow with detailed traces and performance metrics.

<img alt="1" src="https://github.com/user-attachments/assets/21c6d05d-f333-4c61-9218-8862d16110fd" />

### Dashboard

Get a comprehensive overview of all your agents, workflows, and system performance metrics.

<img alt="dashboar" src="https://github.com/user-attachments/assets/c88a5543-219e-4cf0-8f41-14a68ca297fb" />

### Logs

Track detailed execution logs for every agent interaction and workflow step.

![VoltOps Logs](https://cdn.voltagent.dev/console/logs.png)

### Memory Management

Inspect and manage agent memory, context, and conversation history.

![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### Traces

Analyze complete execution traces to understand agent behavior and optimize performance.

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

### Prompt Builder

Design, test, and refine prompts directly in the console.

<img  alt="prompts" src="https://github.com/user-attachments/assets/fb6d71eb-8f81-4443-a494-08c33ec9bcc4" />

### Deployment

Deploy your agents to production with one-click GitHub integration and managed infrastructure.

<img alt="deployment" src="https://github.com/user-attachments/assets/e329ab4b-7464-435a-96cc-90214e8a3cfa" />

📖 [VoltOps Deploy Documentation](https://voltagent.dev/docs/deployment/voltops/)

### Triggers & Actions

Automate agent workflows with webhooks, schedules, and custom triggers to react to external events.

<img width="1277"  alt="triggers" src="https://github.com/user-attachments/assets/67e36934-2eb5-4cf1-94f8-3057d805ef65" />

### Monitoring

Monitor agent health, performance metrics, and resource usage across your entire system.

<img  alt="monitoring" src="https://github.com/user-attachments/assets/1fd1151f-5ee4-4c7c-8ec7-29874e37c48f" />

### Guardrails

Set up safety boundaries and content filters to ensure agents operate within defined parameters.

<img  alt="guardrails" src="https://github.com/user-attachments/assets/52bd51f0-944e-4202-9f54-7bb2e0e2d1f6" />

### Evals

Run evaluation suites to test agent behavior, accuracy, and performance against benchmarks.

<img  alt="evals" src="https://github.com/user-attachments/assets/510cc180-2661-4973-a48f-074d4703d90b" />

### RAG (Knowledge Base)

Connect your agents to knowledge sources with built-in retrieval-augmented generation capabilities.

<img  alt="rag" src="https://github.com/user-attachments/assets/a6c2f668-7ad1-4fb6-b67f-654335285f1e" />

## ❓ FAQ & Troubleshooting

### Common Questions

**Q: Which AI providers does VoltAgent support?**

A: VoltAgent supports OpenAI, Anthropic, Google, and other major providers through the [LLM Compatibility layer](https://voltagent.dev/docs/getting-started/providers-models/). You can switch providers by changing configuration without rewriting agent logic.

**Q: How do I add memory to my agents?**

A: Attach memory adapters to your agents using the [Memory system](https://voltagent.dev/docs/agents/memory/overview/). VoltAgent provides durable memory adapters that persist context across runs.

**Q: Can I use VoltAgent with MCP servers?**

A: Yes! VoltAgent has native [MCP support](https://voltagent.dev/docs/agents/mcp/) and even provides an [MCP docs server](https://voltagent.dev/docs/getting-started/mcp-docs-server/) for AI coding assistants like Claude, Cursor, or Windsurf.

**Q: How do I deploy my agents to production?**

A: Use [VoltOps Console](https://voltagent.dev/voltops-llm-observability/) for one-click deployment with GitHub integration, or self-host using the [deployment guide](https://voltagent.dev/docs/deployment/voltops/).

**Q: Does VoltAgent support voice interactions?**

A: Yes, VoltAgent includes [Voice capabilities](https://voltagent.dev/docs/agents/voice/) with support for OpenAI, ElevenLabs, and custom voice providers for text-to-speech and speech-to-text.

### Troubleshooting

**Issue: Agent not responding or hanging**

- Check your API keys are correctly configured in environment variables
- Verify the model provider is accessible and has available quota
- Enable [resumable streaming](https://voltagent.dev/docs/agents/resumable-streaming/) to debug execution flow
- Check [VoltOps Observability](https://voltagent.dev/voltops-llm-observability/) for detailed traces

**Issue: Memory not persisting between runs**

- Ensure you've attached a memory adapter to your agent
- Verify the memory storage backend (Redis, SQLite, etc.) is running
- Check memory configuration in your agent options

**Issue: Tools not being called correctly**

- Verify tool schemas are correctly defined with Zod
- Check that tool names match between definition and usage
- Review [Tool Registry documentation](https://voltagent.dev/docs/agents/tools/) for proper setup
- Enable debug logging to see tool invocation details

**Issue: RAG retrieval returning irrelevant results**

- Review your chunking strategy and chunk sizes
- Check embedding model configuration
- Verify documents are properly ingested in the [Knowledge Base](https://voltagent.dev/docs/rag/voltagent/)
- Consider adjusting similarity search thresholds

**Getting More Help**

- 📚 Browse the full [Documentation](https://voltagent.dev/docs/)
- 💬 Join our [Discord community](https://s.voltagent.dev/discord) for real-time help
- 🐛 Report bugs via [GitHub Issues](https://github.com/VoltAgent/voltagent/issues)
- 📖 Read technical insights on our [Blog](https://voltagent.dev/blog/)

## Learning VoltAgent

- **[Start with interactive tutorial](https://voltagent.dev/tutorial/introduction/)** to learn the fundamentals building AI Agents.
- **[Documentation](https://voltagent.dev/docs/)**: Dive into guides, concepts, and tutorials.
- **[Examples](https://github.com/voltagent/voltagent/tree/main/examples)**: Explore practical implementations.
- **[Blog](https://voltagent.dev/blog/)**: Read more about technical insights, and best practices.

## Contribution

We welcome contributions! Please refer to the contribution guidelines (link needed if available). Join our [Discord](https://s.voltagent.dev/discord) server for questions and discussions.

## Contributor ♥️ Thanks

Big thanks to everyone who's been part of the VoltAgent journey, whether you've built a plugin, opened an issue, dropped a pull request, or just helped someone out on Discord or GitHub Discussions.

VoltAgent is a community effort, and it keeps getting better because of people like you.

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent&max=500&columns=20&anon=1)

## License

Licensed under the MIT License, Copyright © 2026-present VoltAgent.
