# VoltAgent AI Agent Examples

Discover end‑to‑end, runnable examples that show how to build real AI agents with VoltAgent. These projects demonstrate core patterns such as RAG retrieval, typed tools, persistent memory, supervisor‑subagent orchestration, workflows, MCP tool integration, and voice/UX integrations. Use them as learning guides or as starters for your own apps.

What you’ll find here

- RAG and retrieval over vectors and databases
- Typed tool design, MCP servers, and external APIs
- Working and persistent memory for grounded conversations
- Resumable streaming examples for reconnecting to in-flight responses
- Supervisor + sub‑agent orchestration and workflows
- Deployments for Next.js, Cloudflare Workers, Netlify and more

## Featured

### [WhatsApp Order Agent](./with-whatsapp)

Build a WhatsApp chatbot that handles food orders through natural conversation, manages menu items from a database, and processes orders with full conversation context.

<br/>

<img alt="whatsapp" src="https://github.com/user-attachments/assets/dc9c4986-3e68-42f8-a450-ecd79b4dbd99" />

<br/>
<br/>

- 📖 Tutorial: https://voltagent.dev/examples/agents/whatsapp-ai-agent

### [YouTube to Blog Agent](./with-youtube-to-blog)

Convert YouTube videos into Markdown blog posts using a supervisor agent that coordinates subagents with MCP tools, shared working memory, and VoltOps observability.

<br/>

<img alt="youtube" src="https://github.com/user-attachments/assets/f9c944cf-8a9a-4ac5-a5f9-860ce08f058b" />

<br/>
<br/>

- 📖 Tutorial: https://voltagent.dev/examples/agents/youtube-blog-agent

### [AI Ads Generator Agent](./with-ad-creator)

Implement an Instagram ad generator that uses BrowserBase Stagehand to analyze landing pages, extract brand data, and generate visuals through Google Gemini AI.

<br/>

<img alt="instagram" src="https://github.com/user-attachments/assets/973e79c7-34ec-4f8e-8a41-9273d44234c6" />

<br/>
<br/>

- 📖 Tutorial: https://voltagent.dev/examples/agents/ai-instagram-ad-agent

### [AI Recipe Generator Agent](./with-recipe-generator)

Build an intelligent recipe recommendation system that creates personalized cooking suggestions based on available ingredients, dietary preferences, and time constraints.

<br/>

<img alt="cook" src="https://github.com/user-attachments/assets/dde6ce2f-c963-4075-9825-f216bc6e3467" />

<br/>
<br/>

- 📖 Tutorial: https://voltagent.dev/examples/agents/recipe-generator
- 📹 Watch Video: https://youtu.be/KjV1c6AhlfY

### [AI Research Assistant Agent](./with-research-assistant)

Create a multi-agent research workflow where different AI agents collaborate to research topics and generate comprehensive reports with type-safe data flow.

<br/>

<img alt="research" src="https://github.com/user-attachments/assets/8f459748-132e-4ff3-9afe-0561fa5075c2" />

<br/>
<br/>

- 📖 Tutorial: https://voltagent.dev/examples/agents/research-assistant
- 📹 Watch Video: https://youtu.be/j6KAUaoZMy4

## All Examples

