import React, { useState } from "react";
import {
  VercelLogo,
  OllamaLogo,
  SemanticKernelLogo,
  LangflowLogo,
  DifyLogo,
  AutogenLogo,
  CrewAILogo,
  LangChainLogo,
  LlamaIndexLogo,
  OpenTelemetryLogo,
  PydanticLogo,
  SmoleAgentsLogo,
  VoltAgentLogo,
} from "../../../static/img/logos/integrations";

import { PythonLogo, TypeScriptLogo } from "../../../static/img/logos";

const FrameworkIntegration = () => {
  const [isAnimationPaused, setIsAnimationPaused] = useState(false);

  // Integration logos for sliding animation
  const integrationLogos = [
    {
      logo: (
        <VoltAgentLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12 text-emerald-400" />
      ),
      tooltip: "VoltAgent",
      isComingSoon: false,
    },
    {
      logo: (
        <PythonLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "Python SDK",
      isComingSoon: false,
    },
    {
      logo: (
        <TypeScriptLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "TypeScript SDK",
      isComingSoon: false,
    },
    {
      logo: (
        <VercelLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "Vercel AI SDK",
      isComingSoon: false,
    },
    {
      logo: (
        <OpenTelemetryLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "OpenTelemetry",
      isComingSoon: false,
    },
    {
      logo: (
        <OllamaLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "Ollama",
      isComingSoon: true,
    },
    {
      logo: (
        <SemanticKernelLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "Semantic Kernel",
      isComingSoon: true,
    },
    {
      logo: (
        <LangflowLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "Langflow",
      isComingSoon: true,
    },
    {
      logo: (
        <DifyLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10" />
      ),
      tooltip: "Dify",
      isComingSoon: true,
    },
    {
      logo: (
        <AutogenLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "Autogen",
      isComingSoon: true,
    },
    {
      logo: (
        <CrewAILogo className="w-8 h-8 landing-xs:w-7 landing-xs:h-7 landing-sm:w-10 landing-sm:h-10 landing-md:w-12 landing-md:h-12 landing-lg:w-14 landing-lg:h-14" />
      ),
      tooltip: "CrewAI",
      isComingSoon: true,
    },
    {
      logo: (
        <LangChainLogo className="w-8 h-8 landing-xs:w-7 landing-xs:h-7 landing-sm:w-10 landing-sm:h-10 landing-md:w-12 landing-md:h-12 landing-lg:w-14 landing-lg:h-14" />
      ),
      tooltip: "LangChain",
      isComingSoon: true,
    },
    {
      logo: (
        <LlamaIndexLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "LlamaIndex",
      isComingSoon: true,
    },
    {
      logo: (
        <PydanticLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "Pydantic",
      isComingSoon: true,
    },
    {
      logo: (
        <SmoleAgentsLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12" />
      ),
      tooltip: "SmoleAgents",
      isComingSoon: true,
    },
  ];

  // Duplicate logos for continuous scrolling
  const duplicatedLogos = [
    ...integrationLogos,
    ...integrationLogos,
    ...integrationLogos,
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 landing-xs:px-3 landing-sm:px-6 mb-8 landing-xs:mb-6 landing-sm:mb-12 landing-md:mb-16 landing-lg:mb-24">
      <style>{`
        @keyframes scrollLeft {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.33%);
          }
        }

        .scroll-left-animation {
          animation: scrollLeft 25s linear infinite;
        }

        .animation-paused {
          animation-play-state: paused;
        }
      `}</style>

      <div className="text-left mb-6 landing-xs:mb-4 landing-sm:mb-8 landing-md:mb-10">
        <h2 className="text-lg landing-xs:text-base landing-sm:text-xl landing-md:text-2xl landing-lg:text-3xl text-emerald-400 font-bold mb-3 landing-xs:mb-2 landing-sm:mb-4">
          Easy Integration with Any Framework & Vanilla JS/Python
        </h2>
        <p className="text-gray-400 max-w-3xl text-sm landing-xs:text-xs landing-sm:text-base landing-md:text-lg mb-6 landing-xs:mb-4 landing-sm:mb-8">
          Connect your existing AI agents to the console with minimal setup.
        </p>
      </div>

      {/* Sliding Integration Icons */}
      <div className="relative mb-6 landing-xs:mb-4 landing-sm:mb-8">
        <div
          className="flex overflow-hidden"
          style={{
            maxWidth: "100%",
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
            WebkitMaskImage:
              "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
            maskImage:
              "linear-gradient(90deg, transparent 0%, black 5%, black 95%, transparent 100%)",
          }}
        >
          <div
            className={`flex space-x-4 landing-xs:space-x-3 landing-sm:space-x-6 landing-md:space-x-8 py-3 landing-xs:py-2 landing-sm:py-4 scroll-left-animation ${
              isAnimationPaused ? "animation-paused" : ""
            }`}
          >
            {duplicatedLogos.map((item, index) => (
              <div
                key={`integration-logo-${item.tooltip}-${index}`}
                className="group relative flex-shrink-0 flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                onMouseEnter={() => setIsAnimationPaused(true)}
                onMouseLeave={() => setIsAnimationPaused(false)}
              >
                {/* Icon Container */}
                <div
                  className={`bg-gray-900/50 w-16 h-16 landing-xs:w-14 landing-xs:h-14 landing-sm:w-18 landing-sm:h-18 landing-md:w-20 landing-md:h-20 landing-lg:w-24 landing-lg:h-24 flex items-center justify-center rounded-md border-solid border-gray-800/40 transition-all duration-200 mb-1.5 landing-xs:mb-1 landing-sm:mb-2 relative ${
                    item.isComingSoon ? "" : "hover:border-main-emerald"
                  }`}
                >
                  {/* Logo */}
                  <div className={item.isComingSoon ? "opacity-50" : ""}>
                    <div className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 landing-lg:w-12 landing-lg:h-12 flex items-center justify-center">
                      {item.logo}
                    </div>
                  </div>

                  {/* Soon Badge - Absolute positioned at top-right corner */}
                  {item.isComingSoon && (
                    <div className="absolute -top-2 landing-xs:-top-1.5 landing-sm:-top-3 -right-3 landing-xs:-right-2 landing-sm:-right-4 landing-md:-right-5 px-1.5 landing-xs:px-1 landing-sm:px-2 landing-md:px-3 py-0.5 landing-xs:py-0.5 landing-sm:py-1 landing-md:py-1.5 z-12 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-xs landing-xs:text-xs landing-sm:text-sm rounded transition-colors cursor-pointer hover:bg-emerald-400/20">
                      Soon
                    </div>
                  )}
                </div>

                {/* Tool Name */}
                <div className="text-center">
                  <span
                    className={`text-xs landing-xs:text-xs landing-sm:text-sm landing-md:text-base font-medium ${
                      item.isComingSoon ? "text-gray-500" : "text-white"
                    }`}
                  >
                    {item.tooltip}
                  </span>
                </div>

                {/* Hover Tooltip */}
                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 -top-10 landing-xs:-top-8 landing-sm:-top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-emerald-400 text-xs px-2 py-1 rounded-md whitespace-nowrap z-20 shadow-lg">
                  {item.isComingSoon
                    ? `${item.tooltip} (Coming Soon)`
                    : `Available: ${item.tooltip}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameworkIntegration;
