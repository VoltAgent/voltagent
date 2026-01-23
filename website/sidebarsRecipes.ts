import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * Recipes & Guides sidebar configuration
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "doc",
      id: "overview",
      label: "Overview",
    },
    {
      type: "category",
      label: "Guides",
      items: [
        {
          type: "doc",
          id: "airtable-agent",
          label: "Airtable Agent",
        },
        {
          type: "doc",
          id: "slack-agent",
          label: "Slack Agent",
        },
      ],
    },
    {
      type: "category",
      label: "Examples",
      items: [
        {
          type: "doc",
          id: "recipe-creator",
          label: "AI Recipe Generator Agent",
        },
        {
          type: "doc",
          id: "research-assistant",
          label: "AI Research Assistant Agent",
        },
        {
          type: "doc",
          id: "whatsapp-order",
          label: "WhatsApp Order Agent",
        },
        {
          type: "doc",
          id: "ad-creator",
          label: "AI Ads Generator Agent",
        },
        {
          type: "doc",
          id: "youtube-to-blog",
          label: "YouTube to Blog Agent",
        },
        {
          type: "doc",
          id: "mcp-chatgpt",
          label: "ChatGPT App With VoltAgent",
        },
      ],
    },
    {
      type: "category",
      label: "Recipes",
      items: [
        {
          type: "doc",
          id: "calling-agents",
          label: "Calling Agents",
        },
        {
          type: "doc",
          id: "tools",
          label: "Tools",
        },
        {
          type: "doc",
          id: "tool-routing",
          label: "Tool Routing",
        },
        {
          type: "doc",
          id: "authentication",
          label: "Authentication",
        },
        {
          type: "doc",
          id: "hooks",
          label: "Hooks",
        },
        {
          type: "doc",
          id: "tool-hooks",
          label: "Tool Hooks",
        },
        {
          type: "doc",
          id: "retrying",
          label: "Retrying",
        },
        {
          type: "doc",
          id: "fallback",
          label: "Fallback",
        },
        {
          type: "doc",
          id: "subagents",
          label: "Subagents",
        },
        {
          type: "doc",
          id: "memory",
          label: "Memory",
        },
        {
          type: "doc",
          id: "workflows",
          label: "Workflows",
        },
        {
          type: "doc",
          id: "guardrails",
          label: "Guardrails",
        },
        {
          type: "doc",
          id: "voice",
          label: "Voice",
        },
        {
          type: "doc",
          id: "retrieval",
          label: "Retrieval",
        },
        {
          type: "doc",
          id: "mcp",
          label: "MCP",
        },
        {
          type: "doc",
          id: "custom-endpoints",
          label: "Custom Endpoints",
        },
        {
          type: "doc",
          id: "langfuse",
          label: "Langfuse",
        },
        {
          type: "doc",
          id: "anthropic",
          label: "Anthropic",
        },
        {
          type: "doc",
          id: "google-ai",
          label: "Google AI",
        },
        {
          type: "doc",
          id: "groq",
          label: "Groq",
        },
        {
          type: "doc",
          id: "ollama",
          label: "Ollama",
        },
      ],
    },
  ],
};

export default sidebars;
