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
    voltagent: `const mcpConfig = new MCPConfiguration({
  servers: {
    // Example 1: HTTP-based server (e.g., external web service or API gateway)
    server: {
      type: "http",
      url: "https://actions.zapier.com/mcp/YOUR_MCP_KEY/sse",
    },
  },
});

// Fetch all tools from all configured MCP servers into a flat array
const allTools = await mcpConfig.getTools();

const agent = new Agent({
  name: "MCP Agent",
  instructions: "An assistant that can use MCP tools configured at startup",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: allTools, // Add MCP tools during initialization
});

// Remember to disconnect later
// await mcpConfig.disconnect();`,
    cursor: [
      {
        type: "heading",
        title: "Authenticating Zapier MCP with Cursor",
        value: "",
      },
      {
        type: "text",
        value:
          "Make sure your Zapier MCP is running before you start. Then set up Cursor to connect to your Zapier MCP.",
      },
      {
        type: "text",
        title: "Add MCP Server in Cursor",
        value:
          "Open Cursor Settings > MCP > Add a new global MCP Server. Put in your Zapier MCP website address.",
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
        title: "Use in Agent Mode",
        value:
          "After connecting, you can use your Zapier tools in Cursor's Agent mode.",
      },
    ],
    claude: [
      {
        type: "heading",
        title: "Using Zapier MCP with Claude",
        value: "",
      },
      {
        type: "heading",
        title: "Configure Your Actions & Copy URL",
        value: "",
      },
      {
        type: "text",
        value:
          "Pick which actions you want Claude Desktop to use. Add this MCP link in Claude Integrations:",
      },
      {
        type: "code",
        language: "text",
        value: "https://actions.zapier.com/mcp/sse",
      },
      {
        type: "heading",
        title: "Connect to Claude",
        value: "",
      },
      {
        type: "text",
        value:
          "Set up Claude to use Zapier MCP. Go to Settings > Integrations > Add more and paste the link above.",
      },
    ],
    serverGenerationInfo: {
      urlTemplate: "https://actions.zapier.com/mcp/{mcpname}",
      mcpNameValue: "sse",
      promptTextBeforeLink: "For Zapier:",
      linkText: "Open Zapier MCP Actions",
      promptTextAfterLink: "and set up your actions for Claude to use.",
    },
  },

  composio: {
    // Provide a specific Voltagent config for Composio that matches the screenshot
    voltagent: `const mcpConfig = new MCPConfiguration({
  servers: {
    // Example 1: HTTP-based server (e.g., external web service or API gateway)
    server: {
      type: "http",
      url: "https://mcp.composio.dev/{mcpName}/your-api-key-here", // URL of the MCP endpoint
    },
  },
});

// Fetch all tools from all configured MCP servers into a flat array
const allTools = await mcpConfig.getTools();

const agent = new Agent({
  name: "MCP Agent",
  instructions: "An assistant that can use MCP tools configured at startup",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  tools: allTools, // Add MCP tools during initialization
});

// Remember to disconnect later
// await mcpConfig.disconnect();`,
    cursor: [
      {
        type: "heading",
        title: "Authenticating Composio MCP with Cursor",
        value: "",
      },
      {
        type: "text",
        title: "Generate Configuration",
        value:
          "Go to https://mcp.composio.dev/{mcpName} to create your own Composio MCP setup.",
      },
      {
        type: "text",
        title: " Install MCP Tools",
        value:
          "Copy the `npx` command from mcp.composio.dev and run it in your terminal.",
      },
      {
        type: "text",
        title: "Verify Installation",
        value:
          "Open Cursor settings and go to **MCP** to check that the MCP servers are installed.",
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
        title: "Setup Steps",
        value:
          "Go to https://mcp.composio.dev/{mcpName} to create your own Composio MCP setup.",
      },
      {
        type: "text",
        value: "Install it using the command they give you.",
      },
      {
        type: "text",
        value:
          "Restart Claude Desktop and look for the tools icon to make sure it worked.",
      },
    ],
    serverGenerationInfo: {
      urlTemplate: "https://mcp.composio.dev/{mcpname}",
      mcpNameValue: "{mcpName}", // This will be replaced dynamically with mcp.name.toLowerCase()
      promptTextBeforeLink: "For Composio:",
      linkText: "Generate your Composio MCP URL",
      promptTextAfterLink: "and then follow the setup steps shown below.",
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
