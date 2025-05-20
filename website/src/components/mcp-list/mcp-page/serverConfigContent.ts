import type { SVGProps } from "react";

// Defines the structure for individual pieces of content (text, code, heading)
export interface ServerConfigContentItem {
  type: "text" | "code" | "heading";
  value: string; // Main content (text, code string, or paragraph for heading)
  title?: string; // Optional title for a step or heading text
  language?: string; // Optional language for code blocks (e.g., 'json', 'python', 'bash')
}

// Defines the configuration structure for a specific nested tab (Voltagent, Cursor, Claude)
// Voltagent can be a simple string (JSON config) or structured content.
export type NestedTabConfig = string | ServerConfigContentItem[];

// New interface for server generation instructions
export interface ServerGenerationInfo {
  urlTemplate?: string; // e.g., "https://www.gumloop.com/mcp/{mcpname}" - Now optional
  mcpNameValue?: string; // The actual value for {mcpname}, defaults to "ahrefs"
  promptTextBeforeLink?: string; // Text before the link
  linkText?: string; // Text for the hyperlink itself, defaults to "Generate your server URL" - Now optional
  promptTextAfterLink?: string; // Text after the link
}

// Defines the server configurations for a single main provider (e.g., Gumloop)
export interface ProviderServerConfig {
  voltagent?: NestedTabConfig; // Optional: if not present, main page's default config for Voltagent may be used
  cursor: ServerConfigContentItem[];
  claude: ServerConfigContentItem[];
  serverGenerationInfo?: ServerGenerationInfo; // Added new field
}

// Main object holding configurations for all providers
export const providerServerConfigs: {
  [providerId: string]: ProviderServerConfig;
} = {
  zapier: {
    // Voltagent: (Defaults to currentTab.serverConfig from tabOptions if not specified here)
    cursor: [
      {
        type: "heading",
        title: "Authenticating Zapier MCP with Cursor",
        value: "",
      },
      {
        type: "text",
        value:
          "To use the Zapier MCP with Cursor, ensure your Zapier server is running and accessible. Then, configure Cursor to point to your Zapier MCP endpoint.",
      },
      {
        type: "text",
        title: "Step 1: Add MCP Server in Cursor",
        value:
          "Go to Cursor Settings > MCP > Add a new global MCP Server. Add your Zapier MCP server details, typically the URL where your Zapier MCP is hosted.",
      },
      {
        type: "code",
        language: "json",
        value: JSON.stringify(
          {
            mcpServers: {
              "zapier-mcp": {
                url: "<YOUR_ZAPIER_MCP_SERVER_URL>",
              },
            },
          },
          null,
          2,
        ),
      },
      {
        type: "text",
        title: "Step 2: Use in Agent Mode",
        value:
          "Once connected, you can interact with your Zapier actions via Cursor in Agent mode.",
      },
    ],
    claude: [
      {
        type: "heading",
        title: "Using Zapier MCP with Claude",
        value: "",
      },
      {
        type: "text",
        value:
          "To use Zapier integrations with Claude, you'll need to reference your Zapier MCP server in your prompts. Here's how to do it:",
      },
      {
        type: "text",
        title: "Step 1: Find your Zapier MCP server URL",
        value: "Make sure your Zapier MCP server is running and note its URL.",
      },
      {
        type: "text",
        title: "Step 2: Reference the Zapier MCP in your Claude prompt",
        value:
          "In your prompt to Claude, include information about your Zapier server like this:",
      },
      {
        type: "code",
        language: "markdown",
        value:
          "I'd like to use my Zapier integrations. My Zapier MCP server is running at: <YOUR_ZAPIER_MCP_SERVER_URL>.\n\nPlease help me use this to [describe what you want Claude to do with Zapier].",
      },
    ],
  },
  gumloop: {
    // Voltagent: (Defaults to currentTab.serverConfig from tabOptions if not specified here)
    // The general Gumloop server config might be the one from mcpData.json.
    // If GuMCP is used for Voltagent as well, this section would be similar to Claude/Cursor.
    cursor: [
      { type: "heading", title: "Authenticating guMCP with Cursor", value: "" },
      {
        type: "text",
        title: "Step 1: Setup MCP in Cursor",
        value:
          'To setup this new MCP server in Cursor go to Settings > Cursor Settings. From there go to MCP and click "Add a new global MCP Server".\n\nThis will open your mcp.json file. Add your configuration in the following format:',
      },
      {
        type: "code",
        language: "json",
        value: JSON.stringify(
          {
            mcpServers: {
              "name-of-connection": {
                url: "your-guMCP-url", // e.g., http://localhost:8000/gumloop/v1 if guMCP serves it there
              },
            },
          },
          null,
          2,
        ),
      },
      {
        type: "text",
        title: "Step 2: Validate Connection",
        value:
          "After having saved mcp.json, you should see a live connection in the MCP section of your Cursor settings.",
      },
      {
        type: "text",
        title: "Step 3: Use Agent Mode",
        value:
          "You can now interact with your tool from Cursor chat in Agent mode!",
      },
    ],
    claude: [
      {
        type: "heading",
        title: "Claude Integration with GuMCP",
        value: "",
      },
      {
        type: "text",
        value:
          "To configure Claude to use the Ahrefs MCP server, you need to reference it in your prompts. Here is how you can do that.",
      },
      {
        type: "text",
        title: "Step 1: Find your GuMCP server URL",
        value:
          "Ensure your GuMCP server is running. For this example, let's say it's at http://localhost:8000.",
      },
      {
        type: "text",
        title: "Step 2: Include in Claude prompt",
        value:
          "In your prompt to Claude, include information about your server like this:",
      },
      {
        type: "code",
        language: "markdown",
        value: `Human: I'd like to use Ahrefs tools through my GuMCP server. My server details are:

Server URL: http://localhost:8000/{{AHREFS_SERVER_FOR_GUMCP}}/v1

Can you help me analyze the SEO profile of example.com using this MCP server?
`,
      },
    ],
    serverGenerationInfo: {
      urlTemplate: "https://www.gumloop.com/mcp/{mcpname}",
      mcpNameValue: "ahrefs", // As per user request context
      promptTextBeforeLink: "To get started with Gumloop:",
      linkText: "Generate your Gumloop MCP server URL",
      promptTextAfterLink:
        "and then follow the setup instructions in the tabs below for your preferred client (Cursor or Claude).",
    },
  },
  composio: {
    // Voltagent: (Defaults to currentTab.serverConfig from tabOptions)
    cursor: [
      {
        type: "heading",
        title: "Authenticating Composio MCP with Cursor",
        value: "",
      },
      {
        type: "text",
        title: "Step 1: Generate Configuration",
        value:
          "Visit mcp.composio.dev to generate your custom Composio MCP configuration.",
      },
      {
        type: "text",
        title: "Step 2: Install MCP Tools",
        value:
          "Paste the `npx` command generated by mcp.composio.dev into your terminal.",
      },
      {
        type: "text",
        title: "Step 3: Verify Installation",
        value:
          "Open Cursor settings and navigate to **MCP** to confirm the MCP servers are installed. If everything looks correct, you can start using MCP features directly in Cursor.",
      },
    ],
    claude: [
      {
        type: "heading",
        title: "Authenticating Composio MCP with Claude",
        value: "",
      },
      {
        type: "text",
        title: "Step 1: Generate Configuration",
        value:
          "Visit mcp.composio.dev to generate your custom Composio MCP configuration.",
      },
      {
        type: "text",
        title: "Step 2: Install MCP Tools",
        value:
          "Paste the command generated from mcp.composio.dev into your terminal.",
      },
      {
        type: "text",
        title: "Step 3: Verify Installation",
        value:
          'Restart the Claude Desktop app and check installed tools by clicking the "hammer" icon in the Claude chat interface.',
      },
    ],
    serverGenerationInfo: {
      urlTemplate: "https://mcp.composio.dev/{mcpname}",
      mcpNameValue: "ahrefs", // As per user request context
      promptTextBeforeLink: "For Composio:",
      linkText: "Generate your Composio MCP URL",
      promptTextAfterLink:
        "and then use the configuration details shown in the tabs below.",
    },
  },
};

