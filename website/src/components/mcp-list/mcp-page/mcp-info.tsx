import type * as React from "react";
import RecommendedServersSection from "./recommended-servers";
import { getLogoComponent } from "../../../utils/logo-helper";

// Define types for the props
interface McpProps {
  logo?: React.ElementType; // Logo component
  name?: string;
  logoKey?: string; // Added logoKey for using with the helper
}

interface CurrentMetadataProps {
  creatorIcon?: string;
  creator?: string;
  link?: string;
}

interface CurrentTabProps {
  id?: string;
  name?: string;
}

// Similar MCP type - Updated to match the one in recommended-servers.tsx
interface SimilarMcp {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category: string;
  logoKey?: string;
}

interface SidebarInfoSectionProps {
  mcp: McpProps;
  currentMetadata: CurrentMetadataProps;
  currentTab: CurrentTabProps;
  similarMcps?: SimilarMcp[];
}

export const SidebarInfoSection: React.FC<SidebarInfoSectionProps> = ({
  mcp,
  currentMetadata,
  currentTab,
  similarMcps,
}) => {
  // Get logo component using the helper if logoKey is available
  const LogoComponent = mcp.logoKey ? getLogoComponent(mcp.logoKey) : mcp.logo;

  return (
    <div className="space-y-6">
      {/* MCP Metadata - Similar to GitLab style */}
      <div className="p-6 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)]">
        <div className="flex items-center mb-5">
          <div className="w-8 h-8 mr-3 flex items-center justify-center bg-slate-700/50 rounded-md">
            {LogoComponent && <LogoComponent className="w-5 h-5" />}
          </div>
          <span className="text-xl font-semibold text-white">
            {mcp.name} MCP
          </span>
        </div>

        <div className="mb-4">
          <div className="flex items-center">
            <span className="text-gray-400 text-sm mr-2">Created By</span>
            <div className="flex items-center">
              <span
                className={`inline-block w-4 h-4 mr-2 ${currentMetadata.creatorIcon} rounded-md`}
              />
              <span className="text-gray-200">{currentMetadata.creator}</span>
            </div>
          </div>
        </div>

        <p className="text-gray-300 mb-5 text-xs">
          Official {currentTab.name} Model Context Protocol (MCP) server for AI
          agents
        </p>

        {/* Add link to the provider website */}

        <a
          href={currentMetadata.link}
          className="w-full flex items-center justify-center px-3 py-1.5 bg-emerald-400/10 text-emerald-400 border-solid border-emerald-400/20 text-sm font-medium rounded transition-all duration-200 hover:bg-emerald-400/30 hover:scale-[1.02] group-hover:bg-emerald-400/30 group-hover:scale-[1.01]"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View MCP Documentation"
        >
          View MCP Documentation
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 ml-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>

      {/* Recommended Servers - Imported and used here */}
      <RecommendedServersSection similarMcps={similarMcps} />
    </div>
  );
};

export default SidebarInfoSection;
