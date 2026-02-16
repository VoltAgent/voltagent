import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * VoltAgent Observability Platform Documentation Sidebar
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Getting Started",
      items: [
        {
          type: "doc",
          id: "overview",
          label: "Overview",
        },
        "setup",
        "first-trace",
      ],
    },
    {
      type: "doc",
      id: "dashboard",
      label: "Dashboard",
    },
    {
      type: "doc",
      id: "llm-usage-and-costs",
      label: "LLM Usage & Costs",
    },
    {
      type: "doc",
      id: "feedback",
      label: "Feedback",
    },
    {
      type: "category",
      label: "Tracing",
      items: [
        "tracing/overview",
        "tracing/waterfall",
        "tracing/node-based",
        "tracing/logs",
        "tracing/feedback",
        "tracing/users",
      ],
    },
    {
      type: "doc",
      id: "alerts",
      label: "Alerts",
    },
  ],
};

export default sidebars;