// These are no longer needed as static exports if all content is in providerServerConfigs
// export const claudeTabContent: ServerConfigContentItem[] = [...];
// export const cursorTabContent: ServerConfigContentItem[] = [...];

// Tab options for filtering
export interface TabOption {
  id: string;
  name: string;
  serverConfig: string;
  tools?: {
    id: string;
    name: string;
    description: string;
    inputs?: {
      name: string;
      type: string;
      required: boolean;
      description: string;
    }[];
  }[];
}

export const tabOptions: TabOption[] = [
  {
    id: "zapier",
    name: "Zapier",
    serverConfig: `{
  "mcpServers": {
    "zapier": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-zapier"
      ],
      "env": {
        "ZAPIER_ACCESS_TOKEN": "<YOUR_TOKEN>",
        "ZAPIER_API_URL": "https://api.zapier.com/v1"
      }
    }
  }
}`,
    tools: [
      {
        id: "zap_run",
        name: "run_zap",
        description: "Execute a Zapier automation workflow",
        inputs: [
          {
            name: "zap_id",
            type: "string",
            required: true,
            description: "The ID of the Zap to execute",
          },
          {
            name: "input_data",
            type: "object",
            required: true,
            description: "Data to pass to the Zap workflow",
          },
        ],
      },
      {
        id: "zap_list",
        name: "list_zaps",
        description: "List available Zapier automations",
        inputs: [
          {
            name: "status",
            type: "string",
            required: false,
            description: "Filter by Zap status: 'active', 'disabled', or 'all'",
          },
        ],
      },
    ],
  },
  {
    id: "gumloop",
    name: "Gumloop",
    serverConfig: `{
  "mcpServers": {
    "gumloop": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-gumloop"
      ],
      "env": {
        "GUMLOOP_ACCESS_TOKEN": "<YOUR_TOKEN>",
        "GUMLOOP_API_URL": "https://api.gumloop.com/v1"
      }
    }
  }
}`,
    tools: [
      {
        id: "gum_search",
        name: "search_contacts",
        description: "Search for contacts in the Gumloop database",
        inputs: [
          {
            name: "query",
            type: "string",
            required: true,
            description: "Search query string",
          },
          {
            name: "limit",
            type: "number",
            required: false,
            description: "Maximum number of results to return",
          },
        ],
      },
      {
        id: "gum_create",
        name: "create_contact",
        description: "Create a new contact in Gumloop",
        inputs: [
          {
            name: "contact_data",
            type: "object",
            required: true,
            description: "Contact information to store",
          },
        ],
      },
    ],
  },
  {
    id: "composio",
    name: "Composio",
    serverConfig: `{
  "mcpServers": {
    "composio_generic": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-composio-generic"
      ],
      "env": {
        "COMPOSIO_API_KEY": "<YOUR_COMPOSIO_API_KEY>"
      }
    }
  }
}`,
    tools: [],
  },
];
