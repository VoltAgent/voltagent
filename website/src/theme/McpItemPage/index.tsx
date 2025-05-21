import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "@theme/Layout";
import { ArrowLeftIcon, ServerIcon } from "@heroicons/react/24/outline";
import Link from "@docusaurus/Link";
import { DotPattern } from "../../components/ui/dot-pattern";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

// Import existing components
import SidebarInfoSection from "../../components/mcp-list/mcp-page/mcp-info";
import ExpandableTool from "../../components/mcp-list/mcp-page/tool-input";
import CodeBlock from "../../components/mcp-list/mcp-page/CodeBlock";

// Import logo helper
import { getLogoComponent, logoMap } from "../../utils/logo-helper";

// Tab Component for provider tabs
const Tab = ({ active, onClick, children }) => {
  return (
    <div
      className={`relative px-4 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-medium cursor-pointer transition-all duration-300 text-center ${
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

export default function McpItemPage(props) {
  const { content: mcpData } = props;
  const { siteConfig } = useDocusaurusContext();

  // Prepare MCP data
  const mcp = {
    ...mcpData,
    logo: getLogoComponent(mcpData.logoKey),
  };

  // Extract tools from the data - moved up before use
  const tools = mcpData.data?.total_tools || [];

  // State for main provider tabs (upper level)
  const [activeProviderTab, setActiveProviderTab] = useState("zapier");

  // State for server config tabs (nested tabs)
  const [activeServerConfigTab, setActiveServerConfigTab] =
    useState("voltagent");

  // State for expanded tools
  const [expandedTools, setExpandedTools] = useState({});

  // Toggle tool expansion
  const toggleTool = (toolId) => {
    setExpandedTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  // Main provider tab options
  const tabOptions = [
    { id: "zapier", name: "Zapier" },
    { id: "gumloop", name: "Gumloop" },
    { id: "composio", name: "Composio" },
  ];

  // Get current tab data
  const currentTab =
    tabOptions.find((tab) => tab.id === activeProviderTab) || tabOptions[0];

  // Create server configs for each tab
  const getServerConfig = (type) => {
    switch (type) {
      case "voltagent":
        return JSON.stringify(
          {
            serverName: mcp.name,
            serverType: "mcp",
            provider: currentTab.name,
            configuration: {
              baseURL: `https://api.${mcp.name
                .toLowerCase()
                .replace(/\s/g, "")}.com/`,
              apiKey: "YOUR_API_KEY_HERE",
              maxTokens: 4096,
              temperature: 0.7,
            },
          },
          null,
          2,
        );
      case "cursor":
        return `// Cursor MCP Configuration for ${mcp.name} via ${
          currentTab.name
        }
const server = voltagent.createServer({
  name: "${mcp.name}",
  type: "mcp",
  provider: "${currentTab.name}",
  config: {
    apiKey: "YOUR_API_KEY_HERE",
    baseURL: "https://api.${mcp.name.toLowerCase().replace(/\s/g, "")}.com/",
  }
});

// Example usage
const result = await server.query({
  prompt: "Tell me about ${mcp.name}",
  maxTokens: 1024
});`;
      case "claude":
        return `// Claude MCP Configuration for ${mcp.name} via ${
          currentTab.name
        }
const assistant = claude.setup({
  server: {
    name: "${mcp.name}",
    type: "mcp",
    provider: "${currentTab.name}",
    apiKey: process.env.${mcp.name.toUpperCase()}_API_KEY,
    endpoint: "https://api.${mcp.name.toLowerCase().replace(/\s/g, "")}.com/v1/"
  }
});

