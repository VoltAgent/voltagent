import type * as React from "react";
import { useState } from "react";
import {
  ArrowLeftIcon,
  StarIcon,
  ServerIcon,
  WrenchScrewdriverIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";
import Link from "@docusaurus/Link";
import { DotPattern } from "../../ui/dot-pattern";
import mcpDataJson from "../mcpData.json";
import ahrefToolsData from "./ahref-tools.json";
import { motion, AnimatePresence } from "framer-motion";
import { Claude37Logo } from "../../../../static/img/logos/claudie";
import { CursorLogo } from "../../../../static/img/logos/cursor";
import { ComposioLogo } from "../../../../static/img/logos/composio";
import { AhrefLogo } from "../../../../static/img/logos/integrations/ahref";
import { AirtableLogo } from "../../../../static/img/logos/integrations/airtable";
import { AnthropicLogo } from "../../../../static/img/logos/integrations/anthropic";
import { AsanaLogo } from "../../../../static/img/logos/integrations/asana";
import { ZapierLogo } from "../../../../static/img/logos/integrations/zapier";
import { GumloopLogo } from "../../../../static/img/logos/integrations/gumloop";
import ExpandableTool, {
  InputsList,
  ProviderFallbackInputs,
} from "./tool-input";
import SidebarInfoSection from "./mcp-info";
import {
  claudeTabContent,
  cursorTabContent,
  type TabContentItem,
  type TabOption,
  tabOptions,
} from "./serverConfigContent";

// Map logo components by key - only including the ones we need for now
const logoMap: any = {
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
    // Initialize based on the default activeTab's provider tools or total_tools as a fallback
    const initialProvider = ahrefToolsData.providers.find(
      (p) => p.name === activeTab,
    );
    const toolsToExpand = initialProvider?.tools || ahrefToolsData.total_tools;
    if (toolsToExpand && toolsToExpand.length > 0) {
      const initialState = {};
      initialState[toolsToExpand[0].id] = true;
      if (toolsToExpand.length > 1) {
        initialState[toolsToExpand[1].id] = true;
      }
      return initialState;
    }
    return {};
  });

  // Toggle tool expansion
  const toggleTool = (toolId: string) => {
    setExpandedTools((prev) => ({
      ...prev,
      [toolId]: !prev[toolId],
    }));
  };

  // Tab options for filtering
  // Tab options are now imported from serverConfigContent.ts

  // Get current tab data
  const currentTab =
    tabOptions.find((tab) => tab.id === activeTab) || tabOptions[0];

  // Get config code based on active tab
  const configCode = currentTab.serverConfig;

  // State for the server config nested tabs
  const [activeServerConfigTab, setActiveServerConfigTab] =
    useState("voltagent");

  // Add metadata for each tab
  const tabMetadata = {
    zapier: {
      creator: "Zapier Inc.",
      creatorIcon: "bg-red-500",
      link: "https://zapier.com/mcp",
    },
    gumloop: {
      creator: "Gumloop",
      creatorIcon: "bg-blue-500",
      link: "https://gumloop.com/mcp",
    },
    composio: {
      creator: "Composio Team",
      creatorIcon: "bg-green-500",
      link: "https://composio.dev",
    },
    community: {
      creator: "MCP Community",
      creatorIcon: "bg-purple-500",
      link: "https://modelcontextprotocol.github.io/community",
    },
  };

  // Get metadata for current tab
  const currentMetadata = tabMetadata[activeTab] || tabMetadata.zapier;

  // Define content for the new server config tabs
  // Content can be a string (for a single code block) or an array of objects for mixed content

  const serverConfigTabsData: {
    id: string;
    name: string;
    content: string | TabContentItem[]; // Updated type for content
    iconComponent: React.ReactNode | null;
  }[] = [
    {
      id: "voltagent",
      name: "Voltagent",
      content: configCode, // This is the main server config for the selected MCP
      iconComponent: null,
    },
    {
      id: "cursor",
      name: "Cursor",
      content: cursorTabContent, // Use imported content
      iconComponent: <CursorLogo className="h-4 w-4 mr-2 text-white" />,
    },
    {
      id: "claude",
      name: "Claude",
      content: claudeTabContent, // Use imported content
      iconComponent: <Claude37Logo className="h-4 w-4 mr-2" />,
    },
  ];

  const selectedTabData = serverConfigTabsData.find(
    (tab) => tab.id === activeServerConfigTab,
  );
  const activeContentToRender = selectedTabData?.content;
  const defaultMessage =
    "Select a tab to view the configuration or usage example.";

  // Determine tools for the "Tools Section" based on the activeTab
  const currentProviderId = currentTab.id; // e.g., "gumloop", "composio"
  const providerData = ahrefToolsData.providers.find(
    (p) => p.name === currentProviderId,
  );
  const toolsForProviderSection =
    providerData?.tools?.map((providerTool) => ({
      ...providerTool, // id, name, description, inputs
      providers: [currentProviderId], // Simulate providers array for ExpandableTool
      provider_inputs: { [currentProviderId]: providerTool.inputs }, // Map inputs to expected structure
      ahrefData: ahrefToolsData, // Pass full ahrefData for fallback if needed
      // mcp_content is intentionally omitted as showMcpContentDescription will be false
    })) || [];

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
          Ahrefs MCP Servers
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
              {tab.name}
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
            <div className="p-4">
              {" "}
              {/* Wrapper for content area below tabs */}
              {activeContentToRender ? (
                typeof activeContentToRender === "string" ? (
                  <CodeBlock code={activeContentToRender} />
                ) : (
                  activeContentToRender.map((item, index) =>
                    item.type === "code" ? (
                      <CodeBlock
                        key={`${item.type}-${index}-${item.value.slice(0, 10)}`}
                        code={item.value}
                      />
                    ) : (
                      <p
                        key={`${item.type}-${index}-${item.value.slice(0, 10)}`}
                        className="text-gray-300 my-2 whitespace-pre-line text-sm leading-relaxed"
                      >
                        {item.value}
                      </p>
                    ),
                  )
                )
              ) : (
                <p className="text-gray-400 text-sm my-2">{defaultMessage}</p>
              )}
            </div>
          </div>

          {/* What is section */}
          <div className="p-6 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center">
                <AhrefLogo className="w-12 h-12 text-white" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white text-center mb-4">
              How Can Your AI Agents Leverage the Ahrefs MCP Server?
            </p>
            <p className="text-gray-300 mb-8 text-center">
              The Ahrefs Model Context Protocol (MCP) server empowers your AI
              agents with direct access to Ahrefs' powerful SEO toolkit.
              Discover how your AI agents can automate complex SEO tasks, from
              in-depth backlink analysis and keyword research to competitor
              tracking and site audits. Below, explore the specific capabilities
              and how you can integrate them into your AI agent workflows via
              MCP for enhanced SEO automation and intelligence.
            </p>
            <div className="grid grid-cols-1 gap-4">
              {ahrefToolsData.total_tools.map((tool) => (
                <ExpandableTool
                  key={tool.id}
                  tool={{ ...tool, ahrefData: ahrefToolsData }}
                  toggleTool={toggleTool}
                  expanded={!!expandedTools[tool.id]}
                  logoMap={logoMap}
                  showMcpContentDescription={true}
                />
              ))}
            </div>
          </div>

          {/* Tools Section */}
          {toolsForProviderSection.length > 0 && (
            <div className="rounded-lg backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
              <div className="flex items-center px-6 py-4 border-l-0 border-r-0 border-t-0 rounded-tl-md rounded-tr-md bg-[#222735] border-white/10 border-solid">
                <div className="bg-[#00d992]/10 w-8 h-8 landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0 mr-4">
                  <WrenchScrewdriverIcon className="w-5 h-5 text-[#00d992]" />
                </div>
                <div>
                  <span className="text-md font-semibold text-white mb-1">
                    Tools for {currentTab.name}
                  </span>
                  <div className="text-gray-400 text-sm">
                    Available tools for the {currentTab.name} provider.
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-x-auto">
                <div className="grid grid-cols-1 gap-4">
                  {toolsForProviderSection.map((tool) => (
                    <ExpandableTool
                      key={tool.id}
                      tool={tool}
                      toggleTool={toggleTool}
                      expanded={!!expandedTools[tool.id]}
                      logoMap={logoMap}
                      showMcpContentDescription={false}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          {toolsForProviderSection.length === 0 &&
            currentProviderId !== "community" && (
              <div className="p-6 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
                <p className="text-gray-400 text-center">
                  No specific tools listed for the {currentTab.name} provider in
                  ahref-tools.json.
                </p>
              </div>
            )}
        </div>

        {/* Sidebar - Right side - Replaced with component */}
        <SidebarInfoSection
          mcp={mcp}
          currentMetadata={currentMetadata}
          currentTab={currentTab}
        />
      </div>
    </div>
  );
};

export default MCPDetailPage;
