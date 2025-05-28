import React, { useState, useEffect } from "react";
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

// Import server config helper
import { providerServerConfigs } from "../../components/mcp-list/mcp-page/serverConfigContent";
import { BoltIcon } from "@heroicons/react/20/solid";

// Server Config Content Renderer Component
const ServerConfigContentRenderer = ({ contentItems, mcp }) => {
  if (!contentItems || !Array.isArray(contentItems)) {
    return <CodeBlock code={JSON.stringify(contentItems, null, 2)} />;
  }

  // Function to replace placeholders in text
  const replacePlaceholders = (text) => {
    if (typeof text !== "string") return text;
    return text.replace(
      /{mcpName}/g,
      mcp.name.toLowerCase().replace(/\s/g, ""),
    );
  };

  // Function to make URLs clickable in text
  const makeLinksClickable = (text) => {
    if (typeof text !== "string") return text;

    // URL regex pattern to identify links
    const urlPattern = /(https?:\/\/[^\s]+)/g;

    // Use regex match with indices to properly replace URLs with link components
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    // Create a new regex for each execution to maintain lastIndex state
    const regex = new RegExp(urlPattern);

    // Execute regex and store result in match
    match = regex.exec(text);

    // Continue while we have matches
    while (match !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add the link component
      parts.push(
        <Link
          key={`link-${match[0]}`}
          to={match[0]}
          className="text-[#00d992] hover:underline"
          rel="nofollow"
        >
          {match[0]}
        </Link>,
      );

      lastIndex = regex.lastIndex;

      // Get next match
      match = regex.exec(text);
    }

    // Add remaining text after the last match
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts;
  };

  return (
    <div className="space-y-4">
      {contentItems.map((item, index) => {
        // Create a stable key using type, title, and index
        const key = `${item.type}-${item.title || ""}-${index}`;

        // Replace placeholders in value and title
        const processedValue = replacePlaceholders(item.value);
        const processedTitle = item.title
          ? replacePlaceholders(item.title)
          : undefined;

        if (item.type === "heading") {
          return (
            <div key={key} className="mt-3 mb-2">
              <p className="landing-sm:text-md text-sm font-semibold text-white mb-2">
                {processedTitle || ""}
              </p>
              {processedValue && (
                <p className="text-gray-300 landing-sm:text-sm text-xs mt-1">
                  {makeLinksClickable(processedValue)}
                </p>
              )}
            </div>
          );
        }

        if (item.type === "text") {
          return (
            <div key={key} className="mb-4">
              {processedTitle && (
                <p className="landing-sm:text-md text-sm font-medium text-white mb-1">
                  {processedTitle}
                </p>
              )}
              <p className="text-gray-300 landing-sm:text-sm text-xs">
                {makeLinksClickable(processedValue)}
              </p>
            </div>
          );
        }

        if (item.type === "code") {
          return (
            <div key={key} className="mb-4">
              <CodeBlock code={processedValue} />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

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

  // Define all possible providers
  const allProviders = [
    { id: "zapier", name: "Zapier" },
    { id: "composio", name: "Composio" },
  ];

  // Filter providers based on available_providers in MCP data
  const tabOptions = mcpData.data?.avaliable_providers
    ? allProviders.filter((provider) =>
        mcpData.data.avaliable_providers.includes(provider.id),
      )
    : allProviders;

  // State for main provider tabs (upper level)
  const [activeProviderTab, setActiveProviderTab] = useState(
    tabOptions.length > 0 ? tabOptions[0].id : "zapier",
  );

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

  // Get current tab data
  const currentTab =
    tabOptions.find((tab) => tab.id === activeProviderTab) || tabOptions[0];

  // Get server configuration based on provider and type
  const getServerConfig = (type) => {
    // Get provider config if available
    const providerConfig = providerServerConfigs[activeProviderTab];

    // For voltagent type, check if provider has specific config or use default
    if (type === "voltagent") {
      if (providerConfig?.voltagent) {
        // Return provider-specific voltagent config
        if (typeof providerConfig.voltagent === "string") {
          return providerConfig.voltagent;
        }

        if (Array.isArray(providerConfig.voltagent)) {
          // Return the structured content items directly
          return providerConfig.voltagent;
        }
      }

      // Default voltagent config if no provider-specific one exists
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
    }

    // For cursor and claude types, check if provider has specific config
    if (type === "cursor" || type === "claude") {
      if (providerConfig?.[type]) {
        // Return the structured content items directly
        return providerConfig[type];
      }

      // Just return empty array if no specific config exists
      return [];
    }

    // Fallback for any other type
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
  };

  // Server config tabs (nested tabs)
  const serverConfigTabs = [
    {
      id: "voltagent",
      name: "Voltagent",
      component: <BoltIcon className="w-4 h-4 mr-2 text-main-emerald" />,
    },
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
      creator: "Zapier",
      creatorIcon: "bg-red-500",
      link: `https://zapier.com/apps/${mcp.slug.toLowerCase()}/integrations`,
    },
    composio: {
      creator: "Composio",
      creatorIcon: "bg-green-500",
      link: `https://mcp.composio.dev/${mcp.name
        .toLowerCase()
        .replace(/\s/g, "")}`,
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
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 flex flex-col relative">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

        {/* Back to MCPs button */}
        <Link
          to="/mcp"
          className="flex items-center text-[#00d992] hover:text-[#00d992] mb-6 group no-underline"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to MCPs
        </Link>

        {/* Main title and description */}
        <div className="mb-8">
          <h1 className="landing-sm:text-3xl text-2xl font-bold text-white mb-2">
            {mcp.title}
          </h1>
          <div className="text-gray-400 flex items-center landing-sm:text-sm text-xs">
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

        {/* Mobile layout - MCP Info appears before Tools section */}
        <div className="block lg:hidden mb-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:min-h-[800px]">
          {/* Main content area - Left side */}
          <div className="lg:col-span-2">
            {/* Server Config section */}
            <div className="rounded-md border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
              <div className="flex items-center  landing-md:px-6 px-4 py-4 border-l-0 border-r-0 border-t-0 rounded-tl-md rounded-tr-md bg-[#222735] border-white/10 border-solid">
                <div className="bg-[#00d992]/10 w-8 h-8 landing-md:w-10 landing-md:h-10 rounded-md hidden landing-sm:flex items-center justify-center shrink-0 mr-4">
                  <ServerIcon className="w-5 h-5 text-[#00d992]" />
                </div>
                <div>
                  <span className="text-md font-semibold text-white mb-1">
                    Server Config & Usage Examples
                  </span>
                  <div className="text-gray-400 landing-md:text-sm text-xs">
                    Configure your {currentTab.name} MCP server for {mcp.name}.
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
                    className={`flex items-center relative px-3 py-2 landing-md:text-sm text-xs font-medium cursor-pointer transition-all duration-300 text-center ${
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
                {Array.isArray(getServerConfig(activeServerConfigTab)) ? (
                  <ServerConfigContentRenderer
                    contentItems={getServerConfig(activeServerConfigTab)}
                    mcp={mcp}
                  />
                ) : (
                  <CodeBlock
                    code={
                      typeof getServerConfig(activeServerConfigTab) === "string"
                        ? getServerConfig(activeServerConfigTab).replace(
                            /{mcpName}/g,
                            mcp.name.toLowerCase().replace(/\s/g, ""),
                          )
                        : getServerConfig(activeServerConfigTab)
                    }
                  />
                )}
              </div>
            </div>

            {/* Tools section */}
            {tools.length > 0 && (
              <div className="landing-md:p-6 p-4 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)] mb-8">
                <div className="flex justify-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-slate-700/50 flex items-center justify-center">
                    {mcp.logo && <mcp.logo className="w-12 h-12 text-white" />}
                  </div>
                </div>
                <p className="text-2xl font-bold text-white text-center mb-4">
                  {mcp.name} MCP Tools
                </p>
                <p className="text-gray-300 mb-8 text-center landing-md:text-base text-xs ">
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

          {/* Sidebar - Right side - Desktop only */}
          <div
            className="hidden lg:block lg:sticky lg:top-20 lg:self-start"
            style={{ maxHeight: "calc(100vh - 80px)", overflowY: "auto" }}
          >
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
      </div>
    </Layout>
  );
}
