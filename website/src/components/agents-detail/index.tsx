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
    "api",
  );

  // Handler for feature card clicks
  const handleFeatureClick = (featureType: "api" | "memory" | "prompt" | "tools") => {
    setSelectedFeature(featureType);
  };

  return (
    <div className=" text-white   relative w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 landing-xs:mb-16 landing-md:mb-36">
        {/* Header - Left aligned */}
        <div className="mb-8 text-left max-w-xl">
          <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold  text-main-emerald tracking-wide uppercase">
            Enterprise-level AI agents
          </h2>
          <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
            Complete toolkit for enterprise level AI agents
          </p>
          <p className="max-w-3xl  landing-md:text-xl  landing-xs:text-md text-gray-400">
            Design production-ready agents with unified APIs, tools, and memory.
          </p>
        </div>

        {/* Two column layout for code and features */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Code Example - Left column */}
          <div className="lg:w-1/2 h-full order-2 lg:order-2">
            <CodeExample featureType={selectedFeature} />
          </div>

          {/* Features Section - Right column */}
          <div className="lg:w-1/2 order-1 lg:order-1">
            <div className="grid grid-cols-2 gap-4 h-full">
              {/* Feature 1 - API */}

              {/* Feature 4 - Tools */}
              <div className="relative">
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                <div
                  className={`landing-xs:p-3  rounded-lg ${
                    selectedFeature === "tools"
                      ? "border border-solid border-[#00d992]/50 bg-white/10"
                      : "border border-solid border-white/10 hover:border-[#00d992]/50 hover:bg-white/10"
                  } transition-all duration-300 cursor-pointer`}
                  onClick={() => handleFeatureClick("tools")}
                >
                  <div className="flex landing-xs:flex-row landing-md:flex-col landing-xs:items-center landing-md:items-start gap-2 mb-2">
                    <div className="bg-[#00d992]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center">
                      <WrenchIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#00d992]" />
                    </div>
                    <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Tool calling
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed landing-xs:mb-0 landing-md:mb-4">
                    Enable agents to invoke functions, interact with systems, and perform actions.
                  </p>
                </div>
              </div>

              <div className="relative">
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                <div
                  className={`landing-xs:p-3  rounded-lg ${
                    selectedFeature === "api"
                      ? "border border-solid border-[#00d992]/50 bg-white/10"
                      : "border border-solid border-white/10 hover:border-[#00d992]/50 hover:bg-white/10"
                  } transition-all duration-300 cursor-pointer`}
                  onClick={() => handleFeatureClick("api")}
                >
                  <div className="flex landing-xs:flex-row landing-md:flex-col landing-xs:items-center landing-md:items-start gap-2 mb-2">
                    <div className="bg-[#00d992]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center">
                      <WindowIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#00d992]" />
                    </div>
                    <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Unified API
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed landing-xs:mb-0 landing-md:mb-4">
                    Seamlessly switch between different AI providers with a simple code update.
                  </p>
                </div>
              </div>

              {/* Feature 3 - Prompt */}
              <div className="relative">
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                <div
                  className={`landing-xs:p-3  rounded-lg ${
                    selectedFeature === "prompt"
                      ? "border border-solid border-[#00d992]/50 bg-white/10"
                      : "border border-solid border-white/10 hover:border-[#00d992]/50 hover:bg-white/10"
                  } transition-all duration-300 cursor-pointer`}
                  onClick={() => handleFeatureClick("prompt")}
                >
                  <div className="flex landing-xs:flex-row landing-md:flex-col landing-xs:items-center landing-md:items-start gap-2 mb-2">
                    <div className="bg-[#00d992]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center">
                      <CommandLineIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#00d992]" />
                    </div>
                    <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Dynamic Prompting
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed landing-xs:mb-0 landing-md:mb-4">
                    Experiment, fine-tune, and iterate your AI prompts in an integrated environment.
                  </p>
                </div>
              </div>

              {/* Feature 2 - Memory */}
              <div className="relative">
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: ignore */}
                <div
                  className={`landing-xs:p-3  rounded-lg ${
                    selectedFeature === "memory"
                      ? "border border-solid border-[#00d992]/50 bg-white/10"
                      : "border border-solid border-white/10 hover:border-[#00d992]/50 hover:bg-white/10"
                  } transition-all duration-300 cursor-pointer`}
                  onClick={() => handleFeatureClick("memory")}
                >
                  <div className="flex landing-xs:flex-row landing-md:flex-col landing-xs:items-center landing-md:items-start gap-2 mb-2">
                    <div className="bg-[#00d992]/10 landing-xs:hidden landing-md:flex landing-md:w-8 landing-lg:w-10 landing-md:h-8 landing-lg:h-10 rounded-md items-center justify-center">
                      <CircleStackIcon className="landing-md:w-4 landing-lg:w-5 landing-md:h-4 landing-lg:h-5 text-[#00d992]" />
                    </div>
                    <div className="landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Persistent Memory
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed landing-xs:mb-0 landing-md:mb-4">
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
