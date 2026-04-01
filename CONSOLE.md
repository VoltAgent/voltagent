<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/9d091b11-7eb5-448c-8574-155d9f20d3c0" />
</a>
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
    <strong>VoltOps is a framework-agnostic LLM observability platform designed to help you monitor, debug, and improve AI agents across any technology stack.</strong>
Unlike traditional text-based logging tools, VoltOps visualizes your agent workflows as interactive flowcharts, making complex multi-agent interactions instantly understandable.

</div>

<br/>

<div align="center">

[![Live Demo](https://img.shields.io/badge/Live-Demo-4baaaa.svg)](https://console.voltagent.dev/demo)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

<br/>

## What is VoltOps?

> **LLM Observability** is the practice of monitoring, tracking, and understanding the behavior of AI agents and language models in production. Unlike traditional software monitoring that focuses on system metrics, LLM observability provides visibility into the decision-making process, tool usage patterns, conversation flows, and performance characteristics of intelligent systems.

**VoltOps** is a framework-agnostic observability platform specifically designed for AI agents and LLM applications. Built by the team behind VoltAgent - an open-source AI agent framework - VoltOps addresses the real debugging challenges that arise when agents interact with tools, make complex decisions, and handle multi-step workflows.

Instead of relying on traditional text-based logs that become overwhelming with complex agent interactions, VoltOps provides:

- **Visual Workflow Monitoring**: Interactive flowcharts that show agent decision-making processes in real-time
- **Framework-Agnostic Integration**: Works with any technology stack through multiple integration options
- **Real-Time Debugging**: Watch your agents think and act with virtually zero latency between action and visualization
- **Complete Workflow Visibility**: Track entire agent processes from initial input to final response
- **Multi-Agent Coordination**: Visualize parent-child relationships and hierarchies across agent systems
- **Tool Execution Tracking**: Monitor complete tool call sequences with inputs, outputs, and performance metrics
- **Production-Ready Monitoring**: Get immediate alerts for failures, loops, and performance issues

VoltOps transforms the black-box nature of AI agents into transparent, understandable workflows that you can monitor, debug, and optimize.

<br/>

[![VoltAgent VoltOps Platform Demo](https://github.com/user-attachments/assets/0adbec33-1373-4cf4-b67d-825f7baf1cb4)](https://console.voltagent.dev/)

## Why VoltOps?

Building AI agents that work reliably in production is fundamentally different from traditional software development. Here's why standard monitoring approaches fall short and how VoltOps solves these challenges:

### The Problem: Traditional Monitoring Fails for AI

**AI Agents Are Black Boxes**
Unlike traditional applications where you can follow code paths, AI agents make decisions through neural networks. Without observability, you can't understand why an agent chose one tool over another, or why it generated a specific response.

**Complex Multi-Step Workflows**
Modern AI agents don't just answer questions - they plan, execute tools, analyze results, and make sequential decisions. When something goes wrong in a 10-step workflow, you need to see exactly where and why.

**Non-Deterministic Behavior**
The same input can produce different outputs with AI agents. This makes traditional debugging approaches ineffective. You need to track patterns across multiple executions to understand agent behavior.

**Tool Integration Complexity**
AI agents interact with external APIs, databases, and services. When tools fail or return unexpected data, you need visibility into the entire tool execution chain to diagnose issues.

### The Solution: Agent-Centric Observability

**Built by AI Agent Framework Builders**
VoltOps is built by the VoltAgent team - open source AI agent framework maintainers who understand the real challenges of building production AI agents. Every feature comes from actual pain points reported by developers building AI agents in production.

**Real-Time Visual Debugging**
Watch your agents think and act in real-time through interactive flowcharts. No waiting for batch processing or delayed dashboards - see execution flow as it happens.

**Framework-Agnostic Design**
Works with any technology stack through multiple integration options - from native SDK support to universal REST API integration. Whether you're using VoltAgent, Vercel AI SDK, or building custom solutions.

## ⚡ Quick Start

### Experience VoltOps Instantly

Try VoltOps with our interactive demo - no setup required:

**[🚀 Launch Live Demo](https://console.voltagent.dev/demo)**

### For VoltAgent Users (Zero Configuration)

If you're using VoltAgent Framework, observability is automatically enabled:

```bash
npm create voltagent-app@latest my-agent-app
cd my-agent-app
```

**Add your API key**: Create or edit the `.env` file in your project root and add your OpenAI API key:

```bash
OPENAI_API_KEY=your-api-key-here
```

_Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)_

Then, run your VoltAgent application locally. When you run the `dev` command (e.g., `npm run dev`), you should see the VoltAgent server startup message in your terminal:

```bash
══════════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
══════════════════════════════════════════════════
  ✓ HTTP Server:  http://localhost:3141
  ✓ Swagger UI:   http://localhost:3141/ui

  Test your agents with VoltOps Console: https://console.voltagent.dev
══════════════════════════════════════════════════
```

Visit [console.voltagent.dev](https://console.voltagent.dev/) to see your agent in real-time.

When you run a VoltAgent application locally with observability enabled, it exposes a local server (typically on port `3141`). The VoltOps connects directly to this local server via your browser.

- **Local Connection:** Communication happens directly between the console in your browser and your local agent process. No data is sent to external servers.
- **Real-time Data:** Observe agent activities as they happen.

### For Vercel AI SDK Users

Add observability to your existing Vercel AI applications:

```bash
npm install @voltagent/vercel-ai-exporter @opentelemetry/sdk-node @opentelemetry/auto-instrumentations-node
```

```typescript
import { VoltAgentExporter } from "@voltagent/vercel-ai-exporter";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

// Initialize VoltOps observability
const voltAgentExporter = new VoltAgentExporter({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY,
  secretKey: process.env.VOLTAGENT_SECRET_KEY,
  debug: true,
});

const sdk = new NodeSDK({
  traceExporter: voltAgentExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Your existing Vercel AI code with observability
const result = await generateText({
  model: openai("gpt-4o-mini"),
  prompt: "What's the weather like in Tokyo?",
  experimental_telemetry: {
    isEnabled: true,
    metadata: {
      agentId: "weather-assistant",
      userId: "demo-user",
      conversationId: "weather-chat",
    },
  },
});
```

### For Other Frameworks

#### JavaScript/TypeScript SDK

```bash
npm install @voltagent/sdk
```

```typescript
import { VoltAgentObservabilitySDK } from "@voltagent/sdk";

const sdk = new VoltAgentObservabilitySDK({
  baseUrl: "https://api.voltagent.dev",
  publicKey: "your-public-key",
  secretKey: "your-secret-key",
  autoFlush: true,
});

// Create a trace for your agent workflow
const trace = await sdk.trace({
  name: "Customer Support Query",
  agentId: "support-agent",
  input: { query: "How to reset password?" },
  userId: "user-123",
});

// Add an agent to handle the request
const agent = await trace.addAgent({
  name: "Support Agent",
  input: { query: "User needs password reset help" },
  instructions: "You are a helpful customer support agent.",
});

// Add tools, memory operations, retrievers as needed
const tool = await agent.addStandaloneTool({
  name: "knowledge-base-search",
  input: { query: "password reset procedure" },
});

await tool.success({
  output: { results: ["Reset via email", "Reset via SMS"] },
});

// Complete the workflow
await agent.success({
  output: { response: "Password reset link sent to user's email" },
});

await trace.end({ status: "completed" });
```

#### Python SDK

```bash
pip install voltagent
```

```python
import asyncio
from voltagent import VoltAgentSDK

async def main():
    sdk = VoltAgentSDK(
        base_url="https://api.voltagent.dev",
        public_key="your-public-key",
        secret_key="your-secret-key",
        auto_flush=True,
    )

    # Use context manager for automatic resource management
    async with sdk.trace(
        agentId="support-agent",
        input={"query": "How to reset password?"},
        userId="user-123",
    ) as trace:

        # Add an agent
        agent = await trace.add_agent({
            "name": "Support Agent",
            "input": {"query": "User needs password reset help"},
            "instructions": "You are a helpful customer support agent.",
        })

        # Add tools, memory operations, retrievers as needed
        tool = await agent.add_tool({
            "name": "knowledge-base-search",
            "input": {"query": "password reset procedure"},
        })

        await tool.success(
            output={"results": ["Reset via email", "Reset via SMS"]},
        )

        # Complete the agent
        await agent.success(
            output={"response": "Password reset link sent to user's email"},
        )

        # Trace automatically completes when exiting context

if __name__ == "__main__":
    asyncio.run(main())
```

#### Universal REST API

```bash
curl -X POST https://api.voltagent.dev/v1/traces \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "agentId": "my-agent",
    "input": {"query": "Hello"},
    "userId": "user-123"
  }'
```

## Key Features

VoltOps provides comprehensive observability capabilities through multiple views and advanced monitoring features:

### Console Views & Interface

#### 1. Real-Time Agent Visualization

- **What:** Visualize and debug your AI agent's execution flow in real-time with interactive flowcharts
- **Includes:** Visual timeline/graph of agent steps, function calls, tool usage, and decision-making processes

![Real-Time Agent Visualization](https://github.com/user-attachments/assets/736879b9-f2d1-4990-8b57-9038660dc77a)

#### 2. Agent Chat Playground

- **What:** Chat with your AI agents in real-time with built-in observability
- **Includes:** Interactive chat interface with live metrics, insights, and workflow visualization

![AI Agent Chat Playground](https://github.com/user-attachments/assets/d29892bd-b0e2-4352-95f8-f58b79d0f57e)

#### 3. Granular Workflow Inspection

- **What:** View detailed inputs, outputs, and parameters for each agent, memory, and tool call
- **Includes:** Complete visibility into messages (prompts, responses), internal logs, and execution details

![AI Agent Granular Visibility](https://github.com/user-attachments/assets/051f0289-d33a-46ba-9029-f62615276543)

#### 4. Agent Management Dashboard

- **What:** Displays a comprehensive list of active and recent agent sessions
- **Includes:** Quick overview, status tracking, and session management for all running agents

![agent-list](https://github.com/user-attachments/assets/bfb3d85f-6584-4271-8f4f-05aaad9dff7a)

### Core Monitoring Capabilities

- **Hierarchical Agent Tracking**: Visualize parent-child relationships and multi-level agent hierarchies
- **Complete Tool Execution Visibility**: Monitor tool calls with inputs, outputs, execution times, and success rates
- **Memory & Retrieval Operations**: Track data storage, retrieval, and vector database operations
- **Conversation Threading**: Track message connections across interactions and user intent progression
- **Token Usage Analytics**: Monitor prompt tokens, completion tokens, and total usage across all operations
- **Real-Time Monitoring**: Watch agent decision-making processes as they happen with sub-second latency
- **Instant Problem Detection**: Get immediate alerts for tool failures, agent loops, and performance spikes
- **Production-Ready Monitoring**: Built for scale with enterprise-grade reliability and security

### Integration & Compatibility

- **Framework-Agnostic Integration**: Works with VoltAgent, Vercel AI SDK, custom solutions, and any technology stack
- **Multiple Integration Methods**: Native SDKs, OpenTelemetry export, REST API, and automatic framework integration

## Supported Integrations

### Framework Integrations

- **[VoltAgent Framework](https://voltagent.dev/docs/observability/voltagent-framework)** - Zero-config integration for VoltAgent users
- **[Vercel AI SDK](https://voltagent.dev/docs/observability/vercel-ai)** - Add observability to your Vercel AI applications

### SDKs & APIs

- **[JavaScript/TypeScript SDK](https://voltagent.dev/docs/observability/js-ts-sdk)** - Universal SDK for any JS/TS application using `@voltagent/sdk`
- **[Python SDK](https://voltagent.dev/docs/observability/python-sdk)** - Universal SDK for Python applications using `voltagent`
- **REST API** - Universal integration for any programming language or framework

## Use Cases

VoltOps empowers teams building AI-driven applications across various domains:

- **Production AI Agent Monitoring**: Monitor customer-facing chatbots, virtual assistants, and automated support systems
- **Multi-Agent System Debugging**: Debug complex workflows involving multiple specialized agents working together
- **Tool Integration Troubleshooting**: Identify and resolve issues with external API calls, database queries, and service integrations
- **Performance Optimization**: Analyze agent behavior patterns to optimize response times and reduce costs
- **Quality Assurance**: Track agent decision quality and correlate user feedback with specific behaviors
- **Workflow Analysis**: Understand user intent progression and identify where conversations break down
- **Enterprise AI Governance**: Maintain visibility and control over AI systems at scale
- **Development & Testing**: Debug agent logic during development with real-time feedback
- **Customer Success**: Quickly resolve user issues by understanding exactly what happened in agent interactions
- **AI System Analytics**: Generate insights about agent usage patterns, popular workflows, and user engagement

## Built by the VoltAgent Team

VoltOps is developed by the team behind [VoltAgent](https://github.com/voltagent/voltagent), the open-source TypeScript framework for building AI agents. This means VoltOps is built by developers who understand the real challenges of building production AI agents because we face them ourselves every day.

Every feature in VoltOps comes from actual pain points experienced while building and maintaining AI agent applications, not theoretical problems. We focus on what actually matters when your agent fails in production and you need to understand why immediately.

## Enterprise

VoltOps offers enterprise features for teams that need advanced capabilities:

- **Self-Hosted Deployment**: Run VoltOps on your own infrastructure
- **Advanced Security**: SSO, RBAC, and compliance features
- **Custom Integrations**: Tailored integrations for your specific stack
- **Priority Support**: Dedicated support channels and SLA guarantees
- **Team Management**: Advanced user management and collaboration features

## Learning VoltOps

- **[Documentation](https://voltagent.dev/docs/observability/)**: Comprehensive guides for integration and usage
- **[Live Demo](https://console.voltagent.dev/demo)**: Experience VoltOps in action with interactive examples
- **[Integration Guides](https://voltagent.dev/docs/observability/integrations/)**: Step-by-step setup for different frameworks
- **[Blog](https://voltagent.dev/blog/)**: Technical insights and best practices for AI observability

## Community & Support

- **[Discord Community](https://s.voltagent.dev/discord)**: Join our community for questions, discussions, and support
- **[Documentation](https://voltagent.dev/docs/observability/)**: Comprehensive guides and API references
- **[GitHub Issues](https://github.com/voltagent/voltagent/issues)**: Report bugs or request features
- **[Twitter](https://twitter.com/voltagent_dev)**: Follow us for updates and announcements
