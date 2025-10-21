---
title: AI Agent Examples with Source Codes
slug: ai-agent-examples
authors: necatiozmen
tags: [examples, tutorials]
image: https://cdn.voltagent.dev/2025-10-21-ai-agent-examples/social.png
---

VoltAgent is an open source TypeScript framework for building AI agents. This article explores real-world examples applications built with VoltAgent, complete with source code and technical details.

## What Is VoltAgent?

VoltAgent is a TypeScript-based AI agent framework. It provides memory management, tools, observability, and sub-agent coordination.

### WhatsApp Order Agent

A chatbot implementation that accepts food orders through natural conversation on WhatsApp, queries menu items from a database, and maintains conversation history.

![WhatsApp Order Agent](https://github.com/user-attachments/assets/dc9c4986-3e68-42f8-a450-ecd79b4dbd99)

**Technical Details:**

- WhatsApp Business API webhook integration
- SQLite database for menu and order management
- Memory API for conversation history persistence
- Natural language understanding for order parameter extraction

**Resources:**

- [Tutorial](https://voltagent.dev/examples/agents/whatsapp-ai-agent)
- [Source Code](https://github.com/VoltAgent/voltagent/tree/main/examples/with-whatsapp)

### YouTube to Blog Agent

A multi-agent system that extracts transcripts from YouTube video URLs and generates Markdown-formatted blog posts.

![YouTube to Blog Agent](https://github.com/user-attachments/assets/f9c944cf-8a9a-4ac5-a5f9-860ce08f058b)

**Technical Details:**

- Supervisor agent coordinates 3 sub-agents
- MCP tools for YouTube transcript API integration
- Shared memory for inter-agent data transfer
- Structured Markdown output generation

**Resources:**

- [Tutorial](https://voltagent.dev/examples/agents/youtube-blog-agent)
- [Source Code](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog)

### AI Ads Generator Agent

An agent that scrapes landing pages to extract brand information and generates Instagram-formatted visuals using Google Gemini.

![AI Ads Generator](https://github.com/user-attachments/assets/973e79c7-34ec-4f8e-8a41-9273d44234c6)

**Technical Details:**

- BrowserBase Stagehand for headless browser control
- Color palette and typography extraction from DOM
- Google Gemini multimodal API for image generation
- 1080x1080 Instagram post format rendering

**Resources:**

- [Tutorial](https://voltagent.dev/examples/agents/ai-instagram-ad-agent)
- [Source Code](https://github.com/VoltAgent/voltagent/tree/main/examples/with-ad-creator)

### AI Recipe Generator Agent

A recipe recommendation system based on ingredient lists, dietary restrictions, and time parameters.

![Recipe Generator](https://github.com/user-attachments/assets/dde6ce2f-c963-4075-9825-f216bc6e3467)

**Technical Details:**

- Zod schema validation for ingredients and dietary preferences
- Nutrition database integration
- Structured output for step-by-step instructions
- Portion and time calculation algorithms

**Resources:**

- [Tutorial](https://voltagent.dev/examples/agents/recipe-generator)
- [Video](https://youtu.be/KjV1c6AhlfY)
- [Source Code](https://github.com/VoltAgent/voltagent/tree/main/examples/with-recipe-generator)

### AI Research Assistant Agent

A research workflow implementation where multiple agents work in parallel for data collection and analysis.

![Research Assistant](https://github.com/user-attachments/assets/8f459748-132e-4ff3-9afe-0561fa5075c2)

**Technical Details:**

- 4 different research agents running in parallel
- Type-safe workflow chaining
- OpenTelemetry traces for inter-agent dependency visualization
- Markdown-formatted research report output

**Resources:**

- [Tutorial](https://voltagent.dev/examples/agents/research-assistant)
- [Video](https://youtu.be/j6KAUaoZMy4)
- [Source Code](https://github.com/VoltAgent/voltagent/tree/main/examples/with-research-assistant)

## More Examples

### Integration Examples

#### → [GitHub Repository Analyzer](https://github.com/VoltAgent/voltagent/tree/main/examples/github-repo-analyzer)

This example demonstrates how agents can analyze repository code and automatically generate summaries about project structure, dependencies, and potential issues.

#### → [RAG Chatbot](https://github.com/VoltAgent/voltagent/tree/main/examples/with-rag-chatbot)

A document-grounded conversational bot that retrieves relevant information from your knowledge base and provides responses with proper citations.

#### → [Tavily Web Search](https://github.com/VoltAgent/voltagent/tree/main/examples/with-tavily-search)

Integrate real-time web search capabilities into your agents, allowing them to augment responses with up-to-date information from the internet.

### Vector Database & RAG

#### → [Chroma Vector Database](https://github.com/VoltAgent/voltagent/tree/main/examples/with-chroma)

This example shows how to implement RAG (Retrieval-Augmented Generation) using Chroma, demonstrating both automatic retrieval and tool-driven retrieval patterns for enhanced context.

#### → [Pinecone Vector Search](https://github.com/VoltAgent/voltagent/tree/main/examples/with-pinecone)

Build semantic search capabilities using Pinecone's vector database, enabling your agents to find contextually similar information through embeddings.

#### → [Qdrant Vector Database](https://github.com/VoltAgent/voltagent/tree/main/examples/with-qdrant)

Compare two different retrieval strategies: retriever-on-every-turn where documents are fetched automatically, versus LLM-decides where the model determines when to search.

#### → [Postgres with pgvector](https://github.com/VoltAgent/voltagent/tree/main/examples/with-postgres)

Use PostgreSQL with the pgvector extension for both structured data storage and semantic similarity search in a single database.

### LLM Providers

#### → [Anthropic Claude](https://github.com/VoltAgent/voltagent/tree/main/examples/with-anthropic)

Connect your agents to Anthropic's Claude models through the AI SDK, giving you access to advanced reasoning and long-context capabilities.

#### → [Google Gemini AI](https://github.com/VoltAgent/voltagent/tree/main/examples/with-google-ai)

Integrate Google's Gemini models into your VoltAgent applications using the AI SDK provider for multimodal AI capabilities.

#### → [Google Vertex AI](https://github.com/VoltAgent/voltagent/tree/main/examples/with-google-vertex-ai)

Deploy agents using Google Cloud's Vertex AI platform, leveraging enterprise-grade infrastructure and model management.

#### → [Groq LPU Inference](https://github.com/VoltAgent/voltagent/tree/main/examples/with-groq-ai)

Achieve ultra-low latency responses by running your agents on Groq's specialized LPU (Language Processing Unit) hardware.

#### → [Amazon Bedrock](https://github.com/VoltAgent/voltagent/tree/main/examples/with-amazon-bedrock)

Configure your agents to use AWS Bedrock's foundation models, accessing a variety of AI models through Amazon's managed service.

#### → [xAI Grok](https://github.com/VoltAgent/voltagent/tree/main/examples/with-xsai)

Power your agents with xAI's Grok models for real-time understanding and generation capabilities.

### MCP (Model Context Protocol)

#### → [MCP Client Basics](https://github.com/VoltAgent/voltagent/tree/main/examples/with-mcp)

Learn how to connect your agents to Model Context Protocol servers and invoke their tools, enabling standardized integration with external services.

#### → [Custom MCP Server](https://github.com/VoltAgent/voltagent/tree/main/examples/with-mcp-server)

Build your own MCP server that exposes custom tools to agents, allowing you to create reusable tool ecosystems across different agent applications.

#### → [Composio MCP Integration](https://github.com/VoltAgent/voltagent/tree/main/examples/with-composio-mcp)

Integrate Composio's suite of third-party application actions into your agents through the Model Context Protocol interface.

#### → [Google Drive MCP](https://github.com/VoltAgent/voltagent/tree/main/examples/with-google-drive-mcp)

Enable your agents to browse folders and read files from Google Drive using an MCP server connection.

#### → [Hugging Face MCP](https://github.com/VoltAgent/voltagent/tree/main/examples/with-hugging-face-mcp)

Access HuggingFace's vast collection of models and tools through MCP, allowing your agents to leverage specialized AI capabilities.

#### → [Zapier MCP Integration](https://github.com/VoltAgent/voltagent/tree/main/examples/with-zapier-mcp)

Connect your agents to thousands of applications through Zapier's automation platform using MCP integration.

#### → [Peaka MCP Integration](https://github.com/VoltAgent/voltagent/tree/main/examples/with-peaka-mcp)

Integrate Peaka's data federation and query services into your agents through MCP tools for unified data access.

### Deployment Platforms

#### → [Next.js Integration](https://github.com/VoltAgent/voltagent/tree/main/examples/with-nextjs)

Build a React-based frontend that communicates with VoltAgent APIs, featuring streaming responses for real-time agent interactions.

#### → [Nuxt Integration](https://github.com/VoltAgent/voltagent/tree/main/examples/with-nuxt)

Create a Vue/Nuxt application that seamlessly integrates with VoltAgent's backend services for server-side rendered agent experiences.

#### → [Cloudflare Workers Deployment](https://github.com/VoltAgent/voltagent/tree/main/examples/with-cloudflare-workers)

Deploy your agents to Cloudflare's edge network using the Hono server adapter for global, low-latency serverless execution.

#### → [Netlify Functions Deployment](https://github.com/VoltAgent/voltagent/tree/main/examples/with-netlify-functions)

Host your agent APIs as serverless functions on Netlify, enabling easy deployment with automatic scaling and CDN distribution.

### Advanced Patterns

#### → [Supervisor and Sub-agents](https://github.com/VoltAgent/voltagent/tree/main/examples/with-subagents)

Implement hierarchical agent systems where a supervisor agent coordinates multiple specialized sub-agents, each handling specific aspects of complex tasks.

#### → [Multi-step Workflows](https://github.com/VoltAgent/voltagent/tree/main/examples/with-workflow)

Create sophisticated multi-step workflows using createWorkflowChain, including human-in-the-loop approval steps for critical decisions.

#### → [Working Memory Management](https://github.com/VoltAgent/voltagent/tree/main/examples/with-working-memory)

Maintain per-conversation facts and context that persist across interactions, with built-in tools for reading and updating stored information.

#### → [Semantic Vector Search](https://github.com/VoltAgent/voltagent/tree/main/examples/with-vector-search)

Enable agents to automatically recall relevant context from past conversations using semantic memory and vector similarity search.

#### → [Client-side Tool Execution](https://github.com/VoltAgent/voltagent/tree/main/examples/with-client-side-tools)

Execute type-safe tools directly in the browser while maintaining security, with a Next.js frontend managing client-side interactions.

#### → [Agent-to-Agent Communication](https://github.com/VoltAgent/voltagent/tree/main/examples/with-a2a-server)

Set up HTTP endpoints that allow different agents to communicate with each other, enabling distributed multi-agent architectures.

### Tools & Utilities

#### → [Zod-typed Tool Creation](https://github.com/VoltAgent/voltagent/tree/main/examples/with-tools)

Learn how to create type-safe tools using Zod schemas, with support for cancellation, streaming responses, and full TypeScript inference.

#### → [Structured Thinking Tool](https://github.com/VoltAgent/voltagent/tree/main/examples/with-thinking-tool)

Give your agents a dedicated thinking tool that enables structured reasoning and step-by-step problem solving before providing final answers.

#### → [Playwright Browser Automation](https://github.com/VoltAgent/voltagent/tree/main/examples/with-playwright)

Equip your agents with browser automation capabilities using Playwright, enabling them to interact with web pages, fill forms, and extract data.

#### → [Dynamic Prompt Generation](https://github.com/VoltAgent/voltagent/tree/main/examples/with-dynamic-prompts)

Build prompts programmatically from templates and runtime data, allowing you to customize agent behavior based on context and user input.

#### → [Dynamic Parameter Validation](https://github.com/VoltAgent/voltagent/tree/main/examples/with-dynamic-parameters)

Validate and inject runtime parameters into your agents using Zod schemas, ensuring type safety and proper input handling at execution time.

### Observability & Evaluation

#### → [OpenTelemetry Trace Example](https://github.com/VoltAgent/voltagent/tree/main/examples/sdk-trace-example)

Set up OpenTelemetry tracing with VoltOps integration, allowing you to inspect detailed execution spans and understand your agent's decision-making process.

#### → [Langfuse Integration](https://github.com/VoltAgent/voltagent/tree/main/examples/with-langfuse)

Export traces and metrics to Langfuse's observability platform for comprehensive monitoring, debugging, and performance analysis of your AI agents.

#### → [Live Agent Evaluations](https://github.com/VoltAgent/voltagent/tree/main/examples/with-live-evals)

Run real-time evaluations on your agents during development, helping you catch issues and validate behavior changes immediately.

#### → [Offline Batch Evaluations](https://github.com/VoltAgent/voltagent/tree/main/examples/with-offline-evals)

Test your agents against predefined datasets in batch mode, enabling systematic regression testing and quality assurance.

#### → [ViteVal Evaluation](https://github.com/VoltAgent/voltagent/tree/main/examples/with-viteval)

Evaluate agent performance and prompt effectiveness using ViteVal's testing framework for systematic quality measurement.

#### → [Telemetry Exporter](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voltagent-exporter)

Configure custom telemetry exports to send traces, metrics, and logs to external observability platforms like Datadog or New Relic.

### Voice & Audio

#### → [OpenAI Text-to-Speech](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voice-openai)

Convert your agent's text responses into natural-sounding speech using OpenAI's TTS API with multiple voice options.

#### → [ElevenLabs Voice Generation](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voice-elevenlabs)

Generate high-quality, realistic voice audio from agent responses using ElevenLabs' advanced text-to-speech technology.

#### → [xAI Voice Synthesis](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voice-xsai)

Integrate xAI's audio models to synthesize voice output from your agent's text responses with natural prosody.

### Security & Storage

#### → [JWT Authentication](https://github.com/VoltAgent/voltagent/tree/main/examples/with-jwt-auth)

Secure your agent endpoints with JWT token verification, ensuring only authorized users can access your AI services.

#### → [Supabase Integration](https://github.com/VoltAgent/voltagent/tree/main/examples/with-supabase)

Leverage Supabase for user authentication and database operations within your agent tools, combining auth and data storage in one platform.

#### → [Turso Database](https://github.com/VoltAgent/voltagent/tree/main/examples/with-turso)

Persist agent memory and conversation history using Turso's distributed LibSQL database for fast, edge-optimized storage.

#### → [VoltOps Managed Memory](https://github.com/VoltAgent/voltagent/tree/main/examples/with-voltagent-managed-memory)

Use VoltOps' managed memory service through a REST adapter, offloading memory management for production-scale agent deployments.

### Core Examples

#### → [Minimal Starter Project](https://github.com/VoltAgent/voltagent/tree/main/examples/base)

Get started with the simplest possible VoltAgent setup featuring a single agent and local development server.

#### → [Output Guardrails](https://github.com/VoltAgent/voltagent/tree/main/examples/with-guardrails)

Add validation rules and schema enforcement to your agent outputs, ensuring responses always conform to your required format.

#### → [Lifecycle Hooks](https://github.com/VoltAgent/voltagent/tree/main/examples/with-hooks)

Implement lifecycle hooks to add logging, authentication, or custom middleware at different stages of agent execution.

#### → [Custom REST Endpoints](https://github.com/VoltAgent/voltagent/tree/main/examples/with-custom-endpoints)

Extend your VoltAgent server with custom REST routes for additional functionality beyond standard agent endpoints.

#### → [Retriever API](https://github.com/VoltAgent/voltagent/tree/main/examples/with-retrieval)

Explore the basics of VoltAgent's retriever API for fetching relevant context to augment agent responses.

#### → [Vercel AI SDK](https://github.com/VoltAgent/voltagent/tree/main/examples/with-vercel-ai)

Integrate VoltAgent with Vercel's AI SDK for streaming responses and seamless deployment on Vercel's platform.

## Getting Started

Create a new VoltAgent project:

```bash
npm create voltagent-app@latest
```

This scaffolds a TypeScript project with agent definitions, workflow examples, and VoltOps integration configured.

VoltAgent is open source. Contributions are welcome on [GitHub](https://github.com/voltagent/voltagent).
