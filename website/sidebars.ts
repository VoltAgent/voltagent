import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Getting Started",
      items: [
        "getting-started/overview",
        "getting-started/quick-start",
        "getting-started/mcp-docs-server",
        {
          type: "link",
          label: "5-Step Tutorial ↗",
          href: "https://voltagent.dev/tutorial/introduction",
          customProps: {
            target: "_blank",
            rel: "noreferrer",
          },
        },
        "getting-started/providers-models",
        "getting-started/migration-guide",
      ],
    },
    {
      type: "category",
      label: "Agents",
      items: [
        "agents/overview",
        "agents/prompts",
        "agents/tools",
        "agents/memory",
        {
          type: "category",
          label: "MCP",
          items: ["agents/mcp/mcp", "agents/mcp/mcp-server"],
        },
        "agents/a2a/a2a-server",
        "agents/hooks",
        "agents/multi-modal",
        "agents/providers",
        "agents/subagents",
        "agents/voice",
        "agents/context",
        "agents/dynamic-agents",
        "agents/cancellation",
      ],
    },
    {
      type: "category",
      label: "Workflows",
      items: [
        "workflows/overview",
        "workflows/suspend-resume",
        "workflows/execute-api",
        "workflows/streaming",
        "workflows/hooks",
        "workflows/schemas",
        "workflows/steps/and-then",
        "workflows/steps/and-agent",
        "workflows/steps/and-when",
        "workflows/steps/and-tap",
        "workflows/steps/and-all",
        "workflows/steps/and-race",
      ],
    },
    {
      type: "category",
      label: "Memory",
      items: [
        "agents/memory/overview",
        "agents/memory/working-memory",
        "agents/memory/semantic-search",
        {
          type: "category",
          label: "Storage Adapters",
          items: [
            "agents/memory/in-memory",
            "agents/memory/managed-memory",
            "agents/memory/libsql",
            "agents/memory/postgres",
            "agents/memory/supabase",
          ],
        },
      ],
    },
    {
      type: "category",
      label: "Tools",
      items: ["tools/overview", "tools/reasoning-tool"],
    },
    {
      type: "category",
      label: "RAG",
      items: ["rag/overview", "rag/custom-retrievers", "rag/chroma", "rag/pinecone", "rag/qdrant"],
    },
    {
      type: "category",
      label: "API",
      items: [
        "api/overview",
        "api/server-architecture",
        "api/authentication",
        "api/streaming",
        "api/custom-endpoints",
        "api/api-reference",
        {
          type: "category",
          label: "Endpoints",
          items: ["api/endpoints/agents", "api/endpoints/workflows"],
        },
      ],
    },
    {
      type: "category",
      label: "UI",
      items: ["ui/ai-sdk-integration"],
    },
    {
      type: "category",
      label: "Utils",
      items: ["utils/create-prompt", "utils/message-helpers"],
    },
    {
      type: "category",
      label: "Observability",
      items: [
        "observability/overview",
        "observability/developer-console",
        "observability/logging",
        "observability/langfuse",
      ],
    },
    {
      type: "category",
      label: "Deployment",
      items: [
        "deployment/overview",
        "deployment/cloudflare-workers",
        "deployment/netlify-functions",
      ],
    },
    {
      type: "category",
      label: "Evals",
      items: ["evals/overview", "evals/quick-start"],
    },
    {
      type: "category",
      label: "Integrations",
      items: ["integrations/overview", "integrations/nextjs", "integrations/vercel-ai"],
    },

    {
      type: "category",
      label: "Community",
      items: ["community/overview", "community/contributing", "community/licence"],
    },
  ],
};

export default sidebars;
