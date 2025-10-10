<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
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
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Build production-ready agents with memory, workflows, tools, and built-in LLM observability.
    <br />
    <br />
</div>

<div align="center">

[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

<br/>

<!-- <div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="flow" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div> -->

## What is VoltAgent?

**VoltAgent** is an open-source TypeScript framework for building production-grade AI agents. It lets you orchestrate agents, tools, and workflows with minimal setup.

Instead of shipping everything from scratch, VoltAgent gives you modular building blocks:

- **Core Runtime (`@voltagent/core`)**: Define agents with typed roles, tools, memory, and model providers in one place so everything stays organized.
- **Workflow Engine**: Describe multi-step automations declaratively rather than stitching together custom control flow.
- **Supervisors & Sub-Agents**: Run teams of specialized agents under a supervisor runtime that routes tasks and keeps them in sync.
- **Tool Registry & MCP**: Ship Zod-typed tools with lifecycle hooks and cancellation, and connect to [Model Context Protocol](https://modelcontextprotocol.io/) servers without extra glue code.
- **LLM Compatibility**: Swap between OpenAI, Anthropic, Google, or other providers by changing config, not rewriting agent logic.
- **Memory**: Attach durable memory adapters so agents remember important context across runs.
- **Retrieval & RAG**: Plug in retriever agents to pull facts from your data sources and ground responses (RAG) before the model answers.
- **Observability (`VoltOps`)**: VoltOps gives you LLM observability; trace every step, replay runs, and review audit trails in one dashboard.
- **Evals**: Ship guardrails faster by running agent eval suites alongside your workflows.

📖 **[Start with interactive tutorial](https://voltagent.dev/tutorial/introduction/)** to learn the fundamentals building AI Agents.

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

[![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)](https://console.voltagent.dev/)

## Built-in LLM Observability with VoltOps

VoltAgent comes with VoltOps, a powerful LLM observability platform built-in to help you monitor, debug, and optimize your agents in real-time.

### Observability & Tracing

Deep dive into agent execution flow with detailed traces and performance metrics.

<br/>

![VoltOps Observability Overview](https://cdn.voltagent.dev/console/observability.png)
![VoltOps Observability Timeline](https://cdn.voltagent.dev/console/observability-3.png)

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

![VoltOps Memory Detail](https://cdn.voltagent.dev/console/memory-2.png)
![VoltOps Memory Overview](https://cdn.voltagent.dev/console/memory.png)

### Prompt Builder

Design, test, and refine prompts directly in the console.

<br/>

![VoltOps Prompt Builder](https://cdn.voltagent.dev/console/prompt.png)

### Traces

Analyze complete execution traces to understand agent behavior and optimize performance.

<br/>

![VoltOps Traces](https://cdn.voltagent.dev/console/traces.png)

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

### Running Your First Workflow

Your new project also includes a powerful workflow engine. You can test the pre-built `expenseApprovalWorkflow` directly from the VoltOps console:

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

## Key Features

- **Agent Core:** Define agents with descriptions, LLM providers, tools, and memory management with full TypeScript type safety.
- **Workflow Engine:** Orchestrate complex, multi-step automations with a powerful and declarative API (`andThen`, `andAgent`, `andAll`, `andRace`, `andWhen`) with automatic type inference.
- **Multi-Agent Systems:** Build complex workflows using Supervisor Agents coordinating multiple specialized Sub-Agents with dynamic task delegation.
- **Tool Usage & Lifecycle:** Equip agents with custom or pre-built tools (functions) with type-safety (Zod), lifecycle hooks, and cancellation support to interact with external systems.
- **Flexible LLM Support:** Integrate seamlessly with various LLM providers (OpenAI, Anthropic, Google, etc.) via AI SDK and easily switch between models.
- **Memory Management:** Enable agents to retain context across interactions using different configurable memory providers (LibSQL, PostgreSQL, Supabase) with optional semantic search.
- **Observability & Debugging:** Visually monitor agent states, interactions, logs, and performance via the [VoltOps LLM Observability Platform](https://console.voltagent.dev) with built-in execution history and tracing.
- **Prompt Management:** Manage prompts with static instructions, dynamic runtime functions, or enterprise-grade VoltOps remote management with versioning and A/B testing.
- **Dynamic Agents:** Create adaptive agents that change behavior, models, and capabilities based on runtime context for multi-tenant applications and role-based access.
- **Evaluation Framework:** Test and improve agent quality with built-in Viteval integration for accuracy, relevance, and safety testing.
- **Custom API Endpoints:** Extend the VoltAgent API server with your own custom endpoints to build specialized functionality on top of the core framework.
- **Voice Interaction:** Build voice-enabled agents capable of speech recognition and synthesis using the `@voltagent/voice` package with OpenAI and ElevenLabs support.
- **Data Retrieval & RAG:** Integrate specialized retriever agents for efficient information fetching and **Retrieval-Augmented Generation (RAG)** from various sources (Pinecone, Qdrant, Chroma).
- **Model Context Protocol (MCP) Support:** Connect to external tool servers (HTTP/stdio) adhering to the [MCP standard](https://modelcontextprotocol.io/) for extended capabilities and act as an MCP server.
- **Structured Output:** Generate type-safe structured data with Zod schemas using AI SDK's experimental output features for both objects and constrained text.
- **Multi-modal Support:** Process images, audio, and other media types alongside text for comprehensive AI interactions.
- **Workflow Suspend & Resume:** Build long-running workflows with human-in-the-loop approvals and async task execution.
- **Framework Compatibility:** Designed for easy integration into existing Node.js applications and popular frameworks (Next.js, Express, Hono).

## Learning VoltAgent

- **[Documentation](https://voltagent.dev/docs/)**: Dive into guides, concepts, and tutorials.
- **[Examples](https://github.com/voltagent/voltagent/tree/main/examples)**: Explore practical implementations.
- **[Blog](https://voltagent.dev/blog/)**: Read more about technical insights, and best practices.

### MCP Server (@voltagent/mcp-docs-server)

Use our MCP server `@voltagent/mcp-docs-server` to teach your LLM how to use VoltAgent. This allows AI assistants to access VoltAgent documentation, examples, and changelogs directly.

## Contribution

We welcome contributions! Please refer to the contribution guidelines (link needed if available). Join our [Discord](https://s.voltagent.dev/discord) server for questions and discussions.

## Contributor ♥️ Thanks

Big thanks to everyone who's been part of the VoltAgent journey, whether you've built a plugin, opened an issue, dropped a pull request, or just helped someone out on Discord or GitHub Discussions.

VoltAgent is a community effort, and it keeps getting better because of people like you.

![Contributors](https://contrib.rocks/image?repo=voltagent/voltagent)

Your stars help us reach more developers! If you find VoltAgent useful, please consider giving us a star on GitHub to support the project and help others discover it.

## License

Licensed under the MIT License, Copyright © 2025-present VoltAgent.
