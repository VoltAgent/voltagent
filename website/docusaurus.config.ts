import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import "dotenv/config";

const config: Config = {
  title: "VoltAgent",
  tagline: "Open Source TypeScript AI Agent Framework",
  favicon: "img/favicon.ico",
  staticDirectories: ["static"],
  customFields: {
    apiURL: process.env.API_URL || "http://localhost:3001",
    appURL: process.env.APP_URL || "http://localhost:3001",
  },

  // Set the production url of your site here
  url: "https://voltagent.dev",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",
  trailingSlash: true,
  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "VoltAgent", // Usually your GitHub org/user name.
  projectName: "VoltAgent", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },
  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],

  presets: [
    [
      "classic",
      {
        docs: {
          routeBasePath: "/docs",
          breadcrumbs: false,
          sidebarCollapsed: false,
          sidebarPath: "./sidebars.ts",
        },
        blog: false,
        theme: {
          customCss: [
            "./src/css/custom.css",
            "./src/css/navbar.css",
            "./src/css/layout.css",
            "./src/css/variables.css",
            "./src/css/font.css",
          ],
        },
        gtag: {
          trackingID: "G-V4GFZ8WQ7D",
          anonymizeIP: true,
        },
      } satisfies Preset.Options,
    ],
  ],
  plugins: [
    async function tailwindcss() {
      return {
        name: "docusaurus-tailwindcss",
        configurePostCss(postcssOptions) {
          postcssOptions.plugins = [
            require("postcss-import"),
            require("tailwindcss"),
            require("autoprefixer"),
          ];
          return postcssOptions;
        },
      };
    },
    // VoltAgent Observability Platform - Separate docs instance
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "observability",
        path: "observability",
        routeBasePath: "observability-docs",
        sidebarPath: "./sidebarsObservability.ts",
        breadcrumbs: false,
        sidebarCollapsed: false,
      },
    ],
    // Evaluation docs
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "evaluation",
        path: "evaluation-docs",
        routeBasePath: "evaluation-docs",
        sidebarPath: "./sidebarsEvaluation.ts",
        breadcrumbs: false,
        sidebarCollapsed: false,
      },
    ],
    // Prompt Engineering docs
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "prompt-engineering",
        path: "prompt-engineering-docs",
        routeBasePath: "prompt-engineering-docs",
        sidebarPath: "./sidebarsPromptEngineering.ts",
        breadcrumbs: false,
        sidebarCollapsed: false,
      },
    ],
    // Deployment docs
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "deployment-standalone",
        path: "deployment-docs",
        routeBasePath: "deployment-docs",
        sidebarPath: "./sidebarsDeployment.ts",
        breadcrumbs: false,
        sidebarCollapsed: false,
      },
    ],
    // Actions & Triggers docs
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "actions-triggers",
        path: "actions-triggers-docs",
        routeBasePath: "actions-triggers-docs",
        sidebarPath: "./sidebarsActionsTriggers.ts",
        breadcrumbs: false,
        sidebarCollapsed: false,
      },
    ],
    // VoltAgent Recipes & Guides - Separate docs instance
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "recipes",
        path: "recipes",
        routeBasePath: "recipes-and-guides",
        sidebarPath: "./sidebarsRecipes.ts",
        breadcrumbs: false,
        sidebarCollapsed: false,
      },
    ],
    "./plugins/fetch-tweets.js",
    "./plugins/clarity/index.js",
    "./plugins/ahrefs/index.js",
    "./plugins/new-year-modal/index.js",
    [
      "@docusaurus/plugin-client-redirects",
      {
        redirects: [
          {
            to: "/ai-agent-marketplace/",
            from: "/marketplace/",
          },
          {
            to: "/about/",
            from: "/manifesto/",
          },
          // Redirect old voltops-llm-observability-docs to new observability-docs
          {
            to: "/observability-docs/",
            from: "/voltops-llm-observability-docs/",
          },
          // Redirect old docs/deployment paths to deployment-docs
          {
            to: "/deployment-docs/",
            from: "/docs/deployment/overview/",
          },
          {
            to: "/deployment-docs/voltops",
            from: "/docs/deployment/voltops/",
          },
          {
            to: "/deployment-docs/cloudflare-workers",
            from: "/docs/deployment/cloudflare-workers/",
          },
          {
            to: "/deployment-docs/netlify-functions",
            from: "/docs/deployment/netlify-functions/",
          },
          {
            to: "/deployment-docs/local-tunnel",
            from: "/docs/deployment/local-tunnel/",
          },
          // Redirect old docs/triggers paths to automations-docs/triggers
          {
            to: "/actions-triggers-docs/triggers/overview",
            from: "/docs/triggers/overview/",
          },
          {
            to: "/actions-triggers-docs/triggers/usage",
            from: "/docs/triggers/usage/",
          },
          {
            to: "/actions-triggers-docs/triggers/airtable",
            from: "/docs/triggers/airtable/",
          },
          {
            to: "/actions-triggers-docs/triggers/github",
            from: "/docs/triggers/github/",
          },
          {
            to: "/actions-triggers-docs/triggers/gmail",
            from: "/docs/triggers/gmail/",
          },
          {
            to: "/actions-triggers-docs/triggers/google-calendar",
            from: "/docs/triggers/google-calendar/",
          },
          {
            to: "/actions-triggers-docs/triggers/google-drive",
            from: "/docs/triggers/google-drive/",
          },
          {
            to: "/actions-triggers-docs/triggers/slack",
            from: "/docs/triggers/slack/",
          },
          {
            to: "/actions-triggers-docs/triggers/cron",
            from: "/docs/triggers/cron/",
          },
          // Redirect old triggers-docs paths to automations-docs/triggers
          {
            to: "/actions-triggers-docs/triggers/overview",
            from: "/triggers-docs/",
          },
          {
            to: "/actions-triggers-docs/triggers/usage",
            from: "/triggers-docs/usage/",
          },
          {
            to: "/actions-triggers-docs/triggers/airtable",
            from: "/triggers-docs/airtable/",
          },
          {
            to: "/actions-triggers-docs/triggers/github",
            from: "/triggers-docs/github/",
          },
          {
            to: "/actions-triggers-docs/triggers/gmail",
            from: "/triggers-docs/gmail/",
          },
          {
            to: "/actions-triggers-docs/triggers/google-calendar",
            from: "/triggers-docs/google-calendar/",
          },
          {
            to: "/actions-triggers-docs/triggers/google-drive",
            from: "/triggers-docs/google-drive/",
          },
          {
            to: "/actions-triggers-docs/triggers/slack",
            from: "/triggers-docs/slack/",
          },
          {
            to: "/actions-triggers-docs/triggers/cron",
            from: "/triggers-docs/cron/",
          },
          // Redirect old docs/actions paths to automations-docs/actions
          {
            to: "/actions-triggers-docs/actions/overview",
            from: "/docs/actions/overview/",
          },
          {
            to: "/actions-triggers-docs/actions/airtable",
            from: "/docs/actions/airtable/",
          },
          {
            to: "/actions-triggers-docs/actions/slack",
            from: "/docs/actions/slack/",
          },
          {
            to: "/actions-triggers-docs/actions/discord",
            from: "/docs/actions/discord/",
          },
          {
            to: "/actions-triggers-docs/actions/gmail",
            from: "/docs/actions/gmail/",
          },
          {
            to: "/actions-triggers-docs/actions/google-calendar",
            from: "/docs/actions/google-calendar/",
          },
          {
            to: "/actions-triggers-docs/actions/google-drive",
            from: "/docs/actions/google-drive/",
          },
          {
            to: "/actions-triggers-docs/actions/postgres",
            from: "/docs/actions/postgres/",
          },
          // Redirect old actions-docs paths to automations-docs/actions
          {
            to: "/actions-triggers-docs/actions/overview",
            from: "/actions-docs/",
          },
          {
            to: "/actions-triggers-docs/actions/airtable",
            from: "/actions-docs/airtable/",
          },
          {
            to: "/actions-triggers-docs/actions/slack",
            from: "/actions-docs/slack/",
          },
          {
            to: "/actions-triggers-docs/actions/discord",
            from: "/actions-docs/discord/",
          },
          {
            to: "/actions-triggers-docs/actions/gmail",
            from: "/actions-docs/gmail/",
          },
          {
            to: "/actions-triggers-docs/actions/google-calendar",
            from: "/actions-docs/google-calendar/",
          },
          {
            to: "/actions-triggers-docs/actions/google-drive",
            from: "/actions-docs/google-drive/",
          },
          {
            to: "/actions-triggers-docs/actions/postgres",
            from: "/actions-docs/postgres/",
          },
          // Redirect old automations-docs paths to actions-triggers-docs
          {
            to: "/actions-triggers-docs/",
            from: "/automations-docs/",
          },
          // Redirect old docs/evals paths to evaluation-docs
          {
            to: "/evaluation-docs/",
            from: "/docs/evals/overview/",
          },
          {
            to: "/evaluation-docs/offline-evaluations",
            from: "/docs/evals/offline-evaluations/",
          },
          {
            to: "/evaluation-docs/live-evaluations",
            from: "/docs/evals/live-evaluations/",
          },
          {
            to: "/evaluation-docs/datasets",
            from: "/docs/evals/datasets/",
          },
          {
            to: "/evaluation-docs/experiments",
            from: "/docs/evals/experiments/",
          },
          {
            to: "/evaluation-docs/prebuilt-scorers",
            from: "/docs/evals/prebuilt-scorers/",
          },
          {
            to: "/evaluation-docs/building-custom-scorers",
            from: "/docs/evals/building-custom-scorers/",
          },
          {
            to: "/evaluation-docs/cli-reference",
            from: "/docs/evals/cli-reference/",
          },
          {
            to: "/evaluation-docs/using-with-viteval",
            from: "/docs/evals/using-with-viteval/",
          },
          // Redirect old docs-observability paths to observability-docs
          {
            to: "/observability-docs/",
            from: "/docs-observability/vercel-ai/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/voltagent-framework",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/js-ts-sdk/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/python-sdk/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/openai-sdk/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/langchain/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/llamaindex/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/autogen/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/semantic-kernel/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/pydantic-ai/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/spring-ai/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/agno/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/crewai/",
          },
          {
            to: "/observability-docs/",
            from: "/docs-observability/rest-api/",
          },
          {
            to: "/docs/rag/overview/",
            from: "/docs/agents/retriever/",
          },
          {
            to: "/customers/",
            from: "/showcase/",
          },
          {
            to: "/customers/content-pipeline/",
            from: "/showcase/4-agent-ai-team-blog-research/",
          },
          {
            to: "/customers/devpotenciados/",
            from: "/showcase/inventory-query-agent/",
          },
          {
            to: "/customers/",
            from: "/showcase/999-dev-ai-teammate/",
          },
          {
            to: "/",
            from: "/pricing/",
          },
          {
            to: "/recipes-and-guides/",
            from: "/recipes/",
          },
          {
            to: "/recipes-and-guides/slack-agent/",
            from: "/recipes/slack-agent/",
          },
          {
            to: "/docs/getting-started/providers-models/",
            from: "/docs/providers/overview/",
          },
          {
            to: "/docs/getting-started/providers-models/",
            from: "/docs/providers/anthropic-ai/",
          },
          {
            to: "/docs/getting-started/providers-models/",
            from: "/docs/providers/google-ai/",
          },
          {
            to: "/docs/getting-started/providers-models/",
            from: "/docs/providers/groq-ai/",
          },
          {
            to: "/docs/getting-started/providers-models/",
            from: "/docs/providers/vercel-ai/",
          },
          {
            to: "/docs/getting-started/providers-models/",
            from: "/docs/providers/xsai/",
          },
          {
            to: "/docs/getting-started/providers-models/",
            from: "/docs/providers/contributing/",
          },
          // Redirect old /examples/ paths to /recipes-and-guides/
          {
            to: "/recipes-and-guides/",
            from: "/examples/",
          },
          {
            to: "/recipes-and-guides/recipe-generator/",
            from: "/examples/agents/recipe-generator/",
          },
          {
            to: "/recipes-and-guides/research-assistant/",
            from: "/examples/agents/research-assistant/",
          },
          {
            to: "/recipes-and-guides/whatsapp-ai-agent/",
            from: "/examples/agents/whatsapp-ai-agent/",
          },
          {
            to: "/recipes-and-guides/ai-instagram-ad-agent/",
            from: "/examples/agents/ai-instagram-ad-agent/",
          },
          {
            to: "/recipes-and-guides/youtube-blog-agent/",
            from: "/examples/agents/youtube-blog-agent/",
          },
          {
            to: "/recipes-and-guides/chatgpt-app/",
            from: "/examples/agents/chatgpt-app/",
          },
        ],
      },
    ],
    [
      "./plugins/docusaurus-plugin-content-blog",
      {
        id: "blog",
        routeBasePath: "blog",
        path: "./blog",
        postsPerPage: 1000,
        showReadingTime: true,
        editUrl: "https://github.com/voltagent/voltagent/tree/main/website/",
        feedOptions: {
          type: "all",
          title: "VoltAgent Blog",
          description: "The latest posts from the VoltAgent Blog",
          limit: 5000,
        },
      },
    ],

    "./plugins/gurubase/index.js",
    [
      "./plugins/docusaurus-plugin-content-mcp",
      {
        id: "mcp",
        routeBasePath: "mcp",
        path: "./src/components/mcp-list/data",
      },
    ],
    [
      "./plugins/docusaurus-plugin-content-customers",
      {
        id: "customers",
        contentPath: "src/components/customers",
      },
    ],
    [
      "./plugins/docusaurus-plugin-content-usecases",
      {
        id: "usecases",
        contentPath: "src/components/usecases",
      },
    ],
    // Examples plugin disabled - examples are now in /recipes-and-guides/
    // [
    //   "./plugins/docusaurus-plugin-content-examples",
    //   {
    //     id: "examples",
    //     contentPath: "examples",
    //   },
    // ],
  ],
  themeConfig: {
    image: "img/social3.png",
    announcementBar: {
      id: "support_us",
      content:
        "<a target='_blank' rel='noopener noreferrer' href='https://github.com/VoltAgent/voltagent/stargazers'>⭐ We're open source - a GitHub star means a lot to us. Thank you for the support!</a>",
      backgroundColor: "transparent",
      textColor: "#10B981 !important",
      isCloseable: true,
    },
    colorMode: {
      disableSwitch: true,
      defaultMode: "dark",
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: "VoltAgent",
      style: "dark",
      items: [
        {
          to: "/about",
          label: "About us",
          position: "left",
        },
        {
          to: "/docs",
          label: "Documentation",
          position: "left",
        },
        {
          to: "/observability-docs",
          label: "Observability",
          position: "left",
        },
        {
          to: "/showcase",
          label: "Showcase",
          position: "left",
        },
        {
          to: "/customers",
          label: "Customers",
          position: "left",
        },
        {
          to: "/blog",
          label: "Blog",
          position: "left",
        },
        {
          to: "/mcp",
          label: "MCP",
          position: "left",
        },
      ],
    },
    footer: {
      copyright: " ",
    },
    algolia: {
      appId: "C1TWP51DBB",
      apiKey: "80f0ff7c295210b58b46e0623e09654c",
      indexName: "web",
      contextualSearch: true,
      searchParameters: {
        attributesToHighlight: ["hierarchy.lvl0", "hierarchy"],
      },
    },

    prism: {
      darkTheme: {
        plain: {
          color: "#f0f6fc",
          backgroundColor: "#010409",
        },
        styles: [
          {
            types: ["comment", "prolog", "doctype", "cdata"],
            style: {
              color: "#8b949e",
              fontStyle: "italic",
            },
          },
          {
            types: ["punctuation"],
            style: {
              color: "#f0f6fc",
            },
          },
          {
            types: ["property", "constant", "symbol"],
            style: {
              color: "#79c0ff",
            },
          },
          {
            types: ["tag", "deleted"],
            style: {
              color: "#7ee787",
            },
          },
          {
            types: ["boolean", "number"],
            style: {
              color: "#79c0ff",
            },
          },
          {
            types: ["string", "char", "inserted"],
            style: {
              color: "#a5d6ff",
            },
          },
          {
            types: ["selector", "attr-name", "builtin"],
            style: {
              color: "#7ee787",
            },
          },
          {
            types: ["operator", "entity", "url"],
            style: {
              color: "#ff7b72",
            },
          },
          {
            types: ["atrule", "attr-value", "keyword"],
            style: {
              color: "#ff7b72",
            },
          },
          {
            types: ["function", "class-name"],
            style: {
              color: "#d2a8ff",
            },
          },
          {
            types: ["regex", "important", "variable"],
            style: {
              color: "#79c0ff",
            },
          },
        ],
      },

      additionalLanguages: ["diff", "diff-ts", "diff-yml", "bash"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
