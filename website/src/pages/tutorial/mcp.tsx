import { ColorModeProvider } from "@docusaurus/theme-common/internal";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import CodeBlock from "@theme/CodeBlock";
import type React from "react";
import { TutorialLayout } from "../../components/tutorial/TutorialLayout";

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
      <div className="space-y-24">
        {/* Video Introduction - Modern Design */}
        <div className="relative">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-purple-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative">
            <div className="max-w-4xl mx-auto">
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-purple-500/20 rounded-xl blur opacity-75 group-hover:opacity-100 transition duration-300" />
                <div className="relative w-full h-0 pb-[56.25%] rounded-xl overflow-hidden border border-solid border-white/10 bg-black/40 backdrop-blur-sm">
                  <iframe
                    src="https://www.youtube.com/embed/ebO8UVGcLbw"
                    title="VoltAgent MCP Tutorial"
                    className="absolute top-0 left-0 w-full h-full"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* The Problem */}
        <div className="relative mb-20">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 via-transparent to-orange-500/5 rounded-3xl blur-3xl -z-10" />

          <div className="relative border border-solid border-white/10 rounded-2xl p-8 landing-md:p-10 bg-white/[0.02] backdrop-blur-sm to-transparent backdrop-blur-sm">
            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 via-orange-500 to-transparent rounded-l-2xl" />

            <h2 className="text-[21.6px] font-medium text-foreground mb-3">
              The Problem: Your Agent Lives in a Bubble
            </h2>
            <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed mb-8">
              Your agent has memory and tools, but it's still isolated. It can't access your GitHub
              repos, your Slack channels, your databases, or any of the systems you actually use.
            </p>

            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-3">
              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-red-500/10 to-red-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <div className="relative border border-solid border-red-500/20 bg-red-500/[0.03] backdrop-blur-sm rounded-xl p-4 landing-md:p-6 hover:border-red-500/30 transition-colors">
                  <h3 className="text-[20px] font-medium text-red-300 mb-3 landing-md:mb-4">
                    Without MCP
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Build custom integrations for every service
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Manage API keys and authentication
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <XMarkIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-red-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Write boilerplate for each external tool
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-300" />
                <div className="relative border border-solid border-emerald-500/20 bg-emerald-500/[0.03] backdrop-blur-sm rounded-xl p-4 landing-md:p-6 hover:border-emerald-500/30 transition-colors">
                  <h3 className="text-[20px] font-medium text-emerald-300 mb-3 landing-md:mb-4">
                    With MCP
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Plug-and-play external system access
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Standardized integration protocol
                      </span>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-emerald-400 mt-1" />
                      <span className="text-sm landing-md:text-base text-muted-foreground">
                        Ready-made servers for popular services
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* What is MCP */}
        <div className="space-y-6">
          <h2 className="text-[21.6px] font-medium text-foreground">What is MCP?</h2>
          <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed">
            <strong>Model Context Protocol (MCP)</strong> is an open standard that enables AI models
            to securely access external data and tools. Think of it as USB for AI agents - a
            universal connector for any external system.
          </p>

          <div className=" rounded-lg p-4 landing-md:p-6 border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm">
            <h3 className="text-[20px] font-medium text-foreground mb-3 landing-md:mb-4">
              How MCP Works
            </h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center  text-xs landing-md:text-sm font-bold">
                  1
                </div>
                <div>
                  <strong className="text-foreground text-sm landing-md:text-base">
                    MCP Server:
                  </strong>
                  <span className="text-muted-foreground ml-2 text-sm landing-md:text-base">
                    Provides secure access to external resources (GitHub, databases, APIs, etc.)
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center text-xs landing-md:text-sm font-bold">
                  2
                </div>
                <div>
                  <strong className="text-foreground text-sm landing-md:text-base">
                    MCP Client:
                  </strong>
                  <span className="text-muted-foreground ml-2 text-sm landing-md:text-base">
                    Your VoltAgent connects to MCP servers to access their resources
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-6 h-6 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center  text-xs landing-md:text-sm font-bold">
                  3
                </div>
                <div>
                  <strong className="text-foreground text-sm landing-md:text-base">
                    Secure Access:
                  </strong>
                  <span className="text-muted-foreground ml-2 text-sm landing-md:text-base">
                    All communication is authenticated and controlled by your permissions
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Real Example */}
        <div className="space-y-6">
          <h2 className="text-[21.6px] font-medium text-foreground">
            Add MCP to Your Weather Agent
          </h2>
          <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed">
            Let's upgrade your weather agent from the previous tutorial with file system access
            through MCP.
          </p>

          <ColorModeProvider>
            <CodeBlock language="typescript">
              {`import { VoltAgent, Agent, createTool, MCPConfiguration } from "@voltagent/core";
// Removed legacy provider in 1.x; use ai-sdk model directly
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import path from "node:path";

// Your existing weather tool
const getWeatherTool = createTool({
  name: "get_weather",
  description: "Get current weather for any city",
  parameters: z.object({
    location: z.string().describe("City and state, e.g. New York, NY"),
  }),
  execute: async ({ location }) => {
    console.log("Getting weather for " + location + "...");
    if (location.toLowerCase().includes("new york")) {
      return { temperature: "18°C", condition: "Partly cloudy" };
    }
    return { temperature: "24°C", condition: "Sunny" };
  },
});

// NEW: Add MCP for file system access
const mcpConfig = new MCPConfiguration({
  servers: {
    filesystem: {
      type: "stdio", // Connects via standard input/output
      command: "npx", // The command to execute
      args: [
        // Arguments for the command
        "-y",
        "@modelcontextprotocol/server-filesystem", // Example: A filesystem server package
        // Optional arguments for the server itself, like specifying allowed paths:
        path.join(process.env.HOME || "", "Desktop"),
      ],
      // Optional: Specify the working directory for the command
      cwd: process.env.HOME,
      // Optional: Request timeout in milliseconds (default: 30000)
      timeout: 10000,
    },
  },
});

(async () => {
  const tools = await mcpConfig.getTools();
  const agent = new Agent({
    name: "my-agent",
    instructions: \`You are a helpful assistant that can check weather and manage files. You can:
  - Get weather information for any city
  - Read and write files
  - Save weather reports to files
  - Manage data storage
  
  Always be helpful and provide clear information.\`,
    
    model: openai("gpt-4o-mini"),
    tools: [
      getWeatherTool,
      ...tools
    ],
  });

  new VoltAgent({
    agents: { agent },
  });
})();

// Now your agent can do both weather AND file operations!
// Try: "Check weather in London and save it to a file"
// Or: "What files are in the Desktop directory?"
// Or: "Read yesterday's weather report"`}
            </CodeBlock>
          </ColorModeProvider>
        </div>

        {/* MCP Demo GIF */}
        <div className="space-y-6">
          <h2 className="text-[21.6px] font-medium text-foreground">See MCP in Action</h2>
          <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed">
            Here's what happens when your agent uses MCP filesystem tools in VoltOps console:
          </p>

          <div className=" 0">
            <h3 className="text-[20px] font-medium text-foreground mb-3 landing-md:mb-4">
              MCP Filesystem Demo
            </h3>
            <p className="text-muted-foreground mb-3 landing-md:mb-4 text-xs landing-md:text-sm">
              Watch your agent read files, create directories, and manage your filesystem through
              MCP:
            </p>
            <div className="rounded-lg overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <img
                src="https://cdn.voltagent.dev/docs/mco-demo.gif"
                alt="MCP Filesystem Demo - Agent managing files through MCP in VoltOps"
                className="w-full h-auto"
              />
            </div>
            <p className="text-muted-foreground text-xs landing-md:text-sm mt-2 landing-md:mt-3 text-center">
              Real-time MCP filesystem operations: reading, writing, and managing files
            </p>
          </div>

          <div className="">
            <h4 className="text-foreground font-semibold mb-2 text-sm landing-md:text-base">
              What You're Seeing
            </h4>
            <p className="text-muted-foreground mb-3 text-xs landing-md:text-sm">
              In the demo above, the agent:
            </p>
            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-3 landing-md:gap-4">
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-muted-foreground text-xs landing-md:text-base">
                  Connects to MCP filesystem server
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-muted-foreground text-xs landing-md:text-base">
                  Reads and writes files
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-muted-foreground text-xs landing-md:text-base">
                  Lists directory contents
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-muted-foreground text-xs landing-md:text-base">
                  Provides real-time feedback
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* HTTP MCP Example */}
        <div className="space-y-6">
          <h2 className="text-[21.6px] font-medium text-foreground">
            HTTP MCP: Access AI Models & Remote Services
          </h2>
          <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed">
            MCP isn't just for local files - it works over HTTP for remote services too. Let's
            connect your agent to Hugging Face's massive collection of AI models.
          </p>

          {/* Setup Section */}
          <div className=" ">
            <h3 className="text-[20px] font-medium text-foreground mb-3 landing-md:mb-4">
              Setup: Get Your Hugging Face Token
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 landing-md:space-x-4">
                <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                  <span className=" font-bold text-xs landing-md:text-sm">1</span>
                </div>
                <div>
                  <p className="text-muted-foreground mb-2 text-xs landing-md:text-base">
                    Visit{" "}
                    <a
                      href="https://huggingface.co/settings/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:underline"
                    >
                      huggingface.co/settings/tokens
                    </a>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Create a free account if you don't have one
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 landing-md:space-x-4">
                <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                  <span className=" font-bold text-xs landing-md:text-sm">2</span>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs landing-md:text-base">
                    Click "New token" → Select "Read" access
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Copy the token that starts with "hf_..."
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3 landing-md:space-x-4">
                <div className="flex-shrink-0 w-7 h-7 landing-md:w-8 landing-md:h-8 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 rounded-full flex items-center justify-center">
                  <span className=" font-bold text-xs landing-md:text-sm">3</span>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1 text-xs landing-md:text-base">
                    Add to your .env file:
                  </p>
                  <code className="bg-gray-800 px-2 py-1 rounded text-emerald-400 text-xs landing-md:text-base">
                    HUGGING_FACE_TOKEN=hf_your_token_here
                  </code>
                </div>
              </div>
            </div>
          </div>

          <ColorModeProvider>
            <CodeBlock language="typescript">
              {`import { VoltAgent, Agent, createTool, MCPConfiguration } from "@voltagent/core";
// Removed legacy provider in 1.x; use ai-sdk model directly
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import path from "node:path";

// Your existing weather tool (keep it!)
const getWeatherTool = createTool({
  name: "get_weather",
  description: "Get current weather for any city",
  parameters: z.object({
    location: z.string().describe("City and state, e.g. New York, NY"),
  }),
  execute: async ({ location }) => {
    console.log("Getting weather for " + location + "...");
    if (location.toLowerCase().includes("new york")) {
      return { temperature: "18°C", condition: "Partly cloudy" };
    }
    return { temperature: "24°C", condition: "Sunny" };
  },
});

// UPGRADE: Now we have BOTH local filesystem AND remote AI models!
const mcpConfig = new MCPConfiguration({
  servers: {
    // Local filesystem access (from previous example)
    filesystem: {
      type: "stdio",
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        path.join(process.env.HOME || "", "Desktop"),
      ],
      cwd: process.env.HOME,
      // Optional: Request timeout in milliseconds (default: 30000)
      timeout: 10000,
    },
    // NEW: Remote Hugging Face AI models
    "hf-mcp-server": {
      url: "https://huggingface.co/mcp",
      requestInit: {
        headers: { 
          Authorization: \`Bearer \${process.env.HUGGING_FACE_TOKEN}\`
        },
      },
      type: "http",
      // Optional: Request timeout in milliseconds (default: 30000)
      timeout: 30000,
    },
  },
});

(async () => {
  try {
    const tools = await mcpConfig.getTools();
    
    const agent = new Agent({
      name: "my-agent",
      instructions: \`You are a powerful assistant with comprehensive capabilities:
        
        Weather Services:
        - Get current weather for any city
        
        File Management (Local MCP):
        - Read and write files
        - List directory contents
        - Manage file storage
        - Save weather reports to files
        
        AI & ML Services (Remote MCP via Hugging Face):
        - Generate images from text descriptions
        - Analyze and classify images
        - Process and understand text
        - Translate between languages
        - Answer questions about various topics
        
        You can combine ALL these capabilities in creative ways!
        Always explain what you're doing when using different tools.\`,
      
      model: openai("gpt-4o-mini"),
      tools: [
        getWeatherTool,  // Local weather tool
        ...tools         // BOTH filesystem + AI tools
      ],
    });

    new VoltAgent({
      agents: { agent },
    });
  } catch (error) {
    console.error("Failed to initialize VoltAgent:", error);
  }
})();

// Now your agent is a POWERHOUSE with weather + files + AI!
// Try these incredible combinations:
// "Check weather in Paris, generate an image of that weather, and save the report to a file"
// "Read my todo.txt file, translate it to Spanish, and generate an image for each task"
// "Create a weather report file for Tokyo with generated weather images"`}
            </CodeBlock>
          </ColorModeProvider>

          {/* Test Scenarios */}
          <div className=" ">
            <h4 className="text-foreground font-semibold mb-3 text-sm landing-md:text-base">
              Try These Amazing AI Combinations
            </h4>
            <p className="text-muted-foreground mb-4 text-xs landing-md:text-base">
              Your agent now has access to thousands of AI models. Test these scenarios in VoltOps:
            </p>
            <div className="space-y-3">
              <div className="border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm/30 rounded p-3">
                <div className="text-emerald-400 landing-md:text-base text-xs font-medium mb-1">
                  Weather + Image Generation:
                </div>
                <code className="text-muted-foreground text-xs landing-md:text-base">
                  What Makes This Incredible "Check weather in San Francisco and generate an image
                  matching those conditions"
                </code>
              </div>
              <div className="border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm/30 rounded p-3">
                <div className="text-emerald-400 landing-md:text-base text-xs font-medium mb-1">
                  Weather + Translation:
                </div>
                <code className="text-muted-foreground text-xs landing-md:text-base">
                  "What's the weather in Barcelona? Also translate this to Spanish: 'It's a
                  beautiful day!'"
                </code>
              </div>
              <div className="border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm/30 rounded p-3">
                <div className="text-emerald-400 landing-md:text-base text-xs font-medium mb-1">
                  Image Analysis + AI:
                </div>
                <code className="text-muted-foreground text-xs landing-md:text-base">
                  "Generate an image of a rainy day, then analyze what you see in that image"
                </code>
              </div>
              <div className="border-solid border-white/10 bg-white/[0.02] backdrop-blur-sm/30 rounded p-3">
                <div className="text-emerald-400 landing-md:text-base text-xs font-medium mb-1">
                  Text Processing + Weather:
                </div>
                <code className="text-muted-foreground text-xs landing-md:text-base">
                  "Summarize this text and check the weather: 'I'm planning a trip to London next
                  week...'"
                </code>
              </div>
            </div>
          </div>

          {/* Hugging Face MCP Demo GIF */}
          <div className="">
            <h3 className="text-[20px] font-medium text-foreground mb-3 landing-md:mb-4">
              HTTP MCP in Action: AI Models Demo
            </h3>
            <p className="text-muted-foreground mb-3 landing-md:mb-4 text-xs landing-md:text-sm">
              Watch your agent use both local filesystem and remote AI models through HTTP MCP:
            </p>
            <div className="rounded-lg overflow-hidden border border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <img
                src="https://cdn.voltagent.dev/docs/tutorial/mcp-hugging-face-demo.gif"
                alt="HTTP MCP Hugging Face Demo - Agent using AI models and filesystem together"
                className="w-full h-auto"
              />
            </div>
            <p className="text-muted-foreground text-xs landing-md:text-base mt-2 landing-md:mt-3 text-center">
              Powerful combination: Local file operations + Remote AI model access via HTTP MCP
            </p>
          </div>

          <div className=" ">
            <h4 className="text-foreground font-semibold mb-2 text-sm landing-md:text-base">
              What Makes This Incredible
            </h4>
            <p className="text-muted-foreground mb-3 text-xs landing-md:text-base">
              In the demo above, you're seeing:
            </p>
            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-3 landing-md:gap-4">
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-muted-foreground text-xs landing-md:text-base">
                  Local weather data retrieval
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-muted-foreground text-xs landing-md:text-base">
                  Remote AI image generation
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-muted-foreground text-xs landing-md:text-base">
                  File system write operations
                </span>
              </div>
              <div className="flex items-start space-x-2 landing-md:space-x-3">
                <div className="w-2 h-2 bg-emerald-400 rounded-full mt-1.5 landing-md:mt-2" />
                <span className="text-muted-foreground text-xs landing-md:text-base">
                  Seamless tool coordination
                </span>
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-4 landing-md:gap-6">
            <div className=" rounded-lg p-4 border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <h4 className="text-foreground font-semibold mb-3">AI Capabilities You Get</h4>
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">• Image generation from text</div>
                <div className="text-muted-foreground">• Image analysis & classification</div>
                <div className="text-muted-foreground">• Language translation</div>
                <div className="text-muted-foreground">• Text summarization</div>
                <div className="text-muted-foreground">• Question answering</div>
                <div className="text-muted-foreground">• Sentiment analysis</div>
              </div>
            </div>

            <div className=" rounded-lg p-4 border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm">
              <h4 className="text-foreground font-semibold mb-3">Why This is Powerful</h4>
              <div className="space-y-2 text-sm">
                <div className="text-muted-foreground">• Zero AI model hosting costs</div>
                <div className="text-muted-foreground">• Access to latest models instantly</div>
                <div className="text-muted-foreground">• Combine multiple AI capabilities</div>
                <div className="text-muted-foreground">• Scale without infrastructure</div>
                <div className="text-muted-foreground">• Mix local tools + remote AI</div>
                <div className="text-muted-foreground">• Production-ready immediately</div>
              </div>
            </div>
          </div>
        </div>

        {/* Directory Link */}
        <div className="border-solid border border-white/10 bg-white/[0.02] backdrop-blur-sm rounded-lg p-4 landing-md:p-6">
          <h4 className="text-foreground font-semibold mb-3 text-sm landing-md:text-base">
            Explore the Complete MCP Directory
          </h4>
          <p className="text-muted-foreground mb-4 text-xs landing-md:text-sm">
            This is just a sample! VoltAgent maintains a growing directory of MCP servers with
            detailed setup instructions, code examples, and tool capabilities for each service.
          </p>
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-muted-foreground text-xs landing-md:text-sm">
                <strong>10+ Ready-to-use servers</strong> with copy-paste configurations
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-muted-foreground text-xs landing-md:text-sm">
                <strong>Detailed tool listings</strong> showing exactly what each server can do
              </span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              <span className="text-muted-foreground text-xs landing-md:text-sm">
                <strong>Live examples</strong> and implementation guides
              </span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-700">
            <a
              href="https://voltagent.dev/mcp/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center px-4 py-2 bg-emerald-400/10 text-emerald-400 border-solid border border-emerald-400/20 font-semibold rounded-lg hover:bg-emerald-600 transition-all duration-300 no-underline text-xs landing-md:text-sm"
            >
              Browse Full MCP Directory →
            </a>
          </div>
        </div>

        {/* Next Steps */}
        <div className="space-y-6">
          <h2 className="text-[21.6px] font-medium text-foreground">What's Next?</h2>
          <p className="text-sm landing-md:text-base text-muted-foreground leading-relaxed">
            You now have an agent that can access external systems through MCP. In the final
            tutorial, we'll learn about subagents - creating teams of specialized agents that work
            together.
          </p>
        </div>
      </div>
    </TutorialLayout>
  );
}
