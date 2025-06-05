import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * VoltAgent Observability Platform Documentation Sidebar
 * Framework-agnostic observability and monitoring tools
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Getting Started",
      items: ["overview", "concept"],
    },
    {
      type: "category",
      label: "Tracing",
      items: [
        "tracing/overview",
        "tracing/concept",
        {
          type: "category",
          label: "Features",
          items: [
            {
              type: "doc",
              id: "tracing/agent-visualization",
              label: "Agent Flow Charts",
            },

            {
              type: "doc",
              id: "tracing/metadata",
              label: "Metadata",
            },
            {
              type: "doc",
              id: "tracing/multimodal-tracing",
              label: "Multimodal Tracing",
            },
            {
              type: "doc",
              id: "tracing/sessions",
              label: "Sessions",
            },
            {
              type: "doc",
              id: "tracing/tags",
              label: "Tags",
            },
            {
              type: "doc",
              id: "tracing/trace-id",
              label: "Trace ID",
            },
          ],
        },
      ],
    },
    {
      type: "category",
      label: "LLM Usage & Costs",
      items: ["llm-usage-and-costs"],
    },
    {
      type: "category",
      label: "Prompting (Soon)",
      items: [],
      collapsed: true,
      collapsible: false,
      className: "sidebar-item-disabled",
    },
    {
      type: "category",
      label: "Evaluation (Soon)",
      items: [],
      collapsed: true,
      collapsible: false,
      className: "sidebar-item-disabled",
    },
    {
      type: "category",
      label: "Framework Integrations",
      items: [
        "voltagent-framework",
        "vercel-ai",
        {
          type: "doc",
          id: "openai-sdk",
          label: "🚧 OpenAI SDK",
        },
        {
          type: "doc",
          id: "langchain",
          label: "🚧 LangChain",
        },
        {
          type: "doc",
          id: "llamaindex",
          label: "🚧 LlamaIndex",
        },
        {
          type: "doc",
          id: "autogen",
          label: "🚧 AutoGen",
        },
        {
          type: "doc",
          id: "semantic-kernel",
          label: "🚧 Semantic Kernel",
        },
        {
          type: "doc",
          id: "pydantic-ai",
          label: "🚧 Pydantic AI",
        },
        {
          type: "doc",
          id: "spring-ai",
          label: "🚧 Spring AI",
        },
        {
          type: "doc",
          id: "agno",
          label: "🚧 Agno",
        },
        {
          type: "doc",
          id: "crewai",
          label: "🚧 CrewAI",
        },
      ],
    },
    {
      type: "category",
      label: "SDKs",
      items: [
        {
          type: "doc",
          id: "js-ts-sdk",
          label: "JavaScript/TypeScript SDK",
        },
        {
          type: "doc",
          id: "python-sdk",
          label: "Python SDK",
        },
        {
          type: "doc",
          id: "rest-api",
          label: "🚧 REST API",
        },
      ],
    },
  ],
};

export default sidebars;
