import React from "react";
import Layout from "@theme/Layout";
import Link from "@docusaurus/Link";
import { TagIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { DotPattern } from "../../components/ui/dot-pattern";

export default function McpCategoriesListPage(props) {
  const { categories } = props;

  return (
    <Layout
      title="MCP Categories"
      description="Browse Model Context Providers by category"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-10 sm:py-20 flex flex-col items-center">
        <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />

        {/* Header */}

        <div className="flex  mb-12 flex-col items-center  relative">
          <div className="flex items-baseline justify-start">
            <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
              <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d992]" />
            </div>
            <span className="text-3xl sm:text-4xl font-bold text-[#00d992]">
              voltagent
            </span>
            <div className="relative">
              <span className="ml-2 text-xl sm:text-2xl font-medium text-gray-400">
                MCP
              </span>
              <span className="absolute -top-7 -right-16 px-3 py-1 text-xs bg-emerald-500/20 text-emerald-400 rounded-md font-medium border border-emerald-400/30">
                Categories
              </span>
            </div>
          </div>
          <p className="mt-2 text-center self-center text-gray-400 text-sm">
            Browse Model Context Providers by Category
          </p>
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
          {categories.map((category) => (
            <Link
              key={category.name}
              to={category.permalink}
              className="group p-4 sm:p-5 rounded-lg border border-solid border-white/10 no-underline hover:border-[#00d992]/70 transition-colors flex flex-col  bg-white/5 hover:shadow-lg hover:shadow-[#00d992]/5"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center mr-3">
                  <TagIcon className="w-4 h-4 text-[#00d992]" />
                </div>
                <span className="text-lg font-bold text-emerald-400">
                  {category.name}
                </span>
              </div>

              <div className="flex justify-between items-center mt-3">
                <span className="text-sm text-gray-400">
                  {category.count}{" "}
                  {category.count === 1 ? "provider" : "providers"}
                </span>

                <div className="px-2.5 py-1 bg-white/5 text-gray-300 rounded-full text-xs">
                  Browse
                </div>
              </div>

              {/* Preview items */}
              {category.items && category.items.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="w-full h-px bg-white/10" />
                  <p className="text-xs text-gray-500 mt-1.5 mb-1">
                    Top providers:
                  </p>
                  {category.items.slice(0, 3).map((item) => (
                    <div
                      key={item.metadata.id}
                      className="text-xs text-gray-300 truncate flex items-center"
                    >
                      <span className="inline-block w-1 h-1 bg-[#00d992] rounded-full mr-2" />
                      {item.metadata.name}
                    </div>
                  ))}
                </div>
              )}
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
