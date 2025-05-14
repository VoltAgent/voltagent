import React, { useState } from "react";
import { BoltIcon } from "@heroicons/react/24/solid";
import {
  ArrowLeftIcon,
  StarIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  ServerStackIcon,
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

// Map logo components by key - only including the ones we need for now
const logoMap = {
  ahref: AhrefLogo,
  airtable: AirtableLogo,
  anthropic: AnthropicLogo,
  asana: AsanaLogo,
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

export const MCPDetailPage = () => {
  // Use the first item from mcpData.json
  const firstMcp = mcpDataJson[0];
  const mcp = {
    ...firstMcp,
    logo: logoMap[firstMcp.logoKey],
  };

  // Generate config code based on actual MCP data
  const configCode = `{
  "mcpServers": {
    "${mcp.name.toLowerCase()}": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-${mcp.logoKey}"
      ],
      "env": {
        "${mcp.name.toUpperCase().replace(/\s+/g, "_")}_ACCESS_TOKEN": "<YOUR_TOKEN>",
        "${mcp.name
          .toUpperCase()
          .replace(/\s+/g, "_")}_API_URL": "https://api.${mcp.name
          .toLowerCase()
          .replace(/\s+/g, "")}.com/v1"
      }
    }
  }
}`;

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
          How to Use {mcp.name} in Your Voltagent Project?
        </h1>
        <div className="text-gray-400 flex items-center">
          <span className="font-mono">{mcp.logoKey}</span>
          <span className="mx-2">-</span>
          <span>Model Context Provider</span>
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
                  Configuration parameters for your {mcp.name} MCP server.
                </div>
              </div>
            </div>
            <CodeBlock code={configCode} />
          </div>

          {/* What is section */}
          <div className="p-6 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
            <span className="text-lg font-bold text-white mb-6">
              {mcp.name} - {mcp.category} Provider
            </span>

            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center">
                <MCP_Logo className="w-16 h-16" />
              </div>
            </div>

            <p className="text-gray-300 mb-8 text-center">
              {mcp.description} through the Voltagent MCP framework, allowing
              seamless integration with your AI agents.
            </p>

            <h3 className="text-xl font-bold text-white mb-4">
              What is {mcp.name} MCP?
            </h3>
            <p className="text-gray-300 mb-4">
              {mcp.name} MCP is a Model Context Provider that enables your
              Voltagent-based AI agents to interact with {mcp.name}'s{" "}
              {mcp.category.toLowerCase()} features. It provides a standardized
              interface to access and manipulate data from {mcp.name}, making it
              easy to integrate into your AI workflows.
            </p>

            <h3 className="text-xl font-bold text-white mb-4">
              How to use {mcp.name} MCP?
            </h3>
            <p className="text-gray-300 mb-4">
              To use the {mcp.name} MCP, you'll need to first obtain an API
              token from your {mcp.name} account. Configure your Voltagent
              application with this token and the appropriate API URL. You can
              then use the MCP endpoints to access {mcp.name}'s capabilities
              directly from your AI agents.
            </p>

            <h3 className="text-xl font-bold text-white mb-4">Key features</h3>
            <ul className="list-disc pl-5 space-y-2 text-gray-300">
              <li>
                <span className="font-medium text-white">
                  Seamless Integration:
                </span>{" "}
                Connect directly to your {mcp.name} account with simple
                configuration.
              </li>
              <li>
                <span className="font-medium text-white">
                  Comprehensive API Access:
                </span>{" "}
                Full access to {mcp.name}'s {mcp.category.toLowerCase()}{" "}
                features through a unified API.
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
                <table className="min-w-full bg-slate-800/50 rounded-lg overflow-hidden">
                  <thead className="bg-slate-700/70 text-left">
                    <tr>
                      <th className="py-3 px-4 text-gray-300 font-medium">
                        Tool
                      </th>
                      <th className="py-3 px-4 text-gray-300 font-medium">
                        Description
                      </th>
                      <th className="py-3 px-4 text-gray-300 font-medium">
                        Inputs
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {mcp.tools.map((tool) => (
                      <tr key={tool.id} className="hover:bg-slate-700/30">
                        <td className="py-3 px-4">
                          <code className="text-[#00d992] font-mono">
                            {tool.name}
                          </code>
                        </td>
                        <td className="py-3 px-4 text-gray-300">
                          {tool.description}
                        </td>
                        <td className="py-3 px-4">
                          {tool.inputs?.map((input) => (
                            <div key={input.name} className="mb-2 last:mb-0">
                              <div className="flex items-start">
                                <code className="text-blue-400 font-mono">
                                  {input.name}
                                </code>
                                {input.required && (
                                  <span className="text-red-400 ml-1">*</span>
                                )}
                              </div>
                              <div className="text-gray-400 text-sm">
                                <div className="font-mono text-xs text-gray-500">
                                  {input.type}
                                </div>
                                <div>{input.description}</div>
                              </div>
                            </div>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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

            <div className="p-6">
              {/* AWS KB Server */}
              <div className="mb-4 p-3 rounded-md border border-gray-700 flex items-start">
                <div className="w-8 h-8 mr-3 flex-shrink-0 flex items-center justify-center bg-yellow-100 rounded-md">
                  <span className="text-xs font-bold text-yellow-800">AWS</span>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">
                    AWS Kb Retrieval Server
                  </h4>
                  <p className="text-xs text-gray-400">
                    An MCP server implementation for retrieving information from
                    the AWS...
                  </p>
                </div>
              </div>

              {/* Cursor */}
              <div className="mb-4 p-3 rounded-md border border-gray-700 flex items-start">
                <div className="w-8 h-8 mr-3 flex-shrink-0 flex items-center justify-center bg-gray-700 rounded-md">
                  <BoltIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">Cursor</h4>
                  <p className="text-xs text-gray-400">The AI Code Editor</p>
                </div>
              </div>

              {/* MiniMax MCP */}
              <div className="mb-4 p-3 rounded-md border border-gray-700 flex items-start">
                <div className="w-8 h-8 mr-3 flex-shrink-0 flex items-center justify-center bg-pink-600 rounded-md">
                  <span className="text-xs font-bold text-white">MM</span>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">MiniMax MCP</h4>
                  <p className="text-xs text-gray-400">
                    Official MiniMax Model Context Protocol (MCP) server that
                    enables interaction...
                  </p>
                </div>
              </div>

              {/* Playwright MCP */}
              <div className="p-3 rounded-md border border-gray-700 flex items-start">
                <div className="w-8 h-8 mr-3 flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-blue-500 via-green-500 to-red-500 rounded-md">
                  <span className="text-xs font-bold text-white">PW</span>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-1">
                    Playwright MCP
                  </h4>
                  <p className="text-xs text-gray-400">Playwright MCP server</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCPDetailPage;
