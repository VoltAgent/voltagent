import {
  CircleStackIcon,
  CommandLineIcon,
  WindowIcon,
  WrenchIcon,
} from "@heroicons/react/24/outline";
import React, { useState } from "react";
import { CodeExample } from "./code-example";

export function AgentsDetail() {
  const [selectedFeature, setSelectedFeature] = useState<"api" | "memory" | "prompt" | "tools">(
    "tools",
  );

  // Handler for feature card clicks
  const handleFeatureClick = (featureType: "api" | "memory" | "prompt" | "tools") => {
    setSelectedFeature(featureType);
  };

  return (
    <div className="text-white relative w-full overflow-hidden landing-md:mt-12 mb-24">
      {/* Header with full-width background */}
      <div className="w-full bg-[#101010] relative z-10 landing-xs:py-16 landing-md:py-12">
        <div className="max-w-7xl mx-auto   px-4">
          <div className="text-left max-w-4xl ">
            <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold  text-[#b8b3b0] tracking-wide uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-main-emerald inline-block" />
              Enterprise-level AI agents
            </h2>
            <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-normal landing-md:font-normal text-white sm:text-5xl sm:tracking-tight">
              Complete toolkit for enterprise level AI agents
            </p>
            <p className="max-w-3xl  landing-md:text-xl  landing-xs:text-md text-[#8a8380] mb-0">
              Design production-ready agents with unified APIs, tools, and memory.
            </p>
          </div>
        </div>
      </div>

      {/* Two column layout for code and features */}
      <div className="max-w-7xl relative z-10  mx-auto px-4 mt-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Code Example - Left column */}
          <div className="lg:w-1/2 h-full order-2 lg:order-2">
            <CodeExample featureType={selectedFeature} />
          </div>

          {/* Features Section - Right column */}
          <div className="lg:w-1/2 order-1 lg:order-1">
            <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-4 h-full">
              {/* Feature 1 - API */}

              {/* Feature 4 - Tools */}
              <div className="relative">
                <div
                  style={{ borderWidth: "1px" }}
                  className={`landing-xs:p-3 rounded-lg border border-solid ${
                    selectedFeature === "tools"
                      ? "border-[#5c5855] bg-[#1a1a1a]"
                      : "border-[#3d3a39] bg-[#101010] hover:border-[#5c5855] hover:bg-[#1a1a1a]"
                  } transition-colors duration-300 cursor-pointer`}
                  onClick={() => handleFeatureClick("tools")}
                >
                  <div className="flex landing-xs:flex-row landing-md:flex-col landing-xs:items-center landing-md:items-start gap-2 mb-2">
                    <div className="bg-[#b8b3b0]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center">
                      <WrenchIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#b8b3b0]" />
                    </div>
                    <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Tool calling
                    </div>
                  </div>
                  <p className="text-[#8a8380] text-xs leading-relaxed landing-xs:mb-0 landing-md:mb-4">
                    Enable agents to invoke functions and interact with systems.
                  </p>
                </div>
              </div>

              <div className="relative">
                <div
                  style={{ borderWidth: "1px" }}
                  className={`landing-xs:p-3 rounded-lg border border-solid ${
                    selectedFeature === "api"
                      ? "border-[#5c5855] bg-[#1a1a1a]"
                      : "border-[#3d3a39] bg-[#101010] hover:border-[#5c5855] hover:bg-[#1a1a1a]"
                  } transition-colors duration-300 cursor-pointer`}
                  onClick={() => handleFeatureClick("api")}
                >
                  <div className="flex landing-xs:flex-row landing-md:flex-col landing-xs:items-center landing-md:items-start gap-2 mb-2">
                    <div className="bg-[#b8b3b0]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center">
                      <WindowIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#b8b3b0]" />
                    </div>
                    <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Unified API
                    </div>
                  </div>
                  <p className="text-[#8a8380] text-xs leading-relaxed landing-xs:mb-0 landing-md:mb-4">
                    Seamlessly switch between different AI providers with a simple code update.
                  </p>
                </div>
              </div>

              {/* Feature 3 - Prompt */}
              <div className="relative">
                <div
                  style={{ borderWidth: "1px" }}
                  className={`landing-xs:p-3 rounded-lg border border-solid ${
                    selectedFeature === "prompt"
                      ? "border-[#5c5855] bg-[#1a1a1a]"
                      : "border-[#3d3a39] bg-[#101010] hover:border-[#5c5855] hover:bg-[#1a1a1a]"
                  } transition-colors duration-300 cursor-pointer`}
                  onClick={() => handleFeatureClick("prompt")}
                >
                  <div className="flex landing-xs:flex-row landing-md:flex-col landing-xs:items-center landing-md:items-start gap-2 mb-2">
                    <div className="bg-[#b8b3b0]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center">
                      <CommandLineIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#b8b3b0]" />
                    </div>
                    <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Dynamic Prompting
                    </div>
                  </div>
                  <p className="text-[#8a8380] text-xs leading-relaxed landing-xs:mb-0 landing-md:mb-4">
                    Experiment, fine-tune, and iterate your AI prompts in an integrated environment.
                  </p>
                </div>
              </div>

              {/* Feature 2 - Memory */}
              <div className="relative">
                <div
                  style={{ borderWidth: "1px" }}
                  className={`landing-xs:p-3 rounded-lg border border-solid ${
                    selectedFeature === "memory"
                      ? "border-[#5c5855] bg-[#1a1a1a]"
                      : "border-[#3d3a39] bg-[#101010] hover:border-[#5c5855] hover:bg-[#1a1a1a]"
                  } transition-colors duration-300 cursor-pointer`}
                  onClick={() => handleFeatureClick("memory")}
                >
                  <div className="flex landing-xs:flex-row landing-md:flex-col landing-xs:items-center landing-md:items-start gap-2 mb-2">
                    <div className="bg-[#b8b3b0]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center">
                      <CircleStackIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#b8b3b0]" />
                    </div>
                    <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Persistent Memory
                    </div>
                  </div>
                  <p className="text-[#8a8380] text-xs leading-relaxed landing-xs:mb-0 landing-md:mb-4">
                    Store and recall interactions to enhance your agents intelligence and context.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
