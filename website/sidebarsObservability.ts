import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * VoltAgent Observability Platform Documentation Sidebar
 */
const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Getting Started",
      items: ["overview", "setup", "concept", "why"],
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
      items: ["tracing/overview", "tracing/concept"],
    },
    {
      type: "doc",
      id: "alerts",
      label: "Alerts",
    },
  ],
};

export default sidebars;
