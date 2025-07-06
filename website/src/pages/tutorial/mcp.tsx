import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";
import CodeBlock from "@theme/CodeBlock";
import { ColorModeProvider } from "@docusaurus/theme-common/internal";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";

export default function MCPTutorial() {
  return (
    <TutorialLayout
      currentStep={4}
      totalSteps={5}
      stepTitle="MCP: Connect to External Systems"
      stepDescription="Use Model Context Protocol to give your agent access to any external system"
      prevStepUrl="/tutorial/memory"
      nextStepUrl="/tutorial/subagents"
    >
      <div className="space-y-8">
        {/* The Problem */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            The Problem: Your Agent Lives in a Bubble
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Your agent has memory and tools, but it's still isolated. It can't
            access your GitHub repos, your Slack channels, your databases, or
            any of the systems you actually use.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border-solid border-red-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-red-300 mb-4">
                Without MCP
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-5 h-5 text-red-500 mt-1" />
                  <span className="text-gray-300">
                    Build custom integrations for every service
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-5 h-5 text-red-500 mt-1" />
                  <span className="text-gray-300">
                    Manage API keys and authentication
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <XMarkIcon className="w-5 h-5 text-red-500 mt-1" />
                  <span className="text-gray-300">
                    Write boilerplate for each external tool
                  </span>
                </div>
              </div>
            </div>

            <div className="border-solid border-emerald-500 rounded-lg p-6 bg-gray-800/50">
              <h3 className="text-xl font-semibold text-emerald-300 mb-4">
                With MCP
              </h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-emerald-500 mt-1" />
                  <span className="text-gray-300">
                    Plug-and-play external system access
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-emerald-500 mt-1" />
                  <span className="text-gray-300">
                    Standardized integration protocol
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckIcon className="w-5 h-5 text-emerald-500 mt-1" />
                  <span className="text-gray-300">
                    Ready-made servers for popular services
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What is MCP */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">What is MCP?</h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            <strong>Model Context Protocol (MCP)</strong> is an open standard
            that enables AI models to securely access external data and tools.
            Think of it as USB for AI agents - a universal connector for any
            external system.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              How MCP Works
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  1
                </div>
                <div>
                  <strong className="text-white">MCP Server:</strong>
                  <span className="text-gray-300 ml-2">
                    Provides secure access to external resources (GitHub,
                    databases, APIs, etc.)
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  2
                </div>
                <div>
                  <strong className="text-white">MCP Client:</strong>
                  <span className="text-gray-300 ml-2">
                    Your VoltAgent connects to MCP servers to access their
                    resources
                  </span>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  3
                </div>
                <div>
                  <strong className="text-white">Secure Access:</strong>
                  <span className="text-gray-300 ml-2">
                    All communication is authenticated and controlled by your
                    permissions
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Example */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Real Example: GitHub Integration
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Let's connect your agent to GitHub so it can read your repos, create
            issues, and manage pull requests.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="src/index.ts">
              {`import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { MCPClient } from "@voltagent/mcp";

// Connect to GitHub MCP server
const githubMCP = new MCPClient({
  name: "github",
  serverPath: "npx @modelcontextprotocol/server-github",
  environment: {
    GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
  },
});

const agent = new Agent({
  name: "github-agent",
  instructions: \`You are a GitHub assistant. You can:
  - Read repository information
  - Search through code
  - Create and manage issues
  - Review pull requests
  - Get commit history
  
  Always be helpful and provide clear information about GitHub repositories.\`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  mcpServers: [githubMCP],
});

new VoltAgent({
  agents: { "github-agent": agent },
});

// Now your agent can access GitHub!
// Try asking: "What are the open issues in my voltagent repo?"
// Or: "Create an issue titled 'Add user authentication'"
// Or: "Show me the latest commits in the main branch"`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* Available MCP Servers */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">Popular MCP Servers</h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            The MCP ecosystem has ready-made servers for popular services. Here
            are some you can use today:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                Development Tools
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>GitHub:</strong> Repositories, issues, PRs
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>GitLab:</strong> Project management
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>Docker:</strong> Container management
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>AWS:</strong> Cloud resources
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                Productivity
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>Slack:</strong> Team communication
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>Google Drive:</strong> File management
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>Calendar:</strong> Scheduling
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>Notion:</strong> Knowledge management
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                Data & Analytics
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>PostgreSQL:</strong> Database queries
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>SQLite:</strong> Local databases
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>Filesystem:</strong> File operations
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>Web Search:</strong> Internet data
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">
                Business Tools
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>Salesforce:</strong> CRM data
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>HubSpot:</strong> Marketing automation
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>Stripe:</strong> Payment processing
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-[#00d992] rounded-full" />
                  <span className="text-gray-300">
                    <strong>Zendesk:</strong> Customer support
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-MCP Example */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Advanced Example: DevOps Assistant
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Let's build a DevOps assistant that can access GitHub, AWS, and
            Slack to help manage your infrastructure.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="devops-agent.ts">
              {`import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { MCPClient } from "@voltagent/mcp";

// Connect to multiple MCP servers
const githubMCP = new MCPClient({
  name: "github",
  serverPath: "npx @modelcontextprotocol/server-github",
  environment: {
    GITHUB_PERSONAL_ACCESS_TOKEN: process.env.GITHUB_TOKEN,
  },
});

const awsMCP = new MCPClient({
  name: "aws",
  serverPath: "npx @modelcontextprotocol/server-aws",
  environment: {
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    AWS_REGION: process.env.AWS_REGION,
  },
});

const slackMCP = new MCPClient({
  name: "slack",
  serverPath: "npx @modelcontextprotocol/server-slack",
  environment: {
    SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  },
});

const devopsAgent = new Agent({
  name: "devops-assistant",
  instructions: \`You are a DevOps assistant with access to:
  
  🐙 GitHub: Repository management, CI/CD, issues, PRs
  ☁️ AWS: EC2 instances, S3 buckets, Lambda functions, CloudWatch
  💬 Slack: Team notifications and updates
  
  You can help with:
  - Monitoring system health across GitHub and AWS
  - Deploying applications and managing releases
  - Investigating issues and incidents
  - Keeping the team updated via Slack
  - Managing infrastructure and resources
  
  Always be proactive about security and best practices.\`,
  
  llm: new VercelAIProvider(),
  model: openai("gpt-4o"),
  mcpServers: [githubMCP, awsMCP, slackMCP],
});

new VoltAgent({
  agents: { "devops-assistant": devopsAgent },
});

// Example interactions:
// "Check the status of our production servers and notify the team if there are any issues"
// "Deploy the latest commit from main branch to staging"
// "Create a GitHub issue for the high CPU usage we're seeing on the web servers"
// "Show me the CloudWatch metrics for our Lambda functions in the last hour"`}
            </CodeBlock>
          </ColorModeProvider>

          <div className="bg-[#00d992]/10 border-solid border border-[#00d992]/20 rounded-lg p-6">
            <h4 className="text-[#00d992] font-semibold mb-2">
              Real-World Workflow
            </h4>
            <p className="text-gray-300 mb-3">
              With this setup, you can ask your agent:{" "}
              <em>"Our website is slow, can you investigate?"</em>
            </p>
            <div className="text-sm text-gray-400">
              The agent will automatically:
              <br />• Check AWS CloudWatch for performance metrics
              <br />• Look at recent GitHub commits for potential issues
              <br />• Update your team in Slack with findings
              <br />• Create GitHub issues for any problems found
            </div>
          </div>
        </div>

        {/* Custom MCP Server */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Building Your Own MCP Server
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            Need to connect to a system that doesn't have an MCP server yet? You
            can build your own in just a few minutes.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript" title="custom-mcp-server.ts">
              {`#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Your custom API client
class CustomAPIClient {
  constructor(private apiKey: string) {}
  
  async getUsers() {
    // Your API logic here
    return [{ id: 1, name: "John Doe", email: "john@example.com" }];
  }
  
  async createTicket(title: string, description: string) {
    // Your API logic here
    return { id: "TICK-123", title, status: "open" };
  }
}

// Create MCP server
const server = new Server(
  {
    name: "custom-api-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

const apiClient = new CustomAPIClient(process.env.CUSTOM_API_KEY!);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_users",
        description: "Get list of users from the system",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "create_ticket",
        description: "Create a support ticket",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Ticket title" },
            description: { type: "string", description: "Ticket description" },
          },
          required: ["title", "description"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_users":
        const users = await apiClient.getUsers();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(users, null, 2),
            },
          ],
        };

      case "create_ticket":
        const ticket = await apiClient.createTicket(args.title, args.description);
        return {
          content: [
            {
              type: "text",
              text: \`Created ticket: \${ticket.id}\`,
            },
          ],
        };

      default:
        throw new Error(\`Unknown tool: \${name}\`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: \`Error: \${error.message}\`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('✅ Connected to custom MCP server');
}

main().catch((error) => {
  console.error('❌ Custom MCP error:', error.message);
  process.exit(1);
});`}
            </CodeBlock>
          </ColorModeProvider>

          <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
            <h3 className="text-xl font-semibold text-white mb-4">
              Using Your Custom Server
            </h3>
            <ColorModeProvider>
              <CodeBlock language="typescript" title="Using custom MCP server">
                {`const customMCP = new MCPClient({
  name: "custom-api",
  serverPath: "node custom-mcp-server.ts",
  environment: {
    CUSTOM_API_KEY: process.env.CUSTOM_API_KEY,
  },
});

const agent = new Agent({
  name: "custom-agent",
  instructions: "You can access our custom API to manage users and tickets.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  mcpServers: [customMCP],
});`}
              </CodeBlock>
            </ColorModeProvider>
          </div>
        </div>

        {/* Security & Best Practices */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">
            Security & Best Practices
          </h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            MCP gives your agent powerful access to external systems. Here's how
            to do it safely.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
            <div className="bg-yellow-500/10 border-solid border border-yellow-500/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-yellow-300 mb-4">
                Security Guidelines
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2" />
                  <span className="text-gray-300">
                    <strong>Principle of Least Privilege:</strong> Only give
                    access to what your agent actually needs
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2" />
                  <span className="text-gray-300">
                    <strong>Environment Variables:</strong> Never hardcode API
                    keys or secrets in your code
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2" />
                  <span className="text-gray-300">
                    <strong>Audit Logs:</strong> Monitor what your agent is
                    doing with external systems
                  </span>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full mt-2" />
                  <span className="text-gray-300">
                    <strong>Rate Limiting:</strong> Implement safeguards to
                    prevent API abuse
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white">What's Next?</h2>
          <p className="text-sm md:text-base text-gray-300 leading-relaxed">
            You now have an agent that can access external systems through MCP.
            In the final tutorial, we'll learn about subagents - creating teams
            of specialized agents that work together.
          </p>

          <div className="bg-[#00d992]/10 border-solid border border-[#00d992]/20 rounded-lg p-6">
            <h4 className="text-[#00d992] font-semibold mb-2">
              Ready to Go Enterprise?
            </h4>
            <p className="text-gray-300 mb-3">
              Set up the GitHub MCP example above and ask your agent:
            </p>
            <ul className="text-gray-300 space-y-1 text-sm">
              <li>• "What repositories do I have?"</li>
              <li>• "Show me the latest issues in my main project"</li>
              <li>• "Create an issue to add better error handling"</li>
              <li>• "What were the last 5 commits to the main branch?"</li>
            </ul>
          </div>
        </div>
      </div>
    </TutorialLayout>
  );
}
