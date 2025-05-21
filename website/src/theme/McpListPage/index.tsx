import React, { useState } from "react";
import { motion } from "framer-motion";
import Layout from "@theme/Layout";
import { MagnifyingGlassIcon, BoltIcon } from "@heroicons/react/24/outline";
import Link from "@docusaurus/Link";
import { DotPattern } from "../../components/ui/dot-pattern";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import { getLogoComponent } from "../../utils/logo-helper";

// MCP Card Component
const MCPCard = ({ mcp }) => {
  const LogoComponent = getLogoComponent(mcp.metadata.logoKey);

  return (
    <Link to={`/mcp/${mcp.metadata.slug}`}>
      <motion.div
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group border-solid border-[#1e293b]/40 rounded-lg overflow-hidden transition-all duration-300 h-full hover:border-[#00d992]/60 hover:shadow-[0_0_15px_rgba(0,217,146,0.15)] cursor-pointer"
        style={{
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          backgroundColor: "rgba(58, 66, 89, 0.3)",
        }}
      >
        <div className="p-4 flex flex-col h-full">
          {/* Header with category badge */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center">
              <div className="w-8 h-8 mr-2 flex items-center justify-center bg-slate-800/50 rounded-full">
                <LogoComponent className="w-5 h-5" />
              </div>
              <span className="text-[#00d992] font-bold text-base sm:text-lg truncate">
                {mcp.metadata.name}
              </span>
            </div>

            <span className="px-2 py-0.5 text-xs rounded-full bg-[#1e293b] text-gray-300">
              {mcp.metadata.category}
            </span>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-xs sm:text-sm mb-4 flex-grow">
            {mcp.metadata.short_description}
          </p>

          {/* Try Connection Button */}
          <div className="w-full flex items-center justify-center px-3 py-1.5 bg-emerald-400/10 text-emerald-400 border-solid border-emerald-400/20 text-sm font-medium rounded transition-all duration-200 hover:bg-emerald-400/30 hover:scale-[1.02] group-hover:bg-emerald-400/30 group-hover:scale-[1.01]">
            <span>See MCP Details</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-4 h-4 ml-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
              />
            </svg>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};

export default function McpListPage(props) {
  const { items } = props;
  const { siteConfig } = useDocusaurusContext();
  const [searchTerm, setSearchTerm] = useState("");

  // Filter MCPs based on search term
  const filteredMcps = items.filter((item) => {
    if (!searchTerm) return true;

    const searchTermLower = searchTerm.toLowerCase();
    return (
      item.metadata.name.toLowerCase().includes(searchTermLower) ||
      item.metadata.description?.toLowerCase().includes(searchTermLower) ||
      item.metadata.category?.toLowerCase().includes(searchTermLower)
    );
  });

  return (
    <Layout
      title="MCP Providers"
      description="Model Context Providers for Voltagent"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 sm:py-20 flex flex-col items-center">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

        {/* Header Section - Mobile optimized */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 landing-sm:gap-8 landing-md:mb-16 sm:landing-md:mb-24 mb-8 items-center w-full">
          <div className="flex flex-col items-center sm:items-center relative">
            <div className="flex items-baseline justify-start">
              <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
                <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d992]" />
              </div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#00d992]">
                {siteConfig.title || "voltagent"}
              </span>
              <div className="relative">
                <span className="ml-2 text-xl sm:text-xl md:text-2xl font-medium text-gray-400">
                  MCP
                </span>
              </div>
            </div>
            <p className="mt-2 text-center self-center text-gray-400 text-xs sm:text-sm">
              Enhance your agents with popular services
            </p>
          </div>

          <div className="relative mt-4 sm:mt-0">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center sm:text-left md:ml-8"
            >
              <p className="text-sm sm:text-base md:text-lg text-[#dcdcdc] mb-3 sm:mb-4">
                Model Context Providers are the most popular integration servers
                in the AI ecosystem.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-gray-400">
                <span className="text-[#00d992] font-bold text-base sm:text-lg">
                  Choose a provider
                </span>{" "}
                to see usage guide and documentation.
              </p>
            </motion.div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="w-full mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
              <MagnifyingGlassIcon className="w-5 h-5 text-gray-400" />
            </div>
            <input
              type="search"
              className="block w-full p-4 ps-10 text-sm rounded-lg bg-[#222735] border-gray-700 placeholder-gray-400 text-white focus:ring-[#00d992] focus:border-[#00d992]"
              placeholder="Search MCPs by name, category, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* MCP Grid - Responsive padding */}
        <div className="p-3 sm:p-5 md:p-7 rounded-lg border border-solid border-white/10 backdrop-filter backdrop-blur-sm w-full">
          <div className="flex flex-col gap-4 sm:gap-6">
            {filteredMcps.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {filteredMcps.map((mcp) => (
                  <MCPCard key={mcp.metadata.id} mcp={mcp} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-400 text-lg">
                  No MCPs found matching your search criteria.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
