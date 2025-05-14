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
                  Server Config
                </span>
                <div className="text-gray-400 text-sm">
                  Configuration parameters for your {currentTab.name} MCP
                  server.
                </div>
              </div>
            </div>
            <CodeBlock code={configCode} />
          </div>

          {/* What is section */}
          <div className="p-6 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
            <span className="text-lg font-bold text-white mb-6">
              {currentTab.name} - Provider
            </span>

            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center">
                {currentTab.component || (
                  <div className="text-3xl font-bold text-gray-300">
                    {currentTab.name.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            <p className="text-gray-300 mb-8 text-center">
              {currentTab.name} integration through the Voltagent MCP framework,
              allowing seamless interaction with your AI agents.
            </p>

            <h3 className="text-xl font-bold text-white mb-4">
              What is {currentTab.name} MCP?
            </h3>
            <p className="text-gray-300 mb-4">
              {currentTab.name} MCP is a Model Context Provider that enables
              your Voltagent-based AI agents to interact with {currentTab.name}
              's features. It provides a standardized interface to access and
              manipulate data, making it easy to integrate into your AI
              workflows.
            </p>

            <h3 className="text-xl font-bold text-white mb-4">
              How to use {currentTab.name} MCP?
            </h3>
            <p className="text-gray-300 mb-4">
              To use the {currentTab.name} MCP, you'll need to first obtain an
              API token from your {currentTab.name} account. Configure your
              Voltagent application with this token and the appropriate API URL.
              You can then use the MCP endpoints to access {currentTab.name}'s
              capabilities directly from your AI agents.
            </p>

            <h3 className="text-xl font-bold text-white mb-4">Key features</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-300">
              <li>
                <span className="font-medium text-white">
                  Seamless Integration:
                </span>{" "}
                Connect directly to your {currentTab.name} account with simple
                configuration.
              </li>
              <li>
                <span className="font-medium text-white">
                  Comprehensive API Access:
                </span>{" "}
                Full access to {currentTab.name}'s features through a unified
                API.
              </li>
              <li>
                <span className="font-medium text-white">
                  Secure Authentication:
                </span>{" "}
                Secure token-based authentication to protect your account.
              </li>
              <li>
                <span className="font-medium text-white">
                  Robust Error Handling:
                </span>{" "}
                Clear error messages and recovery options for all operations.
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
