import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";
import CodeBlock from "@theme/CodeBlock";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";

export default function TutorialMCP() {
  return (
    <TutorialLayout
      currentStep={4}
      totalSteps={5}
      stepTitle="MCP: Model Context Protocol"
      stepDescription="Connect your agents to external tools and services using the Model Context Protocol"
      nextStepUrl="/tutorial/subagents"
      prevStepUrl="/tutorial/memory"
    >
      <div className="space-y-8">
        {/* What is MCP? */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">What is MCP?</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            The <strong>Model Context Protocol</strong> is a standardized way
            for AI agents to connect to external tools and services. Think of it
            as a universal adapter that lets your agents use any tool that
            speaks MCP.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              Real-World Analogy
            </h3>
            <p className="text-gray-300">
              MCP is like having a universal translator for your agents. Instead
              of writing custom code for each service, you connect to
              MCP-compatible tools and your agent can instantly use them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-red-300 mb-4">
                Without MCP
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    Write custom code for each service
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    Maintain multiple API integrations
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-red-400 mt-1">❌</span>
                  <span className="text-gray-300">
                    Handle authentication separately
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-green-300 mb-4">
                With MCP
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">
                    One configuration for multiple tools
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">Standardized protocol</span>
                </div>
                <div className="flex items-start space-x-3">
                  <span className="text-green-400 mt-1">✅</span>
                  <span className="text-gray-300">
                    Automatic tool discovery
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Example: GitHub Integration */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Real Example: GitHub Integration
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Let's connect your agent to GitHub so it can read repositories,
            check issues, and create pull requests.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="src/index.ts">
              {`import { VoltAgent, Agent, MCPConfiguration } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create MCP Configuration
const mcpConfig = new MCPConfiguration({
  servers: {
    // GitHub MCP server
    github: {
      type: "streamable-http",
      url: "https://api.githubcopilot.com/mcp",
    },
    
    // Filesystem access (for reading local files)
    filesystem: {
      type: "stdio",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        process.env.HOME + "/Projects", // Allow access to Projects folder
      ],
    },
  },
});

// Get all available tools
const mcpTools = await mcpConfig.getTools();

// Create agent with MCP tools
const developerAgent = new Agent({
  name: "DeveloperAgent",
  description: "A developer assistant that can interact with GitHub and filesystem",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  instructions: \`You are a developer assistant. You can:
  - Read and analyze code from GitHub repositories
  - Check issues and pull requests
  - Read local files in the Projects folder
  - Help with code reviews and analysis
  
  Always explain what you're doing when using tools.\`,
  tools: mcpTools, // Add all MCP tools
});

// Start VoltAgent
new VoltAgent({
  agents: { developerAgent },
});

// Remember to disconnect when done
process.on('SIGINT', async () => {
  await mcpConfig.disconnect();
  process.exit(0);
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Different Transport Types */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Transport Types</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            MCP supports different ways to connect to services. Choose the right
            transport for your needs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-blue-300 mb-4">
                HTTP-based
              </h3>
              <div className="space-y-3">
                <div>
                  <code className="text-blue-400 bg-gray-800 px-2 py-1 rounded">
                    streamable-http
                  </code>
                  <p className="text-gray-300 text-sm mt-1">
                    Modern, efficient for web services
                  </p>
                </div>
                <div>
                  <code className="text-blue-400 bg-gray-800 px-2 py-1 rounded">
                    http
                  </code>
                  <p className="text-gray-300 text-sm mt-1">
                    Auto-fallback for compatibility
                  </p>
                </div>
                <div>
                  <code className="text-blue-400 bg-gray-800 px-2 py-1 rounded">
                    sse
                  </code>
                  <p className="text-gray-300 text-sm mt-1">
                    Server-Sent Events
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-purple-300 mb-4">
                Local Process
              </h3>
              <div className="space-y-3">
                <div>
                  <code className="text-purple-400 bg-gray-800 px-2 py-1 rounded">
                    stdio
                  </code>
                  <p className="text-gray-300 text-sm mt-1">
                    For local CLI tools and scripts
                  </p>
                </div>
                <div className="text-gray-300 text-sm">
                  Perfect for filesystem access, database tools, local AI models
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Configuration */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Advanced Configuration
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Real-world examples with authentication and multiple services.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="Advanced MCP Setup">
              {`import { MCPConfiguration } from "@voltagent/core";
import path from "node:path";

const mcpConfig = new MCPConfiguration({
  servers: {
    // Reddit API with authentication
    reddit: {
      type: "http",
      url: "https://mcp.composio.dev/reddit/your-api-key-here",
      requestInit: {
        headers: { 
          "Authorization": "Bearer your-token",
          "User-Agent": "VoltAgent/1.0"
        },
      },
    },

    // Linear project management
    linear: {
      type: "sse",
      url: "https://mcp.linear.app/sse",
    },

    // Local filesystem with specific permissions
    filesystem: {
      type: "stdio",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        path.join(process.env.HOME, "Documents"), // Only Documents folder
        path.join(process.env.HOME, "Downloads"), // And Downloads folder
      ],
      cwd: process.env.HOME,
      env: { NODE_ENV: "production" },
    },

    // Database MCP server (hypothetical)
    database: {
      type: "stdio",
      command: "node",
      args: ["./mcp-database-server.js"],
      env: {
        DATABASE_URL: process.env.DATABASE_URL,
        NODE_ENV: "production"
      },
    },
  },
});

// Get tools organized by server
const toolsets = await mcpConfig.getToolsets();

// Use specific toolsets
const redditTools = toolsets.reddit.getTools();
const filesystemTools = toolsets.filesystem.getTools();

// Or get all tools at once
const allTools = await mcpConfig.getTools();`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Practical Use Cases */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Practical Use Cases</h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Here are real scenarios where MCP shines.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                Content Creator Assistant
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">
                    Reddit API for trending topics
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">
                    Filesystem for saving drafts
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">Image generation API</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                DevOps Assistant
              </h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">
                    GitHub for code analysis
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">Database for monitoring</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full"></div>
                  <span className="text-gray-300">Slack for notifications</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Testing Your Setup */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Testing Your MCP Setup
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Let's test the GitHub integration we set up.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h4 className="text-white font-semibold mb-3">Test Conversation</h4>
            <div className="space-y-3">
              <div className="bg-blue-900/20 p-3 rounded border-l-4 border-blue-500">
                <strong className="text-blue-300">You:</strong>
                <p className="text-gray-300 mt-1">
                  "Can you analyze the voltagent/core repository on GitHub?"
                </p>
              </div>
              <div className="bg-green-900/20 p-3 rounded border-l-4 border-green-500">
                <strong className="text-green-300">Agent:</strong>
                <p className="text-gray-300 mt-1">
                  "I'll analyze the voltagent/core repository for you. Let me
                  fetch the repository information..."
                </p>
                <div className="text-gray-400 text-sm mt-2 font-mono">
                  🔧 Using tool: github_get_repository
                </div>
                <p className="text-gray-300 mt-2">
                  "I found the repository! It's a TypeScript project with...
                  [detailed analysis]"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Handling */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Error Handling & Cleanup
          </h2>
          <p className="text-xl text-gray-300 leading-relaxed">
            Always handle errors and clean up MCP connections properly.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="Proper Error Handling">
              {`import { MCPConfiguration } from "@voltagent/core";

const mcpConfig = new MCPConfiguration({
  servers: {
    github: {
      type: "streamable-http",
      url: "https://api.githubcopilot.com/mcp",
    },
  },
});

try {
  // Get tools (this establishes connections)
  const tools = await mcpConfig.getTools();
  
  // Use tools with your agent
  const agent = new Agent({
    // ... agent config
    tools: tools,
  });
  
  // Monitor connection events
  const clients = await mcpConfig.getClients();
  if (clients.github) {
    clients.github.on('connect', () => {
      console.log('✅ Connected to GitHub MCP server');
    });
    
    clients.github.on('error', (error) => {
      console.error('❌ GitHub MCP error:', error.message);
    });
  }
  
} catch (error) {
  console.error('Failed to setup MCP:', error);
} finally {
  // Always disconnect when done
  await mcpConfig.disconnect();
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await mcpConfig.disconnect();
  process.exit(0);
});`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Hands-on Exercise */}
        <div className="bg-[#00d992]/10 border border-[#00d992]/20 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="w-6 h-6 bg-[#00d992] rounded-lg mt-1"></div>
            <div>
              <h4 className="text-xl font-semibold text-[#00d992] mb-2">
                Try It Yourself
              </h4>
              <p className="text-gray-300 mb-3">
                Set up your first MCP integration:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-gray-300 ml-4">
                <li>Copy the GitHub integration code above</li>
                <li>
                  Run your agent and check the console for connection logs
                </li>
                <li>
                  Test in VoltOps console: "List files in my Projects folder"
                </li>
                <li>Try: "What's trending on r/programming today?"</li>
                <li>Experiment with different MCP servers</li>
              </ol>
              <div className="bg-yellow-900/20 p-3 rounded border border-yellow-500/30 mt-4">
                <strong className="text-yellow-300">Pro Tip:</strong>
                <p className="text-gray-300 mt-1">
                  Start with filesystem MCP - it's the easiest to test and
                  debug. Once that works, add external services.
                </p>
              </div>
              <p className="text-gray-300 mt-3">
                <strong className="text-white">Next step:</strong> We'll learn
                about Subagents for complex multi-agent workflows.
              </p>
            </div>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
