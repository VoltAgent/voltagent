# AI Agent Examples

<div align="center">
<a href="https://github.com/VoltAgent/voltagent/">
<img width="1500" height="276" alt="ai agent examples" src="https://github.com/user-attachments/assets/1cbeb36f-21f0-4f78-beb8-076ee1bb6cfd" />
</a>
</div>

<br/>

<div align="center">
  
[![npm downloads](https://img.shields.io/npm/dm/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)

</div>

Each folder here contains a runnable example demonstrating how to build or integrate an AI Agent using [VoltAgent](https://github.com/VoltAgent/voltagent). These projects demonstrate RAG retrieval, typed tools, persistent memory, supervisor-subagent orchestration, workflows, MCP tool integration, and voice/UX integrations. Use them as reference implementations or starting points for your applications.

VoltAgent is a TypeScript-based framework for building AI agents with modern tooling. Get started with the [tutorial](https://voltagent.dev/tutorial/introduction/) to learn the fundamentals and build your first agent.

## What You'll Build

- **RAG & Retrieval** — Vector search with Pinecone, Chroma, Qdrant, and Postgres
- **Typed Tools** — Zod-validated tools, MCP servers, and external API integrations
- **Memory Systems** — Working memory, persistent storage, and context management
- **Multi-Agent Orchestration** — Supervisor patterns, sub-agents, and workflows
- **Deployments** — Next.js, Cloudflare Workers, Netlify Functions, and more

## Featured Examples

### [WhatsApp Order Agent](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp)

A WhatsApp chatbot that handles restaurant orders through natural language. Manages menu items from a database and processes orders with conversation context.

<br/>

<img alt="WhatsApp AI Agent Screenshot" src="https://github.com/user-attachments/assets/dc9c4986-3e68-42f8-a450-ecd79b4dbd99" />

<br/>

**Bootstrap this example:**

```bash
npm create voltagent@latest -- --example with-whatsapp
```

**Run the agent:**

```bash
npm run dev
```

📖 [Full tutorial](https://voltagent.dev/examples/agents/whatsapp-ai-agent)

---

### [YouTube to Blog Agent](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog)

Converts YouTube videos into Markdown blog posts. Uses a supervisor agent coordinating specialized sub-agents with MCP tools, shared working memory, and VoltOps observability.

<br/>

<img alt="YouTube to Blog Agent Screenshot" src="https://github.com/user-attachments/assets/f9c944cf-8a9a-4ac5-a5f9-860ce08f058b" />

<br/>

**Bootstrap this example:**

```bash
npm create voltagent@latest -- --example with-youtube-to-blog
```

**Run the agent:**

```bash
npm run dev
```

📖 [Full tutorial](https://voltagent.dev/examples/agents/youtube-blog-agent)

---

### [AI Ads Generator Agent](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator)

Generates Instagram ads by analyzing landing pages with BrowserBase Stagehand. Extracts brand identity, messaging, and visual elements, then creates ads using Google Gemini AI.

<br/>

<img alt="AI Instagram Ad Generator Screenshot" src="https://github.com/user-attachments/assets/973e79c7-34ec-4f8e-8a41-9273d44234c6" />

<br/>

**Bootstrap this example:**

```bash
npm create voltagent@latest -- --example with-ad-creator
```

**Run the agent:**

```bash
npm run dev
```

📖 [Full tutorial](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)

---

### [AI Recipe Generator Agent](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator)

A recipe recommendation system that creates cooking suggestions based on available ingredients, dietary preferences, time constraints, and skill level.

<br/>

<img alt="Recipe Generator Agent Screenshot" src="https://github.com/user-attachments/assets/dde6ce2f-c963-4075-9825-f216bc6e3467" />

<br/>

**Bootstrap this example:**

```bash
npm create voltagent@latest -- --example with-recipe-generator
```

**Run the agent:**

```bash
npm run dev
```

📖 [Full tutorial](https://voltagent.dev/examples/agents/recipe-generator)

📹 [Video walkthrough](https://youtu.be/KjV1c6AhlfY)

---

### [AI Research Assistant Agent](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant)

A multi-agent research workflow where specialized AI agents collaborate to research topics and generate reports. Features type-safe data flow and structured coordination patterns.

<br/>

<img alt="Research Assistant Agent Screenshot" src="https://github.com/user-attachments/assets/8f459748-132e-4ff3-9afe-0561fa5075c2" />

<br/>

**Bootstrap this example:**

```bash
npm create voltagent@latest -- --example with-research-assistant
```

**Run the agent:**

```bash
npm run dev
```

📖 [Full tutorial](https://voltagent.dev/examples/agents/research-assistant)

📹 [Video walkthrough](https://youtu.be/j6KAUaoZMy4)

---

## All Examples

### Getting Started

- **[AI Agent Base Starter](https://github.com/VoltAgent/voltagent/tree/main/examples/base)** — A minimal AI agent project with a single agent, in-memory storage, and a development server. Shows the core framework structure and basic agent configuration.
  ```bash
  npm create voltagent@latest -- --example base
  ```

### AI Providers

- **[AI Agent with Anthropic Claude](https://github.com/VoltAgent/voltagent/tree/main/examples/with-anthropic)** — Integrates Claude models (Sonnet, Opus, Haiku) using the Vercel AI SDK. Shows configuration, streaming responses, and patterns for working with Anthropic's language models.

  ```bash
  npm create voltagent@latest -- --example with-anthropic
  ```

  📚 Related docs: [AI Providers](https://voltagent.dev/docs/agents/providers) • [Agent Overview](https://voltagent.dev/docs/agents/overview)

- **[AI Agent with Google Gemini](https://github.com/VoltAgent/voltagent/tree/main/examples/with-google-ai)** — Connects to Google's Gemini models for multimodal AI. Demonstrates image inputs, API configuration, and using Gemini's reasoning features in agent workflows.

  ```bash
  npm create voltagent@latest -- --example with-google-ai
  ```

  📚 Related docs: [AI Providers](https://voltagent.dev/docs/agents/providers) • [Multi-Modal Agents](https://voltagent.dev/docs/agents/multi-modal)

- **[AI Agent with Google Vertex AI](https://github.com/VoltAgent/voltagent/tree/main/examples/with-google-vertex-ai)** — Integrates with Google Cloud's Vertex AI platform. Includes service account setup, model selection, and deployment patterns for GCP infrastructure.

  ```bash
  npm create voltagent@latest -- --example with-google-vertex-ai
  ```

  📚 Related docs: [AI Providers](https://voltagent.dev/docs/agents/providers)

- **[AI Agent with Groq](https://github.com/VoltAgent/voltagent/tree/main/examples/with-groq-ai)** — Uses Groq's LPU architecture for low-latency inference. Supports Llama, Mixtral, and other open-source models for real-time applications.

  ```bash
  npm create voltagent@latest -- --example with-groq-ai
  ```

  📚 Related docs: [AI Providers](https://voltagent.dev/docs/agents/providers)

- **[AI Agent with xAI Grok](https://github.com/VoltAgent/voltagent/tree/main/examples/with-xsai)** — Integrates xAI's Grok models. Shows API configuration, model parameters, and building agents with access to real-time knowledge.

  ```bash
  npm create voltagent@latest -- --example with-xsai
  ```

  📚 Related docs: [AI Providers](https://voltagent.dev/docs/agents/providers)

- **[AI Agent with Amazon Bedrock](https://github.com/VoltAgent/voltagent/tree/main/examples/with-amazon-bedrock)** — Accesses foundation models from Amazon, Anthropic, Cohere, and others through AWS Bedrock. Shows credential configuration and model selection for AWS deployments.

  ```bash
  npm create voltagent@latest -- --example with-amazon-bedrock
  ```

  📚 Related docs: [AI Providers](https://voltagent.dev/docs/agents/providers)

- **[AI Agent with Vercel AI SDK](https://github.com/VoltAgent/voltagent/tree/main/examples/with-vercel-ai)** — Uses the Vercel AI SDK for streaming, function calling, and multi-provider support. Shows edge-optimized deployments and streaming patterns for web applications.
  ```bash
  npm create voltagent@latest -- --example with-vercel-ai
  ```
  📚 Related docs: [Vercel AI Integration](https://voltagent.dev/docs/integrations/vercel-ai) • [AI Providers](https://voltagent.dev/docs/agents/providers)

### RAG & Vector Search

- **[AI Agent with Chroma Vector Database](https://github.com/VoltAgent/voltagent/tree/main/examples/with-chroma)** — Implements RAG with Chroma's open-source vector database. Compares automatic retrieval patterns versus tool-driven approaches, including document ingestion and semantic search.

  ```bash
  npm create voltagent@latest -- --example with-chroma
  ```

  📚 Related docs: [Chroma Integration](https://voltagent.dev/docs/rag/chroma) • [RAG Overview](https://voltagent.dev/docs/rag/overview)

- **[AI Agent with Pinecone](https://github.com/VoltAgent/voltagent/tree/main/examples/with-pinecone)** — RAG using Pinecone's managed vector database. Shows namespace management, metadata filtering, hybrid search, and scaling patterns for high-traffic applications.

  ```bash
  npm create voltagent@latest -- --example with-pinecone
  ```

  📚 Related docs: [Pinecone Integration](https://voltagent.dev/docs/rag/pinecone) • [RAG Overview](https://voltagent.dev/docs/rag/overview)

- **[AI Agent with Qdrant](https://github.com/VoltAgent/voltagent/tree/main/examples/with-qdrant)** — Implements RAG with Qdrant vector search. Shows retriever-on-every-turn versus LLM-decides-when-to-search patterns, including filtering and payload handling.

  ```bash
  npm create voltagent@latest -- --example with-qdrant
  ```

  📚 Related docs: [Qdrant Integration](https://voltagent.dev/docs/rag/qdrant) • [Custom Retrievers](https://voltagent.dev/docs/rag/custom-retrievers)

- **[AI Agent with PostgreSQL pgvector](https://github.com/VoltAgent/voltagent/tree/main/examples/with-postgres)** — Uses PostgreSQL with pgvector extension for vector similarity search alongside relational data. Shows schema design and similarity search queries.

  ```bash
  npm create voltagent@latest -- --example with-postgres
  ```

  📚 Related docs: [PostgreSQL Memory](https://voltagent.dev/docs/agents/memory/postgres) • [Semantic Search](https://voltagent.dev/docs/agents/memory/semantic-search)

- **[AI Agent with Vector Search](https://github.com/VoltAgent/voltagent/tree/main/examples/with-vector-search)** — Core semantic search implementation. Shows embedding generation, vector storage, and automatic context recall from past conversations and documents.

  ```bash
  npm create voltagent@latest -- --example with-vector-search
  ```

  📚 Related docs: [Semantic Search](https://voltagent.dev/docs/agents/memory/semantic-search) • [Memory Overview](https://voltagent.dev/docs/agents/memory/overview)

- **[RAG Chatbot AI Agent](https://github.com/VoltAgent/voltagent/tree/main/examples/with-rag-chatbot)** — A conversational AI agent grounded in your knowledge base. Features document citations, source attribution, and context-aware responses combining retrieval with generation.

  ```bash
  npm create voltagent@latest -- --example with-rag-chatbot
  ```

  📚 Related docs: [RAG Overview](https://voltagent.dev/docs/rag/overview) • [Custom Retrievers](https://voltagent.dev/docs/rag/custom-retrievers)

- **[AI Agent with Retrieval API](https://github.com/VoltAgent/voltagent/tree/main/examples/with-retrieval)** — Minimal example demonstrating VoltAgent's retriever API. Shows how retrievers connect to agents, embedding handling, and controlling retrieval timing in conversation flow.
  ```bash
  npm create voltagent@latest -- --example with-retrieval
  ```
  📚 Related docs: [Custom Retrievers](https://voltagent.dev/docs/rag/custom-retrievers) • [RAG Overview](https://voltagent.dev/docs/rag/overview)

### Tools & MCP

- **[AI Agent with Type-Safe Tools](https://github.com/VoltAgent/voltagent/tree/main/examples/with-tools)** — Shows how to create type-safe tools using Zod schemas, with support for cancellation signals and streaming results. Includes tool definition, parameter validation, and error handling.

  ```bash
  npm create voltagent@latest -- --example with-tools
  ```

  📚 Related docs: [Agent Tools](https://voltagent.dev/docs/agents/tools) • [Tools Overview](https://voltagent.dev/docs/tools/overview)

- **[AI Agent with MCP Client](https://github.com/VoltAgent/voltagent/tree/main/examples/with-mcp)** — Connects to Model Context Protocol (MCP) servers to enable agents to discover and call standardized tools. Shows client-side integration, server discovery, and tool enumeration.

  ```bash
  npm create voltagent@latest -- --example with-mcp
  ```

  📚 Related docs: [MCP Integration](https://voltagent.dev/docs/agents/mcp/mcp)

- **[AI Agent as MCP Server](https://github.com/VoltAgent/voltagent/tree/main/examples/with-mcp-server)** — Implements an MCP server that exposes custom tools following the Model Context Protocol specification. Shows server implementation, tool registration, and authentication.

  ```bash
  npm create voltagent@latest -- --example with-mcp-server
  ```

  📚 Related docs: [MCP Server](https://voltagent.dev/docs/agents/mcp/mcp-server)

- **[AI Agent with Composio MCP](https://github.com/VoltAgent/voltagent/tree/main/examples/with-composio-mcp)** — Accesses pre-built integrations through Composio's MCP server. Shows authentication, browsing available actions, and executing workflows for email, calendar, CRM, and other tools.

  ```bash
  npm create voltagent@latest -- --example with-composio-mcp
  ```

  📚 Related docs: [MCP Integration](https://voltagent.dev/docs/agents/mcp/mcp)

- **[AI Agent with Google Drive MCP](https://github.com/VoltAgent/voltagent/tree/main/examples/with-google-drive-mcp)** — Enables agents to browse, read, and interact with Google Drive files through an MCP server. Shows Drive API integration, OAuth authentication, and permission handling.

  ```bash
  npm create voltagent@latest -- --example with-google-drive-mcp
  ```

  📚 Related docs: [MCP Integration](https://voltagent.dev/docs/agents/mcp/mcp)

- **[AI Agent with Hugging Face MCP](https://github.com/VoltAgent/voltagent/tree/main/examples/with-hugging-face-mcp)** — Accesses Hugging Face's models and datasets through MCP. Shows searching the Hugging Face Hub, loading models, running inference, and accessing datasets.

  ```bash
  npm create voltagent@latest -- --example with-hugging-face-mcp
  ```

  📚 Related docs: [MCP Integration](https://voltagent.dev/docs/agents/mcp/mcp)

- **[AI Agent with Peaka MCP](https://github.com/VoltAgent/voltagent/tree/main/examples/with-peaka-mcp)** — Integrates Peaka's data connectivity platform through MCP. Shows connecting to multiple data sources, executing queries, and retrieving data through a unified interface.

  ```bash
  npm create voltagent@latest -- --example with-peaka-mcp
  ```

  📚 Related docs: [MCP Integration](https://voltagent.dev/docs/agents/mcp/mcp)

- **[AI Agent with Zapier MCP](https://github.com/VoltAgent/voltagent/tree/main/examples/with-zapier-mcp)** — Triggers Zapier workflows from agents using Zapier's MCP integration. Shows authentication, discovering available Zaps, and executing automated workflows across apps and services.

  ```bash
  npm create voltagent@latest -- --example with-zapier-mcp
  ```

  📚 Related docs: [MCP Integration](https://voltagent.dev/docs/agents/mcp/mcp)

- **[AI Agent with Tavily Search](https://github.com/VoltAgent/voltagent/tree/main/examples/with-tavily-search)** — Augments agent responses with real-time web search results using Tavily's API. Shows search query formulation, result filtering, and integration of web knowledge into responses.

  ```bash
  npm create voltagent@latest -- --example with-tavily-search
  ```

  📚 Related docs: [Agent Tools](https://voltagent.dev/docs/agents/tools)

- **[AI Agent with Playwright Browser Automation](https://github.com/VoltAgent/voltagent/tree/main/examples/with-playwright)** — Web automation tools using Playwright for browser control. Shows configuring headless browsers, navigating pages, extracting data, and handling dynamic content through agent-callable tools.

  ```bash
  npm create voltagent@latest -- --example with-playwright
  ```

  📚 Related docs: [Agent Tools](https://voltagent.dev/docs/agents/tools)

- **[AI Agent with Client-Side Tools](https://github.com/VoltAgent/voltagent/tree/main/examples/with-client-side-tools)** — Implements secure client-side tool execution in Next.js. Shows client-server architecture for tool calling, type safety across boundaries, and security considerations for client-initiated actions.

  ```bash
  npm create voltagent@latest -- --example with-client-side-tools
  ```

  📚 Related docs: [Agent Tools](https://voltagent.dev/docs/agents/tools)

- **[AI Agent with Thinking Tool](https://github.com/VoltAgent/voltagent/tree/main/examples/with-thinking-tool)** — Implements structured reasoning by providing agents with a dedicated "thinking" tool. Shows defining thinking steps, capturing reasoning traces, and improving response quality through deliberate cognitive processes.
  ```bash
  npm create voltagent@latest -- --example with-thinking-tool
  ```
  📚 Related docs: [Reasoning Tool](https://voltagent.dev/docs/tools/reasoning-tool)

### Memory & State

- **[AI Agent with Working Memory](https://github.com/VoltAgent/voltagent/tree/main/examples/with-working-memory)** — Implements per-conversation memory with read and update tools. Shows memory structure design, automatic fact extraction, and memory updates to enhance conversation continuity.

  ```bash
  npm create voltagent@latest -- --example with-working-memory
  ```

  📚 Related docs: [Working Memory](https://voltagent.dev/docs/agents/memory/working-memory) • [Memory Overview](https://voltagent.dev/docs/agents/memory/overview)

- **[AI Agent with Managed Memory](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voltagent-managed-memory)** — Uses VoltAgent's managed memory service through a REST adapter. Shows configuration, authentication, and integrating cloud-hosted memory for deployments requiring reliability and automatic scaling.

  ```bash
  npm create voltagent@latest -- --example with-voltagent-managed-memory
  ```

  📚 Related docs: [Managed Memory](https://voltagent.dev/docs/agents/memory/managed-memory)

- **[AI Agent with Turso Database](https://github.com/VoltAgent/voltagent/tree/main/examples/with-turso)** — Persists agent memory using Turso's edge-distributed LibSQL database. Shows Turso configuration, schema design for memory storage, and edge replication for global performance with SQLite compatibility.

  ```bash
  npm create voltagent@latest -- --example with-turso
  ```

  📚 Related docs: [LibSQL Memory](https://voltagent.dev/docs/agents/memory/libsql)

- **[AI Agent with Supabase](https://github.com/VoltAgent/voltagent/tree/main/examples/with-supabase)** — Integrates Supabase for authentication, database storage, and real-time subscriptions. Shows setting up Supabase client, implementing Row Level Security, and building database-backed tools with authentication.
  ```bash
  npm create voltagent@latest -- --example with-supabase
  ```
  📚 Related docs: [Supabase Memory](https://voltagent.dev/docs/agents/memory/supabase)

### Multi-Agent & Workflows

- **[Multi-Agent System with Sub-Agents](https://github.com/VoltAgent/voltagent/tree/main/examples/with-subagents)** — Implements a supervisor pattern where a main agent orchestrates multiple specialized sub-agents. Shows agent composition, task delegation, result aggregation, and coordination patterns for multi-agent systems.

  ```bash
  npm create voltagent@latest -- --example with-subagents
  ```

  📚 Related docs: [Sub-Agents](https://voltagent.dev/docs/agents/subagents)

- **[AI Agent with Workflows](https://github.com/VoltAgent/voltagent/tree/main/examples/with-workflow)** — Structured multi-step workflows using createWorkflowChain with support for human-in-the-loop approvals. Shows defining workflow stages, handling transitions, implementing approval gates, and managing long-running processes.

  ```bash
  npm create voltagent@latest -- --example with-workflow
  ```

  📚 Related docs: [Workflows Overview](https://voltagent.dev/docs/workflows/overview) • [Workflow Streaming](https://voltagent.dev/docs/workflows/streaming) • [Workflow Hooks](https://voltagent.dev/docs/workflows/hooks)

- **[AI Agent HTTP Server for Agent-to-Agent Communication](https://github.com/VoltAgent/voltagent/tree/main/examples/with-a2a-server)** — Exposes agents over HTTP APIs for agent-to-agent communication. Shows REST API design for agents, authentication, request/response handling, and patterns for building agent microservices.

  ```bash
  npm create voltagent@latest -- --example with-a2a-server
  ```

  📚 Related docs: [A2A Server](https://voltagent.dev/docs/agents/a2a/a2a-server) • [API Overview](https://voltagent.dev/docs/api/overview)

- **[AI Agent for GitHub Repository Analysis](https://github.com/VoltAgent/voltagent/tree/main/examples/github-repo-analyzer)** — Agents that read, analyze, and summarize GitHub repositories. Shows GitHub API integration, code structure analysis, documentation extraction, and generating repository summaries.
  ```bash
  npm create voltagent@latest -- --example github-repo-analyzer
  ```
  📚 Related docs: [Agent Tools](https://voltagent.dev/docs/agents/tools)

### Deployment & Frameworks

- **[AI Agent with Next.js](https://github.com/VoltAgent/voltagent/tree/main/examples/with-nextjs)** — Full-stack AI agent application using Next.js with React UI components, agent API routes, and streaming responses. Shows app router integration, server actions, streaming UI updates, and deployment patterns.

  ```bash
  npm create voltagent@latest -- --example with-nextjs
  ```

  📚 Related docs: [Next.js Integration](https://voltagent.dev/docs/integrations/nextjs) • [Deployment Overview](https://voltagent.dev/docs/deployment/overview)

- **[AI Agent with Nuxt](https://github.com/VoltAgent/voltagent/tree/main/examples/with-nuxt)** — Vue-based front-end with Nuxt communicating with VoltAgent APIs. Shows Nuxt 3 setup, API integration, SSR considerations, and building interactive chat interfaces with Vue components.

  ```bash
  npm create voltagent@latest -- --example with-nuxt
  ```

  📚 Related docs: [Deployment Overview](https://voltagent.dev/docs/deployment/overview)

- **[AI Agent on Cloudflare Workers](https://github.com/VoltAgent/voltagent/tree/main/examples/with-cloudflare-workers)** — Deploys agents on Cloudflare Workers using the Hono adapter. Shows Workers configuration, Hono integration, edge runtime limitations, and optimizations for serverless edge computing.

  ```bash
  npm create voltagent@latest -- --example with-cloudflare-workers
  ```

  📚 Related docs: [Cloudflare Workers](https://voltagent.dev/docs/deployment/cloudflare-workers)

- **[AI Agent on Netlify Functions](https://github.com/VoltAgent/voltagent/tree/main/examples/with-netlify-functions)** — Deploys serverless agent APIs on Netlify's platform. Shows Netlify Functions setup, environment configuration, deployment workflows, and integration patterns for adding AI agent capabilities.

  ```bash
  npm create voltagent@latest -- --example with-netlify-functions
  ```

  📚 Related docs: [Netlify Functions](https://voltagent.dev/docs/deployment/netlify-functions)

- **[AI Agent with Custom REST Endpoints](https://github.com/VoltAgent/voltagent/tree/main/examples/with-custom-endpoints)** — Extends VoltAgent server with custom REST endpoints alongside standard agent routes. Shows route registration, middleware integration, custom handlers, and maintaining consistent API design.
  ```bash
  npm create voltagent@latest -- --example with-custom-endpoints
  ```
  📚 Related docs: [Custom Endpoints](https://voltagent.dev/docs/api/custom-endpoints) • [API Overview](https://voltagent.dev/docs/api/overview)

### Voice & Audio

- **[AI Agent with ElevenLabs Text-to-Speech](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voice-elevenlabs)** — Converts agent text responses to speech using ElevenLabs' text-to-speech API. Shows ElevenLabs integration, audio streaming, voice selection, and optimizing for low-latency voice generation.

  ```bash
  npm create voltagent@latest -- --example with-voice-elevenlabs
  ```

  📚 Related docs: [Voice Integration](https://voltagent.dev/docs/agents/voice)

- **[AI Agent with OpenAI Text-to-Speech](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voice-openai)** — Generates speech from agent responses using OpenAI's text-to-speech voices. Shows OpenAI TTS integration, audio format handling, streaming, and voice parameter customization.

  ```bash
  npm create voltagent@latest -- --example with-voice-openai
  ```

  📚 Related docs: [Voice Integration](https://voltagent.dev/docs/agents/voice)

- **[AI Agent with xAI Audio](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voice-xsai)** — Implements voice output using xAI's audio models. Shows xAI audio API setup, voice configuration, and generating speech output with xAI's platform.
  ```bash
  npm create voltagent@latest -- --example with-voice-xsai
  ```
  📚 Related docs: [Voice Integration](https://voltagent.dev/docs/agents/voice)

### Observability & Evaluation

- **[AI Agent with OpenTelemetry Tracing](https://github.com/VoltAgent/voltagent/tree/main/examples/sdk-trace-example)** — Implements OpenTelemetry distributed tracing with export to VoltOps. Shows trace instrumentation, span creation, context propagation, and visualization in VoltOps dashboards for monitoring and debugging.

  ```bash
  npm create voltagent@latest -- --example sdk-trace-example
  ```

  📚 Related docs: [Observability Overview](https://voltagent.dev/docs/observability/overview) • [Developer Console](https://voltagent.dev/docs/observability/developer-console)

- **[AI Agent with Custom Telemetry Exporter](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voltagent-exporter)** — Exports agent traces, events, and metrics to external observability platforms. Shows exporter configuration, custom formatters, batching strategies, and connecting to monitoring infrastructure.

  ```bash
  npm create voltagent@latest -- --example with-voltagent-exporter
  ```

  📚 Related docs: [Observability Overview](https://voltagent.dev/docs/observability/overview) • [Logging](https://voltagent.dev/docs/observability/logging)

- **[AI Agent with Live Evaluations](https://github.com/VoltAgent/voltagent/tree/main/examples/with-live-evals)** — Runs real-time evaluations against agents during development. Shows defining evaluation criteria, running assessments during testing, and iterating based on feedback.

  ```bash
  npm create voltagent@latest -- --example with-live-evals
  ```

  📚 Related docs: [Live Evaluations](https://voltagent.dev/docs/evals/live-evaluations) • [Evals Overview](https://voltagent.dev/docs/evals/overview) • [Prebuilt Scorers](https://voltagent.dev/docs/evals/prebuilt-scorers)

- **[AI Agent with Offline Evaluations](https://github.com/VoltAgent/voltagent/tree/main/examples/with-offline-evals)** — Builds regression test suites using batch datasets. Shows dataset creation, batch evaluation execution, scoring metrics, and integration with CI/CD pipelines for systematic testing.

  ```bash
  npm create voltagent@latest -- --example with-offline-evals
  ```

  📚 Related docs: [Offline Evaluations](https://voltagent.dev/docs/evals/offline-evaluations) • [Datasets](https://voltagent.dev/docs/evals/datasets) • [Custom Scorers](https://voltagent.dev/docs/evals/building-custom-scorers)

- **[AI Agent with ViteVal Framework](https://github.com/VoltAgent/voltagent/tree/main/examples/with-viteval)** — Integrates ViteVal's evaluation framework to test and score agent prompts and responses. Shows ViteVal setup, metric definition, evaluation execution, and result analysis.
  ```bash
  npm create voltagent@latest -- --example with-viteval
  ```
  📚 Related docs: [Using with ViteVal](https://voltagent.dev/docs/evals/using-with-viteval)

### Advanced Patterns

- **[AI Agent with Dynamic Parameters](https://github.com/VoltAgent/voltagent/tree/main/examples/with-dynamic-parameters)** — Implements runtime parameter validation and injection using Zod schemas. Shows dynamic schema generation, parameter validation, conditional parameters, and runtime type checking.

  ```bash
  npm create voltagent@latest -- --example with-dynamic-parameters
  ```

  📚 Related docs: [Dynamic Agents](https://voltagent.dev/docs/agents/dynamic-agents)

- **[AI Agent with Dynamic Prompts](https://github.com/VoltAgent/voltagent/tree/main/examples/with-dynamic-prompts)** — Builds prompts programmatically from templates and live data sources. Shows template systems, data interpolation, conditional prompt sections, and prompt versioning strategies.

  ```bash
  npm create voltagent@latest -- --example with-dynamic-prompts
  ```

  📚 Related docs: [Prompts](https://voltagent.dev/docs/agents/prompts)

- **[AI Agent with Output Guardrails](https://github.com/VoltAgent/voltagent/tree/main/examples/with-guardrails)** — Implements output validation and schema enforcement. Shows output validators, content filtering, schema validation, and fallback strategies for failed validations.

  ```bash
  npm create voltagent@latest -- --example with-guardrails
  ```

  📚 Related docs: [Guardrails Overview](https://voltagent.dev/docs/guardrails/overview) • [Built-in Guardrails](https://voltagent.dev/docs/guardrails/built-in)

- **[AI Agent with Lifecycle Hooks](https://github.com/VoltAgent/voltagent/tree/main/examples/with-hooks)** — Uses lifecycle hooks and middleware for cross-cutting concerns. Shows hook registration, execution order, state passing, and common patterns for authentication and observability.

  ```bash
  npm create voltagent@latest -- --example with-hooks
  ```

  📚 Related docs: [Agent Hooks](https://voltagent.dev/docs/agents/hooks) • [Workflow Hooks](https://voltagent.dev/docs/workflows/hooks)

- **[AI Agent with JWT Authentication](https://github.com/VoltAgent/voltagent/tree/main/examples/with-jwt-auth)** — Secures agent endpoints with JWT token verification. Shows JWT validation, token extraction, role-based access control, and integration with auth providers for multi-tenant applications.
  ```bash
  npm create voltagent@latest -- --example with-jwt-auth
  ```
  📚 Related docs: [Authentication](https://voltagent.dev/docs/api/authentication) • [API Overview](https://voltagent.dev/docs/api/overview)

---

## Quick Start

Bootstrap any example with one command:

```bash
npm create voltagent@latest -- --example [example-name]
cd [example-name]
npm install
npm run dev
```

## Resources

- 📚 [Voltagent Documentation](https://voltagent.dev/docs/)
- 🌐 [VoltAgent Core Framework](https://github.com/VoltAgent/voltagent)
- 💬 [Discord Community](https://discord.gg/voltagent)

## Contributing

Contributions welcome. See [contributing guide](./CONTRIBUTING.md).
