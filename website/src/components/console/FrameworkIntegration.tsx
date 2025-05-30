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
        <VoltAgentLogo className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
      ),
      tooltip: "VoltAgent",
      isComingSoon: false,
    },
    {
      logo: <PythonLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Python SDK",
      isComingSoon: false,
    },
    {
      logo: <TypeScriptLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "TypeScript SDK",
      isComingSoon: false,
    },
    {
      logo: <VercelLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Vercel AI SDK",
      isComingSoon: false,
    },
    {
      logo: <OpenTelemetryLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "OpenTelemetry",
      isComingSoon: false,
    },
    {
      logo: <OllamaLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Ollama",
      isComingSoon: false,
    },
    {
      logo: <SemanticKernelLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Semantic Kernel",
      isComingSoon: false,
    },
    {
      logo: <LangflowLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Langflow",
      isComingSoon: true,
    },
    {
      logo: <DifyLogo className="w-10 h-10 sm:w-10 sm:h-10" />,
      tooltip: "Dify",
      isComingSoon: true,
    },
    {
      logo: <AutogenLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Autogen",
      isComingSoon: true,
    },
    {
      logo: <CrewAILogo className="w-10 h-10 sm:w-14 sm:h-14" />,
      tooltip: "CrewAI",
      isComingSoon: true,
    },
    {
      logo: <LangChainLogo className="w-10 h-10 sm:w-14 sm:h-14" />,
      tooltip: "LangChain",
      isComingSoon: true,
    },
    {
      logo: <LlamaIndexLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "LlamaIndex",
      isComingSoon: true,
    },
    {
      logo: <PydanticLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Pydantic",
      isComingSoon: true,
    },
    {
      logo: <SmoleAgentsLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-12 sm:mb-24">
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

      <div className="text-left mb-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl text-emerald-400 font-bold mb-4">
          Easy Integration with Any Framework & Vanilla JS/Python
        </h2>
        <p className="text-gray-400 max-w-3xl text-sm sm:text-base md:text-lg mb-8">
          Connect your existing AI agents to the console with minimal setup.
        </p>
      </div>

      {/* Sliding Integration Icons */}
      <div className="relative mb-8">
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
            className={`flex space-x-6 sm:space-x-8 py-4 scroll-left-animation ${
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
                  className={`bg-gray-900/50 w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center rounded-md border-solid border-gray-800/40 transition-all duration-200 mb-2 relative ${
                    item.isComingSoon ? "" : "hover:border-main-emerald"
                  }`}
                >
                  {/* Logo */}
                  <div className={item.isComingSoon ? "opacity-50" : ""}>
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
                      {item.logo}
                    </div>
                  </div>

                  {/* Soon Badge - Absolute positioned at top-right corner */}
                  {item.isComingSoon && (
                    <div className="absolute -top-3 -right-5 px-2 sm:px-3 py-1 sm:py-1.5 z-12 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 text-xs sm:text-sm rounded transition-colors cursor-pointer hover:bg-emerald-400/20">
                      Soon
                    </div>
                  )}
                </div>

                {/* Tool Name */}
                <div className="text-center">
                  <span
                    className={`text-xs sm:text-sm font-medium ${
                      item.isComingSoon ? "text-gray-500" : "text-white"
                    }`}
                  >
                    {item.tooltip}
                  </span>
                </div>

                {/* Hover Tooltip */}
                <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity duration-200 -top-12 left-1/2 transform -translate-x-1/2 bg-gray-800 text-emerald-400 text-xs px-2 py-1 rounded-md whitespace-nowrap z-20 shadow-lg">
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
