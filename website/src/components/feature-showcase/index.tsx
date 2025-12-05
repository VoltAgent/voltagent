import {
  BellIcon,
  BoltIcon,
  ChartBarIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  CodeBracketIcon,
  PlayIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import CodeBlock from "@theme/CodeBlock";
import { useState } from "react";
import { tabsData } from "./mock-data";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  code: CodeBracketIcon,
  chart: ChartBarIcon,
  check: CheckCircleIcon,
  zap: BoltIcon,
  play: PlayIcon,
  bell: BellIcon,
  message: ChatBubbleLeftIcon,
  shield: ShieldCheckIcon,
};

export function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState("framework");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  const activeTabData = tabsData.find((tab) => tab.id === activeTab);
  const displayTabData = hoveredTab ? tabsData.find((tab) => tab.id === hoveredTab) : activeTabData;

  return (
    <section className="relative z-10 pb-16 ">
      <div className="max-w-7xl  mx-auto ">
        {/* Main Container */}
        <div className="overflow-hidden border-solid border-zinc-800  rounded-md ">
          {/* Tab Bar + Description (unified) */}
          <div className=" border-b border-solid border-t-0 border-l-0 border-r-0 border-zinc-800">
            {/* Tabs */}
            <div className="flex items-center overflow-x-auto scrollbar-hide">
              {tabsData.map((tab) => {
                const Icon = iconMap[tab.icon];
                const isActive = activeTab === tab.id;
                const isHovered = hoveredTab === tab.id;
                const isHighlighted = isActive || isHovered;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    onMouseEnter={() => setHoveredTab(tab.id)}
                    onMouseLeave={() => setHoveredTab(null)}
                    style={{ border: "none", outline: "none", boxShadow: "none" }}
                    className={`
                      flex-1 flex items-center justify-center gap-2 p-4 font-medium
                      transition-all duration-500 ease-in-out cursor-pointer
                      ${
                        isHighlighted
                          ? "bg-zinc-800/40 text-emerald-400"
                          : "bg-transparent text-zinc-100"
                      }
                    `}
                  >
                    {Icon && (
                      <Icon
                        className={`w-4 h-4 transition-colors duration-500 ease-in-out ${
                          isHighlighted ? "text-emerald-400" : ""
                        }`}
                      />
                    )}
                    <span className="transition-colors duration-500 ease-in-out">{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab Description */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 transition-all duration-500 ease-in-out bg-zinc-800/40">
              <p
                key={displayTabData?.id}
                className="text-sm text-zinc-100 m-0"
                style={{
                  animation: "fadeIn 0.5s ease-in-out",
                }}
              >
                {displayTabData?.footerText ||
                  "Start building production-ready AI agents in minutes"}
              </p>
              <a
                href="/docs"
                className="text-sm text-zinc-100 hover:text-white no-underline flex items-center gap-1 transition-colors"
              >
                Documentation
                <ChevronRightIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Content Area */}
          <div
            key={displayTabData?.id}
            className="bg-black"
            style={{
              animation: "fadeIn 0.5s ease-in-out",
            }}
          >
            {displayTabData?.fullImage ? (
              /* Full Image Layout */
              <div className="h-[600px] ">
                <img
                  src="https://cdn.voltagent.dev/website/showcase/evals.png"
                  alt={`${displayTabData?.id} preview`}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            ) : (
              /* Code + Image Layout - 40% code, 60% image */
              <div className="grid grid-cols-1 lg:grid-cols-[40%_60%]">
                {/* Left Panel - Code */}
                <div className="h-[600px] overflow-auto showcase-code-block border-r border-solid border-t-0 border-b-0 border-l-0 border-zinc-700">
                  <CodeBlock language="typescript">{displayTabData?.code}</CodeBlock>
                </div>

                {/* Right Panel - Preview Image */}
                <div className="h-[600px]">
                  <img
                    src="https://cdn.voltagent.dev/website/showcase/evals.png"
                    alt={`${displayTabData?.id} preview`}
                    className="w-full h-full object-cover object-left-top"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeatureShowcase;
