import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  actionsTriggers: [
    "overview",
    {
      type: "category",
      label: "Triggers",
      items: [
        "triggers/overview",
        "triggers/usage",
        "triggers/airtable",
        "triggers/github",
        "triggers/gmail",
        "triggers/google-calendar",
        "triggers/google-drive",
        "triggers/slack",
        "triggers/cron",
      ],
    },
    {
      type: "category",
      label: "Actions",
      items: [
        "actions/overview",
        "actions/airtable",
        "actions/slack",
        "actions/discord",
        "actions/gmail",
        "actions/google-calendar",
        "actions/google-drive",
        "actions/postgres",
      ],
    },
  ],
};

export default sidebars;
