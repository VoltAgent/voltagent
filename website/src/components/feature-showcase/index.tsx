import {
  ArrowTopRightOnSquareIcon,
  BellIcon,
  BoltIcon,
  ChartBarIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  PlayIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import CodeBlock from "@theme/CodeBlock";
import { useEffect, useState } from "react";
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

  // Preload all images when component mounts
  useEffect(() => {
    tabsData.forEach((tab) => {
      if (tab.image) {
        const img = new Image();
        img.src = tab.image;
      }
    });
  }, []);

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
                      flex-1 flex items-center justify-center gap-2 p-2 md:p-4 font-medium
                      transition-all duration-700 ease-in-out cursor-pointer
                      ${
                        isHighlighted
                          ? "bg-zinc-800/40 text-emerald-400"
                          : "bg-transparent text-zinc-100"
                      }
                    `}
                  >
                    {Icon && (
                      <Icon
                        className={`w-4 h-4 transition-colors duration-700 ease-in-out ${
                          isHighlighted ? "text-emerald-400" : ""
                        }`}
                      />
                    )}
                    <span className="transition-colors duration-700 ease-in-out text-xs md:text-sm">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab Description */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2 md:gap-4 px-4 md:px-6 py-3 md:py-4 transition-all duration-700 ease-in-out bg-zinc-800/40">
              <p className="text-xs md:text-sm text-zinc-100 m-0">
                {displayTabData?.footerText ||
                  "Start building production-ready AI agents in minutes"}
              </p>
              <a
                href={displayTabData?.docLink || "/docs"}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs md:text-sm text-zinc-100 hover:text-white no-underline flex items-center gap-1 transition-colors"
              >
                Documentation
                <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-black">
            {displayTabData?.fullImage ? (
              /* Full Image Layout */
              <div className="h-[300px] md:h-[600px]">
                <img
                  src={
                    displayTabData?.image ||
                    "https://cdn.voltagent.dev/website/feature-showcase/framework.png"
                  }
                  alt={`${displayTabData?.id} preview`}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            ) : (
              /* Code + Image Layout - 40% code, 60% image */
              <div className="grid grid-cols-1 lg:grid-cols-[40%_60%]">
                {/* Preview Image - Top on mobile, Right on desktop */}
                <div className="block lg:hidden h-[200px]">
                  <img
                    src={
                      displayTabData?.image ||
                      "https://cdn.voltagent.dev/website/feature-showcase/framework.png"
                    }
                    alt={`${displayTabData?.id} preview`}
                    className="w-full h-full object-cover object-left-top"
                  />
                </div>

                {/* Code Panel - Bottom on mobile, Left on desktop */}
                <div className="h-[300px] md:h-[600px] overflow-auto showcase-code-block lg:border-r border-solid border-t-0 border-b-0 border-l-0 border-zinc-700 order-2 lg:order-1">
                  <CodeBlock language="typescript">{displayTabData?.code}</CodeBlock>
                </div>

                {/* Preview Image - Desktop only */}
                <div className="hidden lg:block h-[600px] order-2">
                  <img
                    src={
                      displayTabData?.image ||
                      "https://cdn.voltagent.dev/website/feature-showcase/framework.png"
                    }
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
