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
