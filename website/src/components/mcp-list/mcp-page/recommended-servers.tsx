import Link from "@docusaurus/Link";
import { ServerStackIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid"; // BoltIcon is used for Cursor
import type * as React from "react";
import { getLogoComponent } from "../../../utils/logo-helper";

interface SimilarMcp {
  id: string;
  name: string;
  slug: string;
  description: string;
  short_description: string;
  category: string;
  logoKey?: string;
}

interface RecommendedServersProps {
  similarMcps?: SimilarMcp[];
}

export const RecommendedServersSection: React.FC<RecommendedServersProps> = ({
  similarMcps,
}) => {
  console.log({ similarMcps });
  return (
    <div className="hidden lg:block rounded-md border border-solid border-white/10 backdrop-filter backdrop-blur-sm bg-[rgba(58,66,89,0.3)]">
      <div className="flex items-center px-4 py-4  rounded-tl-md rounded-tr-md bg-[#222735] ">
        <div className="bg-[#00d992]/10 w-8 h-8 landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0 mr-4">
          <ServerStackIcon className="w-5 h-5 text-[#00d992]" />
        </div>
        <div>
          <span className="text-md font-semibold text-white mb-1">
            {similarMcps && similarMcps.length > 0
              ? "Similar MCPs"
              : "Recommended Servers"}
          </span>
          <div className="text-gray-400 text-sm">
            {similarMcps && similarMcps.length > 0
              ? "Other MCPs you might be interested in"
              : "MCP servers you might find useful."}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {similarMcps.map((mcp) => {
          const LogoComponent = mcp.logoKey
            ? getLogoComponent(mcp.logoKey)
            : null;

          return (
            <Link
              key={mcp.id}
              to={`/mcp/${mcp.slug}`}
              className="block rounded-lg border border-gray-700 no-underline hover:border-[#00d992] hover:bg-gray-800/30 transition-all duration-300 p-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 flex items-center justify-center bg-slate-700 rounded-lg shrink-0">
                  {LogoComponent ? (
                    <LogoComponent className="w-5 h-5 text-white" />
                  ) : (
                    <span className="text-sm font-bold text-white">
                      {mcp.name?.substring(0, 2) || "MCP"}
                    </span>
                  )}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="text-white font-semibold text-sm mb-1 truncate">
                    {mcp.name}
                  </div>
                  <div className="text-xs text-gray-400 line-clamp-2">
                    {mcp.short_description || mcp.category}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default RecommendedServersSection;
