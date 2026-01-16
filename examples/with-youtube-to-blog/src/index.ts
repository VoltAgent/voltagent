import {
  Agent,
  MCPConfiguration,
  Memory,
  VoltAgent,
  VoltAgentObservability,
} from "@voltagent/core";
import { LibSQLMemoryAdapter, LibSQLObservabilityAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";

// Create logger
const logger = createPinoLogger({
  name: "youtube-to-blog",
  level: "info",
});

// Create Memory instance with vector support for semantic search and working memory
const memory = new Memory({
  storage: new LibSQLMemoryAdapter({}),
});

// Configure YouTube MCP with SSE transport
(async () => {
  const youtubeMcpConfig = new MCPConfiguration({
    servers: {
      youtube: {
        type: "http",
        url: process.env.YOUTUBE_MCP_URL || "",
      },
    },
  });

  // Get YouTube MCP tools
  const youtubeTools = await youtubeMcpConfig.getTools();

  // Create TranscriptFetcher subagent
  const transcriptFetcherAgent = new Agent({
    name: "TranscriptFetcher",
    instructions: `You are a transcript fetcher. Your ONLY job is to fetch transcripts from YouTube videos.

IMPORTANT:
- When given a YouTube URL, use your tools to extract the English transcript
- Return ONLY the raw transcript text
- DO NOT write blog posts
- DO NOT format the transcript into articles
- DO NOT add any additional content or commentary
- Just extract and return the transcript as-is`,
    model: "openai/gpt-4o-mini",
    tools: youtubeTools,
    memory,
  });

  // Create BlogWriter subagent
  const blogWriterAgent = new Agent({
    name: "BlogWriter",
    instructions: `You are an expert blog writer. When given a YouTube transcript, convert it into a well-structured, engaging blog post with:
- A catchy, SEO-friendly title
- An engaging introduction
- Clear sections with subheadings
- Key points and takeaways
- A compelling conclusion
Format the output in Markdown.`,
    model: "openai/gpt-4o-mini",
    memory,
  });

  // Create Coordinator supervisor agent
  const coordinatorAgent = new Agent({
    name: "YouTubeToBlogCoordinator",
    instructions: `You are a coordinator that orchestrates the process of converting YouTube videos to blog posts. You DO NOT write the blog post yourself - that is the BlogWriter's job.

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
    model: "openai/gpt-4o-mini",
    memory,
    subAgents: [transcriptFetcherAgent, blogWriterAgent],
    supervisorConfig: {
      fullStreamEventForwarding: {
        types: ["tool-call", "tool-result"],
      },
    },
  });

  new VoltAgent({
    agents: {
      coordinatorAgent,
      transcriptFetcherAgent,
      blogWriterAgent,
    },
    server: honoServer(),
    logger,
    observability: new VoltAgentObservability({
      storage: new LibSQLObservabilityAdapter(),
    }),
  });
})(); // IGNORE