// Query the ${mcp.name} service
const response = await assistant.complete({
  prompt: "What is ${mcp.name}?",
  max_tokens: 1000,
  temperature: 0.7
});`;
      default:
        return JSON.stringify(
          {
            serverName: mcp.name,
            serverType: "mcp",
            configuration: {
              baseURL: `https://api.${mcp.name
                .toLowerCase()
                .replace(/\s/g, "")}.com/`,
              apiKey: "YOUR_API_KEY_HERE",
              maxTokens: 4096,
              temperature: 0.7,
            },
          },
          null,
          2,
        );
    }
  };

  // Server config tabs (nested tabs)
  const serverConfigTabs = [
    { id: "voltagent", name: "Voltagent", component: null },
    {
      id: "cursor",
      name: "Cursor",
      component: <logoMap.cursor className="h-4 w-4 mr-2 text-white" />,
    },
    {
      id: "claude",
      name: "Claude",
      component: <logoMap.claude className="h-4 w-4 mr-2" />,
    },
  ];

  // Provider metadata for each main provider tab
  const tabMetadata = {
    zapier: {
      creator: "Zapier Inc.",
      creatorIcon: "bg-red-500",
      link: `https://zapier.com/mcp/${mcp.name.toLowerCase()}`,
    },
    gumloop: {
      creator: "Gumloop",
      creatorIcon: "bg-blue-500",
      link: `https://gumloop.com/mcp/${mcp.name.toLowerCase()}`,
    },
    composio: {
      creator: "Composio Team",
      creatorIcon: "bg-green-500",
      link: `https://composio.dev/${mcp.name.toLowerCase()}`,
    },
  };

  // Get current metadata based on active provider tab
  const currentMetadata = tabMetadata[activeProviderTab] || tabMetadata.zapier;

  // Reset server config tab when provider tab changes
  useEffect(() => {
    // Reset to default voltagent tab when provider changes
    setActiveServerConfigTab("voltagent");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Sadece ilk render'da çalıştır

  // Initially expand the first tool if available
  useEffect(() => {
    if (tools.length > 0) {
      setExpandedTools({ [tools[0].id]: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tools]); // tools değiştiğinde çalıştır

  return (
    <Layout
      title={`${mcp.name} MCP - ${siteConfig.title}`}
      description={mcp.description}
    >
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
            {mcp.title}
          </h1>
          <div className="text-gray-400 flex items-center">
            <span className="font-mono">{mcp.name}</span>
            <span className="mx-2">-</span>
            <span>Model Context Provider</span>
          </div>
        </div>

        {/* Tab Navigation - Upper level provider tabs */}
        <div className="mb-8 w-full">
          <div className="flex border-b border-gray-800 w-full" role="tablist">
            {tabOptions.map((tab) => (
              <Tab
                key={tab.id}
                active={activeProviderTab === tab.id}
                onClick={() => setActiveProviderTab(tab.id)}
              >
                {tab.name}
              </Tab>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content area - Left side */}
          <div className="lg:col-span-2">
            {/* Server Config section */}
            <div className="rounded-lg backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
              <div className="flex items-center px-6 py-4 border-l-0 border-r-0 border-t-0 rounded-tl-md rounded-tr-md bg-[#222735] border-white/10 border-solid">
                <div className="bg-[#00d992]/10 w-8 h-8 landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0 mr-4">
                  <ServerIcon className="w-5 h-5 text-[#00d992]" />
                </div>
                <div>
                  <span className="text-md font-semibold text-white mb-1">
                    Server Config & Usage Examples
                  </span>
                  <div className="text-gray-400 text-sm">
                    Configure your {currentTab.name} MCP server for {mcp.name}{" "}
                    and see how to call it.
                  </div>
                </div>
              </div>

              {/* Nested Tab Navigation for Server Config */}
              <div
                className="flex border-b border-gray-700 bg-[#222735]/50"
                role="tablist"
              >
                {serverConfigTabs.map((tab) => (
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
                    {tab.component}
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

              {/* Server config content */}
              <div className="p-4">
                <CodeBlock code={getServerConfig(activeServerConfigTab)} />
              </div>
            </div>

            {/* Tools section */}
            {tools.length > 0 && (
              <div className="p-6 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
                <div className="flex justify-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center">
                    {mcp.logo && <mcp.logo className="w-12 h-12 text-white" />}
                  </div>
                </div>
                <p className="text-2xl font-bold text-white text-center mb-4">
                  {mcp.name} Tools
                </p>
                <p className="text-gray-300 mb-8 text-center">
                  {mcp.description}
                </p>
                <div className="grid grid-cols-1 gap-4">
                  {tools.map((tool) => (
                    <ExpandableTool
                      key={tool.id}
                      tool={{ ...tool, ahrefData: mcpData.data }}
                      toggleTool={toggleTool}
                      expanded={!!expandedTools[tool.id]}
                      logoMap={logoMap}
                      showMcpContentDescription={true}
                      showParameters={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Right side */}
          <SidebarInfoSection
            mcp={{
              ...mcp,
              logoKey: mcpData.logoKey,
            }}
            currentMetadata={currentMetadata}
            currentTab={currentTab}
            similarMcps={mcpData.similarMcps}
          />
        </div>
      </div>
    </Layout>
  );
}
