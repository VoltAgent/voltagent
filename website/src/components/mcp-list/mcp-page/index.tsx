import React, { useState } from "react";
import { BoltIcon } from "@heroicons/react/24/solid";
import {
  ArrowLeftIcon,
  StarIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  ServerStackIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Link from "@docusaurus/Link";
import { DotPattern } from "../../ui/dot-pattern";
import mcpDataJson from "../mcpData.json";
import { motion, AnimatePresence } from "framer-motion";
import { Claude37Logo } from "../../../../static/img/logos/claudie";
import { CursorLogo } from "../../../../static/img/logos/cursor";
import { ComposioLogo } from "../../../../static/img/logos/composio";

// Import the needed logo components
import { AhrefLogo } from "../../../../static/img/logos/integrations/ahref";
import { AirtableLogo } from "../../../../static/img/logos/integrations/airtable";
import { AnthropicLogo } from "../../../../static/img/logos/integrations/anthropic";
import { AsanaLogo } from "../../../../static/img/logos/integrations/asana";
import { ZapierLogo } from "../../../../static/img/logos/integrations/zapier";
import { GumloopLogo } from "../../../../static/img/logos/integrations/gumloop";
// Map logo components by key - only including the ones we need for now
const logoMap = {
  ahref: AhrefLogo,
  airtable: AirtableLogo,
  anthropic: AnthropicLogo,
  asana: AsanaLogo,
  zapier: ZapierLogo,
  gumloop: GumloopLogo,
  composio: ComposioLogo,
};

// Animation variants for code block
const codeBlockVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

// Code display component
const CodeBlock = ({ code }) => {
  return (
    <div className="relative max-w-4xl overflow-hidden transition-all duration-300">
      {/* Code content with line numbers */}
      <pre className="text-left bg-white/5 rounded-none overflow-x-auto p-0 text-[10px] sm:text-sm font-mono m-0">
        <div className="flex">
          <div className="py-3 px-3 text-right text-gray-500 leading-[1.4] select-none border-r border-gray-700 min-w-[30px] landing-xs:text-[9px] landing-md:text-xs">
            {Array.from({ length: code.split("\n").length || 1 }, (_, i) => (
              <div key={`line-${i + 1}`}>{i + 1}</div>
            ))}
          </div>
          <div className="py-3 px-3 block landing-xs:text-[9px] landing-md:text-xs w-full relative">
            <motion.div
              className="absolute inset-0 "
              layoutId="codeHighlight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <AnimatePresence mode="wait">
              <motion.code
                key="code-block"
                id="code-content"
                className="block relative z-10 text-gray-300"
                variants={codeBlockVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {code}
              </motion.code>
            </AnimatePresence>
          </div>
        </div>
      </pre>
    </div>
  );
};

// Tab component
const Tab = ({ active, onClick, children }) => {
  return (
    <div
      className={`relative px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium cursor-pointer transition-all duration-300  text-center ${
        active ? "text-[#00d992]" : "text-gray-500 hover:text-gray-300"
      }`}
      onClick={onClick}
      role="tab"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onClick();
        }
      }}
      aria-selected={active}
    >
      {children}
      <div
        className={`absolute bottom-0 left-0 right-0 h-0.5 ${
          active ? "bg-[#00d992]" : "bg-transparent"
        }`}
      />
    </div>
  );
};

