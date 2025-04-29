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
      items: ["getting-started/overview", "getting-started/quick-start"],
    },
    {
      type: "category",
      label: "Agents",
      items: [
        "agents/overview",
        "agents/tools",
        "agents/retriever",
        "agents/mcp",
        "agents/hooks",
        "agents/providers",
        "agents/subagents",
        "agents/voice",
      ],
    },
    {
      type: "category",
      label: "Memory",
      items: [
        "agents/memory/overview",
        "agents/memory/libsql",
        "agents/memory/supabase",
        "agents/memory/in-memory",
      ],
    },
    {
      type: "category",
      label: "Observability",
      items: ["observability/overview", "observability/developer-console"],
    },
    {
      type: "category",
      label: "Tools",
      items: ["tools/overview", "tools/reasoning-tool"],
    },
    {
      type: "category",
      label: "Utils",
      items: ["utils/create-prompt"],
    },
    {
      type: "category",
      label: "Integrations",
      items: ["integrations/overview", "integrations/nextjs"],
    },
    {
      type: "category",
      label: "API",
      items: ["api/overview"],
    },
    {
      type: "category",
      label: "Community",
      items: [
        "community/overview",
        "community/contributing",
        "community/licence",
      ],
    },
  ],
};

export default sidebars;
