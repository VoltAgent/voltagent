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
      type: "doc",
      id: "home",
      label: "Home",
    },
    {
      type: "category",
      label: "Get Started",
      collapsed: true,
      items: [
        "getting-started/overview",
        {
          type: "category",
          label: "Quick Start",
          link: {
            type: "doc",
            id: "getting-started/quick-start",
          },
          items: ["getting-started/quick-start", "getting-started/manual-setup"],
        },
        "getting-started/voltagent-instance",
        "getting-started/mcp-docs-server",
        {
          type: "link",
          label: "5-Step Tutorial",
          href: "https://voltagent.dev/tutorial/introduction",
          customProps: {
            target: "_blank",
            rel: "noreferrer",
          },
        },
        "getting-started/providers-models",
        "getting-started/model-router",
        "getting-started/comparison",
        "getting-started/migration-guide",
      ],
    },
    {
      type: "category",
      label: "Agents",
      collapsed: true,
      items: [
        "agents/overview",
        "agents/prompts",
        "agents/tools",
        {
          type: "doc",
          id: "agents/plan-agent",
          label: "PlanAgent",
          customProps: {
            badge: {
              label: "Experimental",
              variant: "accent",
            },
          },
        },
        {
          type: "doc",
          id: "agents/summarization",
          label: "Summarization",
          customProps: {
            badge: {
              label: "New",
              variant: "accent",
            },
          },
        },
        "agents/memory",
        {
          type: "category",
          label: "MCP",
          items: ["agents/mcp/mcp", "agents/mcp/authorization", "agents/mcp/mcp-server"],
        },
        "agents/a2a/a2a-server",
        "agents/hooks",
        "agents/middleware",
        "agents/message-types",
        "agents/multi-modal",
        "agents/providers",
        "agents/retries-fallback",
        "agents/subagents",
        "agents/voice",
        "agents/context",
        "agents/dynamic-agents",
        "agents/cancellation",
        "agents/resumable-streaming",
      ],
    },
    {
      type: "category",
      label: "Guardrails",
      collapsed: true,
      customProps: {
        badge: {
          label: "New",
          variant: "accent",
        },
      },
      items: ["guardrails/overview", "guardrails/built-in"],
    },
    {
      type: "category",
      label: "Workflows",
      collapsed: true,
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
        "workflows/steps/and-branch",
        "workflows/steps/and-tap",
        "workflows/steps/and-guardrail",
        "workflows/steps/and-all",
        "workflows/steps/and-race",
        "workflows/steps/and-foreach",
        "workflows/steps/and-loop",
        "workflows/steps/and-sleep",
        "workflows/steps/and-sleep-until",
        "workflows/steps/and-map",
      ],
    },
    {
      type: "doc",
      id: "evals",
      label: "Evals",
      customProps: {
        badge: {
          label: "New",
          variant: "accent",
        },
      },
    },
    {
      type: "category",
      label: "Memory",
      collapsed: true,
      items: [
        "agents/memory/overview",
        "agents/memory/working-memory",
        "agents/memory/semantic-search",
        {
          type: "category",
          label: "Storage Adapters",
          items: [
            "agents/memory/in-memory",
            {
              type: "doc",
              id: "agents/memory/managed-memory",
              customProps: {
                badge: {
                  label: "New",
                  variant: "accent",
                },
              },
            },
            "agents/memory/libsql",
            "agents/memory/cloudflare-d1",
            "agents/memory/postgres",
            "agents/memory/supabase",
          ],
        },
      ],
    },
    {
      type: "doc",
      id: "triggers",
      label: "Triggers",
      customProps: {
        badge: {
          label: "New",
          variant: "accent",
        },
      },
    },
    {
      type: "doc",
      id: "actions",
      label: "Actions",
      customProps: {
        badge: {
          label: "New",
          variant: "accent",
        },
      },
    },
    {
      type: "category",
      label: "Tools",
      collapsed: true,
      items: ["tools/overview", "tools/reasoning-tool"],
    },
    {
      type: "category",
      label: "RAG",
      collapsed: true,
      items: [
        "rag/overview",
        "rag/custom-retrievers",
        "rag/voltagent",
        {
          type: "category",
          label: "Chunkers",
          items: [
            "rag/chunkers/overview",
            "rag/chunkers/structured-document",
            "rag/chunkers/token-chunker",
            "rag/chunkers/sentence-chunker",
            "rag/chunkers/recursive-chunker",
            "rag/chunkers/table-chunker",
            "rag/chunkers/code-chunker",
            "rag/chunkers/markdown-chunker",
            "rag/chunkers/semantic-markdown-chunker",
            "rag/chunkers/html-chunker",
            "rag/chunkers/json-chunker",
            "rag/chunkers/latex-chunker",
            "rag/chunkers/semantic-chunker",
            "rag/chunkers/late-chunker",
            "rag/chunkers/neural-chunker",
            "rag/chunkers/slumber-chunker",
          ],
        },
        "rag/chroma",
        "rag/pinecone",
        "rag/qdrant",
      ],
    },
    {
      type: "category",
      label: "API",
      collapsed: true,
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
          items: [
            "api/endpoints/agents",
            "api/endpoints/workflows",
            "api/endpoints/memory",
            "api/endpoints/tools",
          ],
        },
      ],
    },
    {
      type: "category",
      label: "UI",
      collapsed: true,
      items: ["ui/overview", "ui/ai-sdk-integration", "ui/copilotkit", "ui/assistant-ui"],
    },
    {
      type: "category",
      label: "Utils",
      collapsed: true,
      items: ["utils/create-prompt", "utils/message-helpers"],
    },
    {
      type: "category",
      label: "Observability",
      collapsed: true,
      items: [
        "observability/overview",
        "observability/developer-console",
        "observability/logging",
        "observability/langfuse",
      ],
    },
    {
      type: "doc",
      id: "deployment",
      label: "Deployment",
    },
    {
      type: "category",
      label: "Integrations",
      collapsed: true,
      items: ["integrations/overview", "integrations/nextjs", "integrations/vercel-ai"],
    },

    {
      type: "category",
      label: "Troubleshooting",
      collapsed: true,
      items: ["troubleshooting/connection"],
    },

    {
      type: "category",
      label: "Community",
      collapsed: true,
      items: ["community/overview", "community/contributing", "community/licence"],
    },
  ],
};

export default sidebars;