export const MCPDetailPage = () => {
  // Use the first item from mcpData.json
  const firstMcp = mcpDataJson[0];
  const mcp = {
    ...firstMcp,
    logo: logoMap[firstMcp.logoKey],
  };

  // Track active tab
  const [activeTab, setActiveTab] = useState("zapier"); // Default to first tab

  // Track which tools are expanded
  const [expandedTools, setExpandedTools] = useState(() => {
    // Initialize with first two tool items expanded if they exist
    const initialState = {};
    if (mcp.tools && mcp.tools.length > 0) {
      initialState[mcp.tools[0].id] = true;
      if (mcp.tools.length > 1) {
        initialState[mcp.tools[1].id] = true;
      }
    }
    return initialState;
  });

  // Toggle tool expansion
  const toggleTool = (toolId) => {
    setExpandedTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  // Tab options for filtering
  const tabOptions = [
    {
      id: "zapier",
      name: "Zapier",
      component: <ZapierLogo className="h-6 w-auto text-white" />,
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
              description:
                "Filter by Zap status: 'active', 'disabled', or 'all'",
            },
          ],
        },
      ],
    },
    {
      id: "gumloop",
      name: "Gumloop",
      component: <GumloopLogo className="h-7 w-auto text-white" />,
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
      component: <ComposioLogo className="h-6 w-auto" />,
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

  // Get current tab data
  const currentTab =
    tabOptions.find((tab) => tab.id === activeTab) || tabOptions[0];

  // Get config code based on active tab
  const configCode = currentTab.serverConfig;

  // State for the server config nested tabs
  const [activeServerConfigTab, setActiveServerConfigTab] =
    useState("voltagent");

  // Define code snippets for the new server config tabs
  // These will be dynamic based on the main currentTab
  const cursorCodeSnippet = `
# In your Cursor AI Agent (Python environment with Voltagent SDK)

# 1. Initialize Voltagent or get context for the MCP server
#    (Assuming the '${currentTab.id}' MCP server is configured and running)
mcp_server_id = "${currentTab.id}" # e.g., "zapier", "gumloop", or "ahrefs_generic"

# 2. Define the tool you want to use from this MCP server
#    (Let's assume the server has a tool named 'example_tool'
#     and it takes 'param1' and 'param2')
#    Refer to the '${currentTab.name} MCP' documentation for available tools.
tool_to_call = f"{mcp_server_id}.example_tool"

# 3. Prepare your input data
input_payload = {
    "param1": "value_from_cursor_context",
    "param2": 123
}

# 4. Call the tool via Voltagent's MCP interface
try:
    # result = voltagent.mcp.call(tool_name=tool_to_call, data=input_payload) # Conceptual SDK call
    print(f"Calling tool '{tool_to_call}' on MCP server '{mcp_server_id}'...")
    print(f"With payload: {input_payload}")
    print("\nSimulated Response from MCP:")
    print({"status": "success", "data": "Tool executed successfully with provided params on ${currentTab.id} server."})
except Exception as e:
    print(f"Error calling MCP tool: {e}")
  `;

  const claudeCodeSnippet = `
# Interacting with Claude (e.g., through an API or UI with tool use capabilities)
# Claude is instructed to use a tool via an MCP server related to '${currentTab.name}'.

# User Prompt to Claude:
# "Claude, please use the '${currentTab.id}' MCP server to execute 'example_tool'
#  with param1 set to 'claude_request_data' and param2 set to 789."

# Claude's Internal Thought Process / Tool Invocation (Conceptual):
# Tool Invocation Request for Voltagent MCP:
#   Target MCP Server ID: "${currentTab.id}"
#   Tool Name: "example_tool" # (Refer to '${currentTab.name} MCP' docs for actual tool names)
#   Parameters:
#     param1: "claude_request_data"
#     param2: 789

# Expected Interaction with Voltagent/MCP layer:
# Voltagent would route this to the '${currentTab.id}' MCP server,
# call 'example_tool' with the provided parameters.

# Simulated Response from MCP to Claude (then relayed to user):
# {
#   "status": "success",
#   "output": {
#     "message": "Claude's request to 'example_tool' on '${currentTab.id}' processed successfully.",
#     "details": "Result of example_tool execution would appear here."
#   }
# }

# Claude's Response to User (example):
# "Okay, I've used the '${currentTab.id}' MCP server to execute 'example_tool'
#  with your parameters. The server responded indicating success."
  `;

  const serverConfigTabsData = [
    {
      id: "voltagent",
      name: "Voltagent",
      code: configCode, // This is the main server config for the selected MCP
      iconComponent: null,
    },
    {
      id: "cursor",
      name: "Cursor",
      code: cursorCodeSnippet,
      iconComponent: <CursorLogo className="h-4 w-4 mr-2 text-white" />,
    },
    {
      id: "claude",
      name: "Claude",
      code: claudeCodeSnippet,
      iconComponent: <Claude37Logo className="h-4 w-4 mr-2" />,
    },
  ];

  const activeCodeBlockContent =
    serverConfigTabsData.find((tab) => tab.id === activeServerConfigTab)
      ?.code || "Select a tab to view the configuration or usage example.";

  // Recommended servers data
  const recommendedServers = [
    {
      id: "aws",
      name: "AWS Kb Retrieval Server",
      description: "An MCP server implementation for retrieving",
      icon: {
        type: "text",
        value: "AWS",
        bgColor: "bg-yellow-100",
        textColor: "text-yellow-800",
      },
    },
    {
      id: "cursor",
      name: "Cursor",
      description: "The AI Code Editor",
      icon: {
        type: "component",
        component: BoltIcon,
        bgColor: "bg-gray-700",
        textColor: "text-white",
      },
    },
    {
      id: "minimax",
      name: "MiniMax MCP",
      description: "Official MiniMax Model Context Protocol (MCP)",
      icon: {
        type: "text",
        value: "MM",
        bgColor: "bg-pink-600",
        textColor: "text-white",
      },
    },
    {
      id: "playwright",
      name: "Playwright MCP",
      description: "Playwright MCP server",
      icon: {
        type: "text",
        value: "PW",
        bgColor: "bg-gradient-to-br from-blue-500 via-green-500 to-red-500",
        textColor: "text-white",
      },
    },
  ];

  const MCP_Logo = mcp.logo;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 flex flex-col">
      <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

      {/* Back to MCPs button */}
      <Link
        to="/mcp"
        className="flex items-center text-gray-400 hover:text-[#00d992] mb-6 group"
      >
        <ArrowLeftIcon className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to MCPs
      </Link>

      {/* Main title and description */}
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          How to Use {currentTab.name} in Your Voltagent Project?
        </h1>
        <div className="text-gray-400 flex items-center">
          <span className="font-mono">{currentTab.id}</span>
          <span className="mx-2">-</span>
          <span>Model Context Provider</span>
        </div>
      </div>

      {/* Tab Navigation - Full width on mobile */}
      <div className="mb-8 w-full">
        <div className="flex border-b border-gray-800 w-full" role="tablist">
          {tabOptions.map((tab) => (
            <Tab
              key={tab.id}
              active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.component || tab.name}
            </Tab>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content area - Left side */}
        <div className="lg:col-span-2">
          {/* Server Config section (moved from sidebar) */}
          <div className="rounded-lg  backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
            <div className="flex items-center px-6  py-4   border-l-0 border-r-0 border-t-0 rounded-tl-md rounded-tr-md bg-[#222735]  border-white/10  border-solid">
              <div className="bg-[#00d992]/10 w-8 h-8  landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0 mr-4">
                <ServerIcon className="w-5 h-5 text-[#00d992]" />
              </div>
              <div>
                <span className="text-md font-semibold text-white mb-1">
                  Server Config & Usage Examples
                </span>
                <div className="text-gray-400 text-sm">
                  Configure your {currentTab.name} MCP server and see how to
                  call it.
                </div>
              </div>
            </div>
            {/* New Nested Tab Navigation for Server Config */}
            <div
              className="flex border-b border-gray-700 bg-[#222735]/50"
              role="tablist"
            >
              {serverConfigTabsData.map((tab) => (
                <div
                  key={tab.id}
                  className={`flex items-center relative px-3 py-2 text-sm font-medium cursor-pointer transition-all duration-300 text-center ${
                    activeServerConfigTab === tab.id
                      ? "text-[#00d992]"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                  onClick={() => setActiveServerConfigTab(tab.id)}
                  role="tab"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setActiveServerConfigTab(tab.id);
                    }
                  }}
                  aria-selected={activeServerConfigTab === tab.id}
                >
                  {tab.iconComponent}
                  {tab.name}
                  <div
                    className={`absolute bottom-0 left-0 right-0 h-0.5 ${
                      activeServerConfigTab === tab.id
                        ? "bg-[#00d992]"
                        : "bg-transparent"
                    }`}
                  />
                </div>
              ))}
            </div>
            <CodeBlock code={activeCodeBlockContent} />
          </div>

          {/* What is section - Hardcoded Ahrefs content */}
          <div className="p-6 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
            <span className="text-lg font-bold text-white mb-6">
              Ahrefs MCP: Supercharge Your AI Agents with SEO Intelligence
            </span>

            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center">
                <AhrefLogo className="w-12 h-12 text-white" />
              </div>
            </div>

            <p className="text-gray-300 mb-8 text-center">
              Empower your Voltagent AI agents with Ahrefs' leading SEO
              analytics through the Model Context Protocol (MCP). Automate
              competitor research, keyword analysis, and backlink audits to
              elevate your AI-driven SEO strategies.
            </p>

            <h3 className="text-xl font-bold text-white mb-4">
              What is Ahrefs MCP for AI Agents?
            </h3>
            <p className="text-gray-300 mb-4">
              Ahrefs is a premier SEO and content research platform. The Ahrefs
              Model Context Protocol (MCP) integration for Voltagent acts as a
              direct data pipeline, allowing your AI agents to programmatically
              access and utilize Ahrefs' vast database. This means your AI
              agents can autonomously perform SEO tasks, uncover insights, and
              help you dominate search rankings by leveraging a standardized MCP
              interface.
            </p>

            <h3 className="text-xl font-bold text-white mb-4">
              How to Use Ahrefs MCP with Your Voltagent AI Agents for SEO Wins
            </h3>
            <div className="text-gray-300 mb-4 space-y-3">
              <p>
                Integrating the Ahrefs MCP allows your Voltagent AI agents to
                execute powerful SEO tasks. Here's how your agents can leverage
                this for an edge:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <span className="font-medium text-white">
                    How AI Agents Conduct Backlink Analysis via MCP:
                  </span>{" "}
                  Train your AI agents to dive deep into backlink profiles using
                  Ahrefs data fetched through the MCP. They can analyze link
                  quality, anchor text, and track changes over time, identifying
                  new link-building opportunities for your AI-driven campaigns.
                </li>
                <li>
                  <span className="font-medium text-white">
                    AI-Powered Keyword Research with Ahrefs MCP:
                  </span>{" "}
                  Enable your AI agents to discover what your audience searches
                  for. Using the Ahrefs MCP, agents can retrieve search volumes,
                  keyword difficulty, and ranking data, helping you build an
                  AI-optimized content strategy.
                </li>
                <li>
                  <span className="font-medium text-white">
                    Automating Competitor SEO Analysis with AI Agents & MCP:
                  </span>{" "}
                  Configure your AI agents to continuously monitor competitor
                  SEO strategies via the Ahrefs MCP. They can analyze ranking
                  keywords, top content, and backlink tactics, providing
                  actionable intelligence for your AI to adapt.
                </li>
                <li>
                  <span className="font-medium text-white">
                    How AI Agents Monitor Site Health using Ahrefs MCP:
                  </span>{" "}
                  Your Voltagent agents can regularly assess domain SEO health
                  (like Domain Rating) and URL performance using Ahrefs data via
                  MCP, tracking history and metrics to flag issues for your AI
                  to address.
                </li>
                <li>
                  <span className="font-medium text-white">
                    AI Agents Auditing Outgoing Links via MCP:
                  </span>{" "}
                  Instruct your AI agents to analyze outgoing links from your
                  site using Ahrefs MCP data, evaluating their quality and SEO
                  impact to ensure your AI maintains a healthy link profile.
                </li>
                <li>
                  <span className="font-medium text-white">
                    AI Agents Gaining SERP Insights through Ahrefs MCP:
                  </span>{" "}
                  Your AI agents can retrieve and analyze SERP data for target
                  keywords via Ahrefs MCP, understanding ranking dynamics and
                  identifying opportunities for your AI to optimize for.
                </li>
              </ul>
            </div>

            <h3 className="text-xl font-bold text-white mb-4">Key features</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-300">
              <li>
                <span className="font-medium text-white">
                  How AI Agents Use Ahrefs MCP for Smarter SEO Decisions:
                </span>{" "}
                Empower your Voltagent AI agents to make superior SEO choices by
                leveraging real-time Ahrefs data and insights accessed via the
                Model Context Protocol.
              </li>
              <li>
                <span className="font-medium text-white">
                  How to Automate SEO Analysis with AI Agents and MCP:
                </span>{" "}
                Streamline your workflow by having your AI agents conduct
                repetitive SEO analysis and reporting using Ahrefs data through
                the MCP.
              </li>
              <li>
                <span className="font-medium text-white">
                  How AI Agents Understand Competitor SEO via MCP:
                </span>{" "}
                Enable your AI agents to learn from and adapt to competitor SEO
                strategies by continuously analyzing Ahrefs data obtained
                through the Model Context Protocol.
              </li>
              <li>
                <span className="font-medium text-white">
                  How AI Agents Build MCP-Driven Content Strategies:
                </span>{" "}
                Guide your AI agents to develop content strategies that rank,
                using Ahrefs MCP data to identify high-potential topics and
                optimize content.
              </li>
              <li>
                <span className="font-medium text-white">
                  How AI Agents Proactively Monitor SEO with Ahrefs MCP:
                </span>{" "}
                Set up your AI agents to use Ahrefs MCP for automated SEO
                performance monitoring, swiftly identifying issues and
                opportunities.
              </li>
            </ul>
          </div>

          {/* Tools Section */}
          {mcp.tools && mcp.tools.length > 0 && (
            <div className="rounded-lg backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
              <div className="flex items-center px-6 py-4 border-l-0 border-r-0 border-t-0 rounded-tl-md rounded-tr-md bg-[#222735] border-white/10 border-solid">
                <div className="bg-[#00d992]/10 w-8 h-8 landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0 mr-4">
                  <WrenchScrewdriverIcon className="w-5 h-5 text-[#00d992]" />
                </div>
                <div>
                  <span className="text-md font-semibold text-white mb-1">
                    Tools
                  </span>
                  <div className="text-gray-400 text-sm">
                    Available tools for the {mcp.name} Model Context Provider.
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-x-auto">
                <div className="grid grid-cols-1 gap-4">
                  {mcp.tools.map((tool) => (
                    <div
                      key={tool.id}
                      className="border rounded-lg bg-slate-800/50 overflow-hidden border-solid hover:border-[#00d992] transition-all duration-300"
                    >
                      {/* Tool header */}
                      <div
                        className="bg-slate-700/50 outline-none shadow-none focus:outline-none px-4 py-3 border-b cursor-pointer w-full text-left"
                        onClick={() => toggleTool(tool.id)}
                        onKeyUp={(e) =>
                          e.key === "Enter" && toggleTool(tool.id)
                        }
                        aria-expanded={!!expandedTools[tool.id]}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <code className="text-[#00d992] font-mono text-sm font-medium">
                                {tool.name}
                              </code>
                            </div>
                            <div className="text-sm text-gray-300">
                              {tool.description}
                            </div>
                          </div>
                          <ChevronDownIcon
                            className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${
                              expandedTools[tool.id]
                                ? "transform rotate-180"
                                : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* Tool content - only visible when expanded */}
                      {expandedTools[tool.id] && (
                        <div className="p-4">
                          {/* Inputs */}
                          {tool.inputs && tool.inputs.length > 0 && (
                            <div>
                              <div className="text-sm text-gray-400 mb-2">
                                Inputs
                              </div>
                              <div className="flex flex-wrap gap-3">
                                {tool.inputs.map((input) => (
                                  <div
                                    key={input.name}
                                    className="bg-slate-700/30 border border-slate-700/70 rounded-md p-3 flex-grow basis-[250px]"
                                  >
                                    <div className="flex items-center mb-1">
                                      <code className="text-blue-400 font-mono text-sm">
                                        {input.name}
                                      </code>
                                      {input.required && (
                                        <span className="text-red-400 ml-1 text-xs">
                                          *
                                        </span>
                                      )}
                                      <span className="ml-2 font-mono text-xs text-gray-500 bg-slate-800/50 px-2 py-0.5 rounded">
                                        {input.type}
                                      </span>
                                    </div>
                                    <div className="text-gray-400 text-sm">
                                      {input.description}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar - Right side */}
        <div className="space-y-6">
          {/* MCP Metadata - Similar to GitLab style */}
          <div className="p-6 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)]">
            <div className="flex items-center mb-5">
              <div className="w-8 h-8 mr-3 flex items-center justify-center bg-slate-700/50 rounded-md">
                <MCP_Logo className="w-5 h-5" />
              </div>
              <span className="text-xl font-semibold text-white">
                {mcp.name}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center mb-2">
                <span className="text-gray-400 text-sm mr-2">Created By</span>
                <div className="flex items-center">
                  <span className="inline-block w-4 h-4 mr-2 bg-orange-500 rounded-md" />
                  <span className="text-gray-200">modelcontextprotocol</span>
                </div>
              </div>
              <div className="text-gray-400 text-sm">5 months ago</div>
            </div>

            <p className="text-gray-300">
              {mcp.name} API, enabling {mcp.category.toLowerCase()}
            </p>
          </div>

          {/* Recommended Servers */}
          <div className="rounded-lg backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)]">
            <div className="flex items-center px-6 py-4 border-l-0 border-r-0 border-t-0 rounded-tl-md rounded-tr-md bg-[#222735] border-white/10 border-solid">
              <div className="bg-[#00d992]/10 w-8 h-8 landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0 mr-4">
                <ServerStackIcon className="w-5 h-5 text-[#00d992]" />
              </div>
              <div>
                <span className="text-md font-semibold text-white mb-1">
                  Recommended Servers
                </span>
                <div className="text-gray-400 text-sm">
                  Other MCP servers you might find useful.
                </div>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {recommendedServers.map((server) => (
                <div
                  key={server.id}
                  className="rounded-md border border-gray-700 hover:border-[#00d992] transition-all duration-300 flex items-start"
                >
                  <div
                    className={`w-7 h-7 mr-2.5 flex-shrink-0 flex items-center justify-center ${server.icon.bgColor} rounded-md`}
                  >
                    {server.icon.type === "component" ? (
                      <server.icon.component className="w-4 h-4 text-white" />
                    ) : (
                      <span
                        className={`text-xs font-bold ${server.icon.textColor}`}
                      >
                        {server.icon.value}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium text-sm mb-0.5">
                      {server.name}
                    </h4>
                    <span className="text-xs text-gray-400">
                      {server.description}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPDetailPage;
