import type * as React from "react";
import { useState } from "react";
import { ArrowLeftIcon, ServerIcon } from "@heroicons/react/24/outline";
import Link from "@docusaurus/Link";
import { DotPattern } from "../../ui/dot-pattern";
import mcpDataJson from "../mcpData.json";
import ahrefToolsData from "./google-sheets.json";
import { Claude37Logo } from "../../../../static/img/logos/claudie";
import { CursorLogo } from "../../../../static/img/logos/cursor";
import { ComposioLogo } from "../../../../static/img/logos/composio";
import { AhrefLogo } from "../../../../static/img/logos/integrations/ahref";
import { AirtableLogo } from "../../../../static/img/logos/integrations/airtable";
import { AnthropicLogo } from "../../../../static/img/logos/integrations/anthropic";
import { AsanaLogo } from "../../../../static/img/logos/integrations/asana";
import { ZapierLogo } from "../../../../static/img/logos/integrations/zapier";
import { GumloopLogo } from "../../../../static/img/logos/integrations/gumloop";
import ExpandableTool from "./tool-input";
import SidebarInfoSection from "./mcp-info";
import CodeBlock from "./CodeBlock";
import DynamicServerConfigContentRenderer, {
  type ServerConfigContentItem,
} from "./DynamicServerConfigContentRenderer";
import {
  providerServerConfigs,
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
    // Initialize tools to expand based on total_tools
    const toolsToExpand = ahrefToolsData.total_tools;
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

  // Get config code for Voltagent tab
  const voltagentConfigCode = currentTab.serverConfig;

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
  };

  // Get metadata for current tab
  const currentMetadata = tabMetadata[activeTab] || tabMetadata.zapier;

  // --- Dynamic Server Config Content Logic ---
  const currentProviderId = currentTab.id; // e.g., "zapier", "gumloop"
  const providerConfig = providerServerConfigs[currentProviderId];

  const placeholders: Record<string, string> = {
    "{{SERVER_NAME}}": currentTab.name, // e.g., "Gumloop", "Zapier"
    // This is specific to Gumloop's Claude config.
    // A more robust solution might be needed if other providers use similar, uniquely named placeholders.
    "{{AHREFS_SERVER_FOR_GUMCP}}": "ahrefs_community_server_name", // Example value
  };

  let cursorContent: ServerConfigContentItem[] = [];
  let claudeContent: ServerConfigContentItem[] = [];

  if (providerConfig) {
    cursorContent = providerConfig.cursor || [];
    claudeContent = providerConfig.claude || [];
    // Voltagent content can also be dynamic if defined in providerConfig.voltagent
    // For now, we are keeping the main currentTab.serverConfig for the "voltagent" tab's primary display
  }
  // --- End Dynamic Server Config Content Logic ---

  const serverConfigTabsData: {
    id: string;
    name: string;
    // content type will be resolved by the renderer or CodeBlock
    content: string | ServerConfigContentItem[];
    iconComponent: React.ReactNode | null;
  }[] = [
    {
      id: "voltagent",
      name: "Voltagent",
      content: voltagentConfigCode, // Remains the primary JSON config for the selected MCP
      iconComponent: null,
    },
    {
      id: "cursor",
      name: "Cursor",
      content: cursorContent, // Dynamically set from providerServerConfigs
      iconComponent: <CursorLogo className="h-4 w-4 mr-2 text-white" />,
    },
    {
      id: "claude",
      name: "Claude",
      content: claudeContent, // Dynamically set from providerServerConfigs
      iconComponent: <Claude37Logo className="h-4 w-4 mr-2" />,
    },
  ];

  const selectedNestedTabData = serverConfigTabsData.find(
    (tab) => tab.id === activeServerConfigTab,
  );
  const activeContentToRender = selectedNestedTabData?.content;
  const defaultMessage =
    "Select a tab to view the configuration or usage example.";

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
            {/* New section for Server Generation Info */}
            {providerConfig?.serverGenerationInfo && (
              <div className="px-6 py-4 border-b border-gray-700 bg-[#222735]/20 text-sm">
                {providerConfig.serverGenerationInfo.promptTextBeforeLink && (
                  <p className="text-gray-300 mb-2">
                    {providerConfig.serverGenerationInfo.promptTextBeforeLink}
                  </p>
                )}
                {providerConfig.serverGenerationInfo.urlTemplate && (
                  <p className="mb-2">
                    <Link
                      href={providerConfig.serverGenerationInfo.urlTemplate.replace(
                        /{mcpname}/g,
                        providerConfig.serverGenerationInfo.mcpNameValue ||
                          "ahrefs",
                      )}
                      className="text-[#00d992] hover:text-[#00b37a] font-medium underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {providerConfig.serverGenerationInfo.linkText ||
                        "Click here to get your server URL"}
                    </Link>
                  </p>
                )}
                {providerConfig.serverGenerationInfo.promptTextAfterLink && (
                  <p className="text-gray-300">
                    {providerConfig.serverGenerationInfo.promptTextAfterLink}
                  </p>
                )}
              </div>
            )}

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
              {activeContentToRender ? (
                activeServerConfigTab === "voltagent" &&
                typeof activeContentToRender === "string" ? (
                  <CodeBlock code={activeContentToRender} />
                ) : activeServerConfigTab === "voltagent" &&
                  typeof activeContentToRender !== "string" ? (
                  // Handle if Voltagent content is ServerConfigContentItem[] from providerServerConfigs
                  // For now, this example assumes providerConfig.voltagent is not the primary source for the 'voltagent' tab display here.
                  // If it were, we'd use DynamicServerConfigContentRenderer here too.
                  // This part can be enhanced if providerConfig.voltagent becomes the primary source.
                  <DynamicServerConfigContentRenderer
                    content={activeContentToRender as ServerConfigContentItem[]}
                    placeholders={placeholders}
                  />
                ) : (activeServerConfigTab === "cursor" ||
                    activeServerConfigTab === "claude") &&
                  Array.isArray(activeContentToRender) ? (
                  <DynamicServerConfigContentRenderer
                    content={activeContentToRender}
                    placeholders={placeholders}
                  />
                ) : (
                  // Fallback for unexpected content types, though ideally covered by above
                  <p className="text-gray-400 text-sm my-2">
                    Invalid content format for this tab.
                  </p>
                )
              ) : (
                <p className="text-gray-400 text-sm my-2">{defaultMessage}</p>
              )}
            </div>
          </div>

          {/* What is section - Now uses content from ahref-tools.json */}
          {ahrefToolsData.mcp_page_content && (
            <div className="p-6 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
              <div className="flex justify-center mb-8">
                <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center">
                  <AhrefLogo className="w-12 h-12 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white text-center mb-4">
                {ahrefToolsData.mcp_page_content.title}
              </p>
              <p className="text-gray-300 mb-8 text-center">
                {ahrefToolsData.mcp_page_content.description}
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
                    showParameters={false}
                  />
                ))}
              </div>
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
