---
id: 5
slug: youtube-blog-agent
title: YouTube to Blog Agent
description: Convert YouTube videos into Markdown blog posts with VoltAgent and MCP.
repository: https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog
---

This VoltAgent example to show how a supervisor coordinates subagents that depend on [MCP tools](https://voltagent.dev/docs/agents/tools/#mcp-model-context-protocol), shared [working memory](https://voltagent.dev/docs/agents/memory/overview/), and [VoltOps LLM observability](https://console.voltagent.dev/). The supervisor asks one subagent for the YouTube transcript, sends that text to a writer subagent, and returns a Markdown blog post.

Here is what the Agent does:

- Loads YouTube tooling over MCP with Server-Sent Events
- Delegates transcript retrieval and writing to two focused agents
- Stores transcript context in LibSQL-backed working memory
- Records execution traces through the VoltOps observability adapter
- Serves every agent through VoltAgent’s Hono server integration

### Setup

<Info title="Before you begin, prepare these accounts and services:">
- VoltOps LLM Observability account at [console.voltagent.dev](https://console.voltagent.dev/login)
- OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)
- Access to a [YouTube MCP server](https://smithery.ai/server/@jkawamoto/mcp-youtube-transcript). Community servers may throttle requests, so keep an alternate provider ready.
</Info>

#### Get the example code

I use the VoltAgent CLI to scaffold the project:

```bash
npm create voltagent-app@latest -- --example with-youtube-to-blog
cd with-youtube-to-blog
```

You can browse the full source on GitHub in the [`examples/with-youtube-to-blog`](https://github.com/VoltAgent/voltagent/tree/main/examples/with-youtube-to-blog) directory.

#### Configure environment variables

Create or copy a `.env` file with the required credentials:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# MCP Provider Configuration
YOUTUBE_MCP_URL=https://your-youtube-mcp-host/sse

# VoltOps Observability (optional)
VOLTAGENT_PUBLIC_KEY=your_public_key
VOLTAGENT_SECRET_KEY=your_secret_key
```

If you self-host VoltOps or LibSQL, add connection variables such as `LIBSQL_DATABASE_URL` and `LIBSQL_AUTH_TOKEN`. Without extra configuration the LibSQL adapters create local SQLite files inside the project directory.

#### Start the development server

Install dependencies and run the dev server:

```bash
pnpm dev
```

When the server starts, the terminal prints:

```bash
════════════════════════════════════════════
  VOLTAGENT SERVER STARTED SUCCESSFULLY
════════════════════════════════════════════
  ✓ HTTP Server: http://localhost:3141

  VoltOps Platform: https://console.voltagent.dev
════════════════════════════════════════════
[VoltAgent] All packages are up to date
```

I run the YouTube MCP provider separately so the `TranscriptFetcher` subagent can call the transcript tool.

![VoltAgent dev server ready](https://cdn.voltagent.dev/examples/with-youtube-to-blog/start-development.png)

### MCP Tool Registration

The coordinator discovers YouTube tooling through `MCPConfiguration` before the agents start:

```typescript
const youtubeMcpConfig = new MCPConfiguration({
  servers: {
    youtube: {
      type: "http",
      url: process.env.YOUTUBE_MCP_URL || "",
    },
  },
});

const youtubeTools = await youtubeMcpConfig.getTools();
```

The `YOUTUBE_MCP_URL` must be reachable from the VoltAgent process and expose the SSE interface described in the [MCP tooling guide](https://voltagent.dev/docs/agents/tools/#mcp-model-context-protocol-support).

- `MCPConfiguration` pulls tool metadata from the HTTP SSE endpoint and converts it into the format VoltAgent expects.
- I pass the resulting `youtubeTools` array into the agents so they can call the transcript tool without extra wiring.

### Agent Architecture

![Available agents in VoltOps](https://cdn.voltagent.dev/examples/with-youtube-to-blog/avaliable-agents.png)

When someone asks for a blog post, the `YouTubeToBlogCoordinator` receives the prompt with the YouTube link. I wired the coordinator to follow a strict handoff:

1. The coordinator calls the `TranscriptFetcher` subagent, which relies on the MCP transcript tool to pull the full caption text.
2. After the transcript lands in shared memory, the coordinator calls the `BlogWriter` subagent and passes the entire transcript as input.
3. The writer returns Markdown, and the coordinator responds with that Markdown as-is so downstream systems can store or publish it directly.

To support this flow I register three agents inside one VoltAgent instance. The supervisor coordinates both subagents and they all share the same memory and logging resources.

![Coordinator overview in VoltOps](https://cdn.voltagent.dev/examples/with-youtube-to-blog/general-compact.png)

### TranscriptFetcher Subagent

![TranscriptFetcher agent trace](https://cdn.voltagent.dev/examples/with-youtube-to-blog/transkript-fetcher.png)

TranscriptFetcher handles pulling the raw transcript from the YouTube MCP tool.

```typescript
const transcriptFetcherAgent = new Agent({
  name: "TranscriptFetcher",
  instructions: `
  You are a transcript fetcher. Your ONLY job is to fetch transcripts from YouTube videos.
  IMPORTANT:
  - When given a YouTube URL, use your tools to extract the English transcript
  - Return ONLY the raw transcript text
  - DO NOT write blog posts
  - DO NOT format the transcript into articles
  - DO NOT add any additional content or commentary
  - Just extract and return the transcript as-is`,
  model: openai("gpt-4o-mini"),
  tools: youtubeTools,
  memory,
});
```

- `name` is how the supervisor or an API caller refers to this agent.
- `instructions` force the agent to send back raw transcript text and nothing else.
- `model` uses `@ai-sdk/openai` with `gpt-4o-mini`, which keeps transcript calls fast and inexpensive.
- `tools` contains the MCP transcript function discovered earlier.
- `memory` connects the agent to the shared working store so retries can reuse earlier context.

### BlogWriter Subagent

![BlogWriter agent trace](https://cdn.voltagent.dev/examples/with-youtube-to-blog/blog-writer.png)

BlogWriter converts the transcript into a Markdown article with defined sections.

```typescript
const blogWriterAgent = new Agent({
  name: "BlogWriter",
  instructions: `
  You are an expert blog writer. When given a YouTube transcript, convert it into a well-structured, engaging blog post with:
  - A catchy, SEO-friendly title
  - An engaging introduction
  - Clear sections with subheadings
  - Key points and takeaways
  - A compelling conclusion
  Format the output in Markdown.`,
  model: openai("gpt-4o-mini"),
  memory,
});
```

- The instructions describe the Markdown layout I expect in the final response.
- The shared memory instance keeps the transcript available without fetching it again.
- Because VoltAgent wraps the provider logic, I can swap to another LLM that the AI SDK supports.

### Coordinator Supervisor

![Supervisor agent trace](https://cdn.voltagent.dev/examples/with-youtube-to-blog/supervisor.png)

The supervisor enforces the handoff order and delegates work to both subagents.

```typescript
const coordinatorAgent = new Agent({
  name: "YouTubeToBlogCoordinator",
  instructions: `
  You are a coordinator that orchestrates the process of converting YouTube videos to blog posts. You DO NOT write the blog post yourself - that is the BlogWriter's job.

  IMPORTANT: You MUST follow these steps in EXACT ORDER:

  STEP 1: Get the Transcript
  - Delegate to the TranscriptFetcher agent with the YouTube URL
  - WAIT for the TranscriptFetcher to complete and return the full transcript
  - DO NOT proceed to Step 2 until you have the complete transcript

  STEP 2: Generate the Blog Post
  - After you have the COMPLETE transcript, delegate to the BlogWriter agent
  - Pass the ENTIRE transcript to the BlogWriter
  - DO NOT write the blog post yourself - let the BlogWriter do it
  - WAIT for the BlogWriter to return the complete blog post

  STEP 3: Return ONLY the Blog Post
  - Return ONLY the blog post content that the BlogWriter created
  - DO NOT add any additional commentary, explanations, or meta-information
  - Just return the blog post as-is

  CRITICAL RULES:
  - Complete Step 1 entirely before starting Step 2
  - You are ONLY a coordinator - BlogWriter creates the blog post, NOT you
  - Your final response should be ONLY the blog post content from BlogWriter`,
  model: openai("gpt-4o-mini"),
  memory,
  subAgents: [transcriptFetcherAgent, blogWriterAgent],
  supervisorConfig: {
    fullStreamEventForwarding: {
      types: ["tool-call", "tool-result"],
    },
  },
});
```

- `subAgents` registers the transcript and writer agents, so the supervisor can call them with the built-in `delegate_task` tool described in the [subagent guide](https://voltagent.dev/docs/agents/sub-agents/).
- `supervisorConfig.fullStreamEventForwarding` forwards tool events to the caller, which VoltOps stores for observability.
- The shared memory instance lets the supervisor hand the transcript to the writer without restating it in the prompt.

### Memory and Observability

I reuse LibSQL adapters for working memory and observability. See the [memory overview](https://voltagent.dev/docs/agents/memory/overview/) and [VoltOps guide](https://voltagent.dev/docs/observability/overview/) for configuration details.

```typescript
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({
    storageLimit: 100, // Keep last 100 messages per conversation
  }),
});

const observability = new VoltAgentObservability({
  storage: new LibSQLObservabilityAdapter(),
});
```

- `LibSQLMemoryAdapter` caps each conversation at 100 messages and can target local SQLite or remote Turso instances.
- `VoltAgentObservability` captures spans, logs, and tool events that VoltOps renders in the web console.

![Shared memory and observability view](https://cdn.voltagent.dev/examples/with-youtube-to-blog/memory.png)

#### VoltAgent Server Configuration

```typescript
new VoltAgent({
  agents: {
    coordinatorAgent,
    transcriptFetcherAgent,
    blogWriterAgent,
  },
  server: honoServer(),
  logger,
  observability,
});
```

- Registers all three agents so I can call them individually or through the supervisor.
- Exposes an HTTP interface using Hono at `http://localhost:3141`.
- Attaches the `observability` instance so trace data persists without extra wiring.

### Running the Agent

Once deployed, the agent handles natural conversations for incoming requests.

![YouTube to Blog Agent running](https://cdn.voltagent.dev/examples/with-youtube-to-blog/start-development.png)

I watch the coordinator delegate work in three steps:

1. `TranscriptFetcher` calls the MCP tool to retrieve the English transcript.
2. `BlogWriter` receives the transcript and formats a structured Markdown article.
3. The supervisor returns the Markdown output without extra commentary.

VoltOps captures each delegation, tool call, and LLM response, so I can inspect the chain step by step.

Prompt example:

```
Extract the transcript of this video: https://www.youtube.com/watch?v=U6s2pdxebSo and write a blog post in English.
```

### Next Steps

Here are the next improvements on my list:

1. Integrate additional MCP providers (for example, keyword research or SEO scoring) before handing the transcript to the writer.
2. Add guardrail agents that fact-check statistics or detect sensitive topics before publication.
3. Persist finished articles to a CMS via webhooks or a platform-specific API.
4. Allow the coordinator to branch into multiple writing styles (technical deep dive, social recap, executive summary) based on user preferences.
5. Introduce human-in-the-loop review stages using VoltAgent workflows and the VoltOps timeline UI.
