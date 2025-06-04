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
        {
          type: "doc",
          id: "tracing/sending-traces",
          label: "Feature 1",
        },
        {
          type: "doc",
          id: "tracing/grouping-traces",
          label: "Feature 2",
        },

        {
          type: "doc",
          id: "tracing/prompt-versioning",
          label: "Feature 5",
        },
      ],
    },
    {
      type: "category",
      label: "Prompting",
      items: [
        "prompting/overview",

        {
          type: "doc",
          id: "prompting/grouping-traces",
          label: "Feature 2",
        },

        {
          type: "doc",
          id: "tracing/prompt-versioning",
          label: "Feature 5",
        },
      ],
    },
    {
      type: "category",
      label: "Evaluation",
      items: [
        "evaluation/overview",

        {
          type: "doc",
          id: "evaluation/grouping-traces",
          label: "Feature 2",
        },

        {
          type: "doc",
          id: "evaluation/prompt-versioning",
          label: "Feature 5",
        },
      ],
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
