import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  evaluation: [
    "overview",
    "offline-evaluations",
    "live-evaluations",
    "datasets",
    "experiments",
    {
      type: "category",
      label: "Scorers",
      items: ["prebuilt-scorers", "building-custom-scorers"],
    },
    "cli-reference",
    "using-with-viteval",
  ],
};

export default sidebars;
