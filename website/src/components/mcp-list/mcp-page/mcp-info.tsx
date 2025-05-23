import type * as React from "react";
import RecommendedServersSection from "./recommended-servers";
import { getLogoComponent } from "../../../utils/logo-helper";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

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
    <div className="space-y-6 lg:sticky lg:top-20 lg:self-start lg:z-10 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
      {/* MCP Metadata - Similar to GitLab style */}
      <div className="p-4 rounded-md border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)]">
        <div className="flex flex-col justify-between  items-start mb-3">
          <div className="flex items-center">
            <div className="w-8 h-8 mr-3 flex items-center justify-center bg-slate-700/50 rounded-md">
              {LogoComponent && <LogoComponent className="w-5 h-5" />}
            </div>
            <span className="text-lg font-semibold text-emerald-400">
              {mcp.name} MCP
            </span>
          </div>
          <div className="flex items-center mt-3">
            <span className="text-gray-400 text-xs mr-2">Created By</span>
            <div className="flex items-center">
              <span className="text-gray-200 text-xs">
                {currentMetadata.creator}
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-300 mb-5 text-sm font-medium">
          {mcp.name} MCP server for AI agents
        </p>

        {/* Add link to the provider website */}

        <a
          href={currentMetadata.link}
          className="w-full flex items-center justify-center px-3 no-underline py-1.5 bg-emerald-400/10 text-emerald-400 border-solid border-emerald-400/20 text-sm font-medium rounded transition-all duration-200 hover:bg-emerald-400/30 hover:scale-[1.02] group-hover:bg-emerald-400/30 group-hover:scale-[1.01]"
          target="_blank"
          rel="noopener noreferrer nofollow"
          aria-label="View MCP Documentation"
        >
          Visit {mcp.name} {currentTab.name} Docs
          <ArrowTopRightOnSquareIcon
            className="h-4 w-4 ml-2"
            aria-hidden="true"
          />
        </a>
      </div>

      {/* Recommended Servers - Imported and used here */}
      <RecommendedServersSection similarMcps={similarMcps} />
    </div>
  );
};

export default SidebarInfoSection;