- [Base Starter](./base) — Minimal VoltAgent starter with a single agent, memory, and dev server.
- [Workspace](./with-workspace) — Workspace filesystem, sandbox execution, search, and skills.
- [Summarization](./with-summarization) — Agent summarization with a low trigger window for easy testing.
- [Retries and Fallbacks](./with-retries-fallback) — Model fallback list with per-model retries and agent-level defaults.
- [Middleware](./with-middleware) — Input/output middleware with retry feedback.
- [PlanAgents](./with-planagents) — Quickstart for PlanAgents with planning, filesystem tools, and subagent tasks.
- [Slack](./with-slack) — Slack app mention bot that replies in the same channel/thread via VoltOps Slack actions.
- [Chat SDK (Slack)](./with-chat-sdk) — Next.js webhook bot with Chat SDK transport and VoltAgent-powered responses.
- [Airtable](./with-airtable) — React to new Airtable records and write updates back using VoltOps Airtable actions.
- [GitHub Repo Analyzer](./github-repo-analyzer) — Agents read repository code and summarize insights/issues from GitHub projects.
- [GitHub Star Stories](./github-star-stories) — Celebrate new GitHub stars with enriched profiles, AI-written stories, and VoltOps Discord actions.
- [SDK Trace Example](./sdk-trace-example) — OpenTelemetry tracing wired to VoltOps so you can inspect spans and events.
- [Agent‑to‑Agent Server](./with-a2a-server) — Expose agents over HTTP so other agents/services can call them.
- [Amazon Bedrock](./with-amazon-bedrock) — Run AWS Bedrock models by configuring credentials and model IDs in VoltAgent.
- [Anthropic](./with-anthropic) — Use Claude models as your agent’s LLM via the AI SDK.
- [OpenRouter](./with-openrouter) — Use OpenRouter through VoltAgent's built-in `openrouter/<model>` routing.
- [Chroma](./with-chroma) — RAG with Chroma vectors showing automatic vs tool‑driven retrieval patterns.
- [Client‑side Tools](./with-client-side-tools) — Next.js UI triggers typed client‑side tools safely, VoltAgent on the server.
- [Cloudflare Workers](./with-cloudflare-workers) — Deploy your agent on Workers using the Hono server adapter.
- [Composio (MCP)](./with-composio-mcp) — Call Composio actions through MCP tools inside your workflows.
- [Custom Endpoints](./with-custom-endpoints) — Add bespoke REST endpoints alongside agent/workflow routes.
- [Dynamic Parameters](./with-dynamic-parameters) — Validate and inject runtime parameters into agents with Zod.
- [Dynamic Prompts](./with-dynamic-prompts) — Build prompts from templates and live data programmatically.
- [Google AI](./with-google-ai) — Use Google Gemini models via the AI SDK provider.
- [Google Drive (MCP)](./with-google-drive-mcp) — Browse and read Drive files through a Google Drive MCP server.
- [Google Vertex AI](./with-google-vertex-ai) — Connect agents to Vertex AI models in your GCP project.
- [Groq](./with-groq-ai) — Ultra‑low latency responses using Groq’s LPU inference.
- [Guardrails](./with-guardrails) — Add output validation and schema enforcement to keep responses on spec.
- [Hooks](./with-hooks) — Demonstrates lifecycle hooks/middleware for logging, auth, or customization.
- [Hugging Face (MCP)](./with-hugging-face-mcp) — Access HF tools and models through MCP from agents.
- [JWT Auth](./with-jwt-auth) — Protect agent endpoints with JWT verification and helpers.
- [Langfuse](./with-langfuse) — Send traces and metrics to Langfuse for observability.
- [Feedback Templates](./with-feedback) — Configure per-agent feedback templates for thumbs, numeric, and categorical feedback.
- [Live Evals](./with-live-evals) — Run online evaluations against prompts/agents during development.
- [MCP Basics](./with-mcp) — Connect to MCP servers and call tools from an agent.
- [MCP Elicitation](./with-mcp-elicitation) — Handle `elicitation/create` requests from MCP tools with per-request handlers.
- [MCP Server](./with-mcp-server) — Implement and run a local MCP server that exposes custom tools.
- [Netlify Functions](./with-netlify-functions) — Ship serverless agent APIs on Netlify.
- [Next.js](./with-nextjs) — React UI with agent APIs and streaming responses.
- [Next.js + Resumable Streams](./with-nextjs-resumable-stream) — AI Elements chat UI with VoltAgent and resumable streams.
- [Nuxt](./with-nuxt) — Vue/Nuxt front‑end talking to VoltAgent APIs.
- [Offline Evals](./with-offline-evals) — Batch datasets and score outputs for regression testing.
- [Peaka (MCP)](./with-peaka-mcp) — Integrate Peaka services via MCP tools.
- [Pinecone](./with-pinecone) — RAG retrieval backed by Pinecone vectors and embeddings.
- [Playwright](./with-playwright) — Web automation tools powered by Playwright for browsing and actions.
- [Postgres](./with-postgres) — Use Postgres/pgvector for storage and semantic retrieval.
- [Qdrant](./with-qdrant) — RAG with Qdrant showing retriever‑on‑every‑turn vs LLM‑decides search.
- [RAG Chatbot](./with-rag-chatbot) — A conversational bot grounded in your documents with citations.
- [Retrieval](./with-retrieval) — Minimal retrieval helpers demonstrating the retriever API.
- [VoltOps Retrieval](./with-voltops-retrieval) — Use VoltOps Knowledge Bases as a retriever via @voltagent/core.
- [Sub‑agents](./with-subagents) — Supervisor orchestrates focused sub‑agents to divide tasks.
- [Supabase](./with-supabase) — Use Supabase auth/database in tools and server endpoints.
- [Tavily Search](./with-tavily-search) — Augment answers with web results from Tavily.
- [Thinking Tool](./with-thinking-tool) — Structured reasoning via a dedicated “thinking” tool and schema.
- [Tool Routing](./with-tool-routing) — Route large tool pools through a small set of router tools.
- [Tools](./with-tools) — Author Zod‑typed tools with cancellation and streaming support.
- [VoltOps Actions + Airtable](./with-voltagent-actions) — Call VoltOps Actions as tools to create and list Airtable records.
- [Turso](./with-turso) — Persist memory on LibSQL/Turso with simple setup.
- [Vector Search](./with-vector-search) — Semantic memory with embeddings and automatic recall during chats.
- [Vercel AI](./with-vercel-ai) — VoltAgent with Vercel AI SDK provider and streaming.
- [Resumable Streams](./with-resumable-streams) — Persist and resume chat streams with Redis-backed SSE storage.
- [VoltOps Resumable Streams](./with-voltops-resumable-streams) — Persist and resume chat streams with VoltOps managed storage.
- [ViteVal](./with-viteval) — Integrate ViteVal to evaluate agents and prompts.
- [Voice (ElevenLabs)](./with-voice-elevenlabs) — Convert agent replies to speech using ElevenLabs TTS.
- [Voice (OpenAI)](./with-voice-openai) — Speak responses with OpenAI’s TTS voices.
- [Voice (xAI)](./with-voice-xsai) — Use xAI audio models for voice output.
- [VoltAgent Exporter](./with-voltagent-exporter) — Export traces/events to external observability targets.
- [Managed Memory](./with-voltagent-managed-memory) — Production‑grade memory via VoltOps Managed Memory REST adapter.
- [Workflow](./with-workflow) — Build multi‑step flows with createWorkflowChain and human‑in‑the‑loop.
- [Working Memory](./with-working-memory) — Persist per‑conversation/user facts with built‑in read/update tools.
- [Zapier (MCP)](./with-zapier-mcp) — Trigger Zapier actions through MCP from your agents.
