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
  ],
};

export default sidebars;
