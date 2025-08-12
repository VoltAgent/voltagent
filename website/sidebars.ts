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
        "agents/mcp",
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
        "agents/memory/libsql",
        "agents/memory/postgres",
        "agents/memory/supabase",
        "agents/memory/in-memory",
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
      items: ["api/overview"],
    },
    {
      type: "category",
      label: "Migration Guide",
      items: ["migration-guide/0.1.x-to-1.0.0"],
    },
    {
      type: "category",
      label: "Providers",
      items: [
        "providers/overview",
        "providers/vercel-ai",
        "providers/google-ai",
        "providers/groq-ai",
        "providers/xsai",
        "providers/anthropic-ai",
        "providers/contributing",
      ],
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
