import {
  ArrowTopRightOnSquareIcon,
  ArrowUpRightIcon,
  BellIcon,
  BoltIcon,
  BookOpenIcon,
  ChartBarIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  CodeBracketIcon,
  PlayIcon,
  ShieldCheckIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import CodeBlock from "@theme/CodeBlock";
import { useEffect, useRef, useState } from "react";
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
  book: BookOpenIcon,
};

export function FeatureShowcase() {
  const [activeTab, setActiveTab] = useState("framework");
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<"trigger" | "action">("trigger");
  const tabsContainerRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll to active tab on mobile
  useEffect(() => {
    if (tabsContainerRef.current && window.innerWidth < 768) {
      const activeButton = tabsContainerRef.current.querySelector(
        `[data-tab-id="${activeTab}"]`,
      ) as HTMLElement;
      if (activeButton) {
        const containerWidth = tabsContainerRef.current.offsetWidth;
        const buttonLeft = activeButton.offsetLeft;
        const buttonWidth = activeButton.offsetWidth;
        const scrollPosition = buttonLeft - containerWidth / 2 + buttonWidth / 2;

        tabsContainerRef.current.scrollTo({
          left: scrollPosition,
          behavior: "smooth",
        });
      }
    }
  }, [activeTab]);

  return (
    <section className="feature-showcase relative z-10 px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* Main Container */}
        <div className="overflow-hidden !border !border-solid !border-[#3d3a39] rounded-lg">
          {/* Tab Bar + Description (unified) */}
          <div className="!border-b !border-solid !border-t-0 !border-l-0 !border-r-0 !border-[#3d3a39]">
            {/* Tabs */}
            <div
              ref={tabsContainerRef}
              className="flex items-center overflow-x-auto scrollbar-hide"
            >
              {tabsData.map((tab) => {
                const Icon = iconMap[tab.icon];
                const isActive = activeTab === tab.id;
                const isHovered = hoveredTab === tab.id;
                // If there's a hover, only highlight the hovered tab
                // Otherwise, highlight the active tab
                const isHighlighted = hoveredTab ? isHovered : isActive;

                return (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    onMouseEnter={() => setHoveredTab(tab.id)}
                    onMouseLeave={() => setHoveredTab(null)}
                    style={{ border: "none", outline: "none", boxShadow: "none" }}
                    className={`
                      relative flex items-center justify-center gap-1 md:gap-2 p-2 md:px-4 md:py-3 font-medium
                      transition-all duration-700 ease-in-out cursor-pointer
                      md:flex-1
                      ${
                        isActive && !hoveredTab
                          ? "bg-[#101010] text-[#2fd6a1] border-b-2 border-[#2fd6a1]"
                          : isHighlighted
                            ? "bg-[#151515] text-[#2fd6a1]"
                            : "bg-transparent text-[#eeeeee] border-b-2 border-transparent"
                      }
                    `}
                  >
                    {Icon && (
                      <Icon
                        className={`w-3.5 h-3.5 md:w-5 md:h-5 transition-colors duration-700 ease-in-out ${
                          isHighlighted ? "text-[#2fd6a1]" : ""
                        }`}
                      />
                    )}
                    <span className="transition-colors duration-700 ease-in-out text-[11px] sm:text-xs md:text-sm whitespace-nowrap">
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Tab Description */}
            <div
              className={`flex flex-row items-center justify-between gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 transition-all duration-700 ease-in-out ${
                hoveredTab ? "bg-[#151515]" : activeTab ? "bg-[#101010]" : "bg-[#151515]"
              }`}
            >
              <span
                className={`text-xs md:text-sm flex-1 transition-colors duration-700 ${
                  hoveredTab || activeTab ? "" : "text-[#eeeeee]"
                }`}
              >
                {displayTabData?.footerText ||
                  "Start building production-ready AI agents in minutes"}
              </span>
              <a
                href={displayTabData?.docLink || "/docs"}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs md:text-sm no-underline flex items-center gap-1 flex-shrink-0 transition-colors ${
                  hoveredTab || activeTab
                    ? " hover:text-[#2fd6a1]"
                    : "text-[#eeeeee] hover:text-white"
                }`}
              >
                <BookOpenIcon className="w-4 h-4" />
                <span>Docs</span>
                <ArrowUpRightIcon className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Content Area */}
          <div className="bg-[#101010]">
            {displayTabData?.fullImage ? (
              /* Full Image Layout */
              <div className="h-[250px] sm:h-[350px] md:h-[600px] p-2 md:p-0">
                <img
                  src={
                    displayTabData?.image ||
                    "https://cdn.voltagent.dev/website/feature-showcase/framework.png"
                  }
                  alt={`${displayTabData?.id} preview`}
                  className="w-full h-full object-contain md:object-cover object-top cursor-pointer md:cursor-default"
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      setLightboxImage(
                        displayTabData?.image ||
                          "https://cdn.voltagent.dev/website/feature-showcase/framework.png",
                      );
                    }
                  }}
                />
              </div>
            ) : (
              /* Code + Image Layout - 40% code, 60% image */
              <div className="grid grid-cols-1 lg:grid-cols-[40%_60%]">
                {/* Preview Image - Top on mobile, Right on desktop */}
                <div className="block lg:hidden h-[250px] sm:h-[350px] p-2">
                  <img
                    src={
                      displayTabData?.image ||
                      "https://cdn.voltagent.dev/website/feature-showcase/framework.png"
                    }
                    alt={`${displayTabData?.id} preview`}
                    className="w-full h-full object-contain cursor-pointer"
                    onClick={() =>
                      setLightboxImage(
                        displayTabData?.image ||
                          "https://cdn.voltagent.dev/website/feature-showcase/framework.png",
                      )
                    }
                  />
                </div>

                {/* Code Panel - Bottom on mobile, Left on desktop */}
                <div className="h-[250px] sm:h-[350px] md:h-[600px] overflow-auto showcase-code-block lg:!border-r !border-solid !border-t-0 !border-b-0 !border-l-0 !border-[#3d3a39] order-2 lg:order-1">
                  {displayTabData?.triggerCode && displayTabData?.actionCode ? (
                    <div className="flex flex-col h-full">
                      {/* Code Tabs */}
                      <div className="flex !border-b !border-solid !border-t-0 !border-l-0 !border-r-0 !border-[#3d3a39] bg-[#101010]">
                        <button
                          onClick={() => setActiveCodeTab("trigger")}
                          className={`px-4 py-2 text-xs font-medium transition-colors cursor-pointer border-0 outline-none ${
                            activeCodeTab === "trigger"
                              ? "text-[#eeeeee] bg-[#101010] border-b-2 border-[#5c5855]"
                              : "text-[#8a8380] hover:text-[#b8b3b0] bg-transparent"
                          }`}
                        >
                          Trigger
                        </button>
                        <button
                          onClick={() => setActiveCodeTab("action")}
                          className={`px-4 py-2 text-xs font-medium transition-colors cursor-pointer border-0 outline-none ${
                            activeCodeTab === "action"
                              ? "text-[#eeeeee] bg-[#101010] border-b-2 border-[#5c5855]"
                              : "text-[#8a8380] hover:text-[#b8b3b0] bg-transparent"
                          }`}
                        >
                          Action
                        </button>
                      </div>
                      {/* Code Content */}
                      <div className="flex-1 overflow-auto">
                        <CodeBlock language="typescript">
                          {activeCodeTab === "trigger"
                            ? displayTabData.triggerCode
                            : displayTabData.actionCode}
                        </CodeBlock>
                      </div>
                    </div>
                  ) : (
                    <CodeBlock language="typescript">{displayTabData?.code}</CodeBlock>
                  )}
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

      {/* Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 md:hidden"
          onClick={() => setLightboxImage(null)}
        >
          <button
            onClick={() => setLightboxImage(null)}
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <img
            src={lightboxImage}
            alt="Enlarged preview"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}

export default FeatureShowcase;
