import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";
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
        routeBasePath: "docs-observability",
        sidebarPath: "./sidebarsObservability.ts",
        breadcrumbs: false,
        sidebarCollapsed: false,
      },
    ],
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
    [
      "./plugins/docusaurus-plugin-content-showcase",
      {
        id: "showcase",
        contentPath: "src/components/showcase",
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
  ],
  themeConfig: {
    image: "img/social2.png",
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
          to: "/docs-observability",
          label: "Observability",
          position: "left",
        },
        {
          to: "/showcase",
          label: "Showcase",
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
          color: "#e2e8f0",
          backgroundColor: "#000000",
        },
        styles: [
          {
            types: ["comment", "prolog", "doctype", "cdata"],
            style: {
              color: "#8b949e", // Light gray - comments
              fontStyle: "italic",
            },
          },
          {
            types: ["namespace"],
            style: {
              opacity: 0.7,
            },
          },
          {
            types: ["string", "attr-value", "char", "regex"],
            style: {
              color: "#a5d6ff", // Light blue (Strings)
            },
          },
          {
            types: ["punctuation", "operator"],
            style: {
              color: "#c9d1d9", // Light gray (Punctuation marks, operators)
            },
          },
          {
            types: [
              "entity",
              "url",
              "symbol",
              "number",
              "boolean",
              "variable",
              "constant",
              "property",
              "inserted",
            ],
            style: {
              color: "#79c0ff", // Light blue (Variables, numbers, booleans)
            },
          },
          {
            types: ["keyword", "selector"],
            style: {
              color: "#ff7b72", // Reddish (Keywords, like `import`, `const`, `async`)
            },
          },
          {
            types: ["atrule", "attr-name"],
            style: {
              color: "#d2a8ff", // Light purple (CSS @rules and HTML attribute names)
            },
          },
          {
            types: ["function", "deleted", "tag"],
            style: {
              color: "#d2a8ff", // Light purple (Functions, JSX/HTML tags)
            },
          },
          {
            types: ["function-variable"],
            style: {
              color: "#f778ba", // Pink (Function variables)
            },
          },
          {
            types: ["class-name", "builtin"],
            style: {
              color: "#ffa657", // Orange (Class names, like `React.FC`)
            },
          },
        ],
      },

      additionalLanguages: ["diff", "diff-ts", "diff-yml", "bash"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
