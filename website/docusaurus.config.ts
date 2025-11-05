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
        routeBasePath: "voltops-llm-observability-docs",
        sidebarPath: "./sidebarsObservability.ts",
        breadcrumbs: false,
        sidebarCollapsed: false,
      },
    ],
    "./plugins/fetch-tweets.js",
    "./plugins/clarity/index.js",
    "./plugins/ahrefs/index.js",
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
          {
            to: "/voltops-llm-observability-docs/vercel-ai/",
            from: "/docs-observability/vercel-ai/",
          },
          {
            to: "/voltops-llm-observability-docs/voltagent-framework/",
            from: "/docs-observability/voltagent-framework",
          },
          {
            to: "/voltops-llm-observability-docs/js-ts-sdk/",
            from: "/docs-observability/js-ts-sdk/",
          },
          {
            to: "/voltops-llm-observability-docs/python-sdk/",
            from: "/docs-observability/python-sdk/",
          },
          {
            to: "/voltops-llm-observability-docs/openai-sdk/",
            from: "/docs-observability/openai-sdk/",
          },
          {
            to: "/voltops-llm-observability-docs/langchain/",
            from: "/docs-observability/langchain/",
          },
          {
            to: "/voltops-llm-observability-docs/llamaindex/",
            from: "/docs-observability/llamaindex/",
          },
          {
            to: "/voltops-llm-observability-docs/autogen/",
            from: "/docs-observability/autogen/",
          },
          {
            to: "/voltops-llm-observability-docs/semantic-kernel/",
            from: "/docs-observability/semantic-kernel/",
          },
          {
            to: "/voltops-llm-observability-docs/pydantic-ai/",
            from: "/docs-observability/pydantic-ai/",
          },
          {
            to: "/voltops-llm-observability-docs/spring-ai/",
            from: "/docs-observability/spring-ai/",
          },
          {
            to: "/voltops-llm-observability-docs/agno/",
            from: "/docs-observability/agno/",
          },
          {
            to: "/voltops-llm-observability-docs/crewai/",
            from: "/docs-observability/crewai/",
          },
          {
            to: "/voltops-llm-observability-docs/rest-api/",
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
    [
      "./plugins/docusaurus-plugin-content-examples",
      {
        id: "examples",
        contentPath: "examples",
      },
    ],
  ],
  themeConfig: {
    image: "img/social3.png",
    announcementBar: {
      id: "support_us",
      content:
        // "<a target='_blank' rel='noopener noreferrer' href='https://github.com/VoltAgent/voltagent/stargazers'>⭐ We're open source – a GitHub star means a lot to us. Thank you for the support! ❤️ </a>",
        "<a target='_blank' rel='noopener noreferrer' href='https://voltagent.dev/launch-week-november-25/'>🚀 Launch Week 2 is live – New features dropping daily</a>",
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
          to: "/voltops-llm-observability-docs",
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
