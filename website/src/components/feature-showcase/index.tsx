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

  const activeTabData = tabsData.find((tab) => tab.id === activeTab);

  return (
    <section className="relative z-10 pb-16 ">
      <div className="max-w-7xl  mx-auto ">
        {/* Main Container */}
        <div className="overflow-hidden bg-black rounded-md ">
          {/* Tab Bar */}
          <div className="bg-black border-b border-solid border-t-0 border-l-0 border-r-0 border-zinc-700">
            <div className="flex items-center overflow-x-auto scrollbar-hide">
              {tabsData.map((tab) => {
                const Icon = iconMap[tab.icon];
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    style={{ border: "none", outline: "none", boxShadow: "none" }}
                    className={`
                      flex-1 flex items-center justify-center gap-2 p-4 font-medium
                      transition-colors duration-200 cursor-pointer
                      ${
                        isActive
                          ? "bg-transparent text-emerald-400 "
                          : "bg-transparent text-[#dcdcdc] hover:text-white hover:bg-white/5"
                      }
                    `}
                  >
                    {Icon && <Icon className={`w-4 h-4 ${isActive ? "text-emerald-400" : ""}`} />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content Area */}
          {activeTabData?.fullImage ? (
            /* Full Image Layout */
            <div className="h-[600px] ">
              <img
                src="https://cdn.voltagent.dev/website/showcase/evals.png"
                alt={`${activeTab} preview`}
                className="w-full h-full object-cover object-top"
              />
            </div>
          ) : (
            /* Code + Image Layout - 40% code, 60% image */
            <div className="grid grid-cols-1 lg:grid-cols-[40%_60%]">
              {/* Left Panel - Code */}
              <div className="h-[600px] overflow-auto showcase-code-block border-r border-solid border-t-0 border-b-0 border-l-0 border-zinc-700">
                <CodeBlock language="typescript">{activeTabData?.code}</CodeBlock>
              </div>

              {/* Right Panel - Preview Image */}
              <div className="h-[600px]">
                <img
                  src="https://cdn.voltagent.dev/website/showcase/evals.png"
                  alt={`${activeTab} preview`}
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col  border-t border-solid border-b-0 border-l-0 border-r-0 border-zinc-700 sm:flex-row items-center justify-between gap-4 px-6 py-4 bg-black">
            <p className="text-sm text-gray-400">
              Start building production-ready AI agents in minutes
            </p>
            <div className="flex gap-3">
              <a
                href="/docs/getting-started/quick-start"
                className="px-4 py-2.5 font-semibold text-sm backdrop-blur-sm text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-md transition duration-300 hover:bg-[#0e2c24] no-underline flex items-center gap-2"
              >
                <ChevronRightIcon className="w-4 h-4" />
                Quickstart
              </a>
              <a
                href="/docs"
                className="px-4 py-2.5 font-semibold text-sm backdrop-blur-sm text-gray-400 bg-transparent border border-[#113328] rounded-md transition duration-300 hover:bg-[#0e2c24] no-underline"
              >
                Documentation
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FeatureShowcase;
