import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { BoltIcon, TagIcon } from "@heroicons/react/24/outline";
import { DotPattern } from "../../components/ui/dot-pattern";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

export default function McpCategoriesListPage(props) {
  const { categories } = props;
  const { siteConfig } = useDocusaurusContext();

  return (
    <Layout
      title="MCP Categories"
      description="Browse Model Context Providers by category"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 sm:py-20 flex flex-col items-center">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

        {/* Header */}
        <div className="w-full mb-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
              <BoltIcon className="w-6 h-6 text-[#00d992]" />
            </div>
            <span className="text-3xl md:text-4xl font-bold text-[#00d992]">
              {siteConfig.title || "voltagent"}
            </span>
            <div className="relative">
              <span className="ml-2 text-xl md:text-2xl font-medium text-gray-400">
                Categories
              </span>
            </div>
          </div>
          <p className="text-gray-400 text-lg">
            Browse Model Context Providers by category
          </p>
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.permalink}
              className="group border-solid border-[#1e293b]/40 rounded-lg overflow-hidden transition-all duration-300 hover:border-[#00d992]/60 hover:shadow-[0_0_15px_rgba(0,217,146,0.15)]"
              style={{
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                backgroundColor: "rgba(58, 66, 89, 0.3)",
              }}
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 bg-[#222735] rounded-full flex items-center justify-center mr-3">
                    <TagIcon className="w-6 h-6 text-[#00d992]" />
                  </div>
                  <h3 className="text-xl font-bold text-white">
                    {category.name}
                  </h3>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-400">
                    {category.count}{" "}
                    {category.count === 1 ? "provider" : "providers"}
                  </span>

                  <div className="px-3 py-1 bg-[#1e293b] text-gray-300 rounded-full text-sm">
                    Browse
                  </div>
                </div>

                {/* Preview items */}
                {category.items && category.items.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <div className="w-full h-px bg-gray-700 mb-3"></div>
                    <p className="text-xs text-gray-500 mb-2">Top providers:</p>
                    {category.items.slice(0, 3).map((item) => (
                      <div
                        key={item.metadata.id}
                        className="text-sm text-gray-300 truncate"
                      >
                        • {item.metadata.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>

        {/* Back to MCPs link */}
        <div className="mt-10">
          <Link
            to="/mcp"
            className="text-[#00d992] hover:text-emerald-400 font-medium"
          >
            ← Back to all MCPs
          </Link>
        </div>
      </div>
    </Layout>
  );
}
