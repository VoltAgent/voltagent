export interface TabContentItem {
  type: "text" | "code";
  value: string;
}

export const cursorTabContent: TabContentItem[] = [
  { type: "text", value: "Authenticating guMCP with Cursor" },
  {
    type: "text",
    value:
      'Step 1: Setup MCP in Cursor\\nTo setup this new MCP server in Cursor go to Settings > Cursor Settings. From there go to MCP and click "Add a new global MCP Server".',
  },
  {
    type: "text",
    value:
      "This will open your mcp.json file. Add your configuration in the following format:",
  },
  {
    type: "code",
    value:
      '{\\n  "mcpServers": {\\n    "name-of-connection": {\\n      "url": "your-guMCP-url"\\n    }\\n  }\\n}',
  },
  {
    type: "text",
    value:
      "Step 2: Validate Connection\\nAfter having saved mcp.json, you should see a live connection in the MCP section of your Cursor settings.",
  },
  {
    type: "text",
    value:
      "Step 3: Use Agent Mode\\nYou can now interact with your tool from Cursor chat in Agent mode!",
  },
];

export const claudeTabContent: TabContentItem[] = [
  { type: "text", value: "Authenticating guMCP with Claude" },
  {
    type: "text",
    value:
      "Step 1: Authenticate with Local Server\\nFirst, you\\'ll need to authenticate with your local server. Here\\'s an example using the Perplexity server:",
  },
  { type: "code", value: "python src/servers/perplexity/main.py auth" },
  {
    type: "text",
    value:
      "Step 2: Setup MCP in Claude\\nConfigure your MCP server in Claude by adding the following configuration. Here\\'s an example using the Perplexity server:",
  },
  {
    type: "code",
    value:
      '{\\n  "mcpServers": {\\n    "[server-name]-gumcp": {\\n      "command": "/bin/bash",\\n      "args": [\\n        "-c",\\n        "cd /[where you installed guMCP]/guMCP && source ./venv/bin/activate && python src/servers/local.py --server=[server you\\\'re using]"\\n      ]\\n    }\\n  }\\n}',
  },
  {
    type: "text",
    value:
      "Step 3: Restart Claude\\nAfter saving your configuration, restart Claude to apply the changes.",
  },
];

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
  {
    id: "community",
    name: "Community",
    serverConfig: `{
  "mcpServers": {
    "custom_integration": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-custom"
      ],
      "env": {
        "CUSTOM_ACCESS_TOKEN": "<YOUR_TOKEN>",
        "CUSTOM_API_URL": "https://api.your-service.com/v1"
      }
    }
  }
}`,
    tools: [],
  },
];
