import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ListBulletIcon,
  EyeIcon,
  CommandLineIcon,
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { DotPattern } from "../ui/dot-pattern";

import { useMediaQuery } from "@site/src/hooks/use-media-query";
import AgentListView from "./AgentListView";
import AgentDetailView from "./AgentDetailView";
import AgentChat from "./AgentChat";
import FlowOverview from "./FlowOverview";
import Link from "@docusaurus/Link";

import { HowToGetStarted } from "./HowToGetStarted";
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
} from "../../../static/img/logos/integrations";

export const Console = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [isAnimationPaused, setIsAnimationPaused] = useState(false);

  const getResponsiveText = (mobileText: string, desktopText: string) => {
    return isMobile ? mobileText : desktopText;
  };

  // Integration logos for sliding animation
  const integrationLogos = [
    {
      logo: <VercelLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Vercel",
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
      isComingSoon: false,
    },
    {
      logo: <DifyLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Dify",
      isComingSoon: false,
    },
    {
      logo: <AutogenLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Autogen",
      isComingSoon: false,
    },
    {
      logo: <CrewAILogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "CrewAI",
      isComingSoon: false,
    },
    {
      logo: <LangChainLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "LangChain",
      isComingSoon: false,
    },
    {
      logo: <LlamaIndexLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "LlamaIndex",
      isComingSoon: false,
    },
    {
      logo: <OpenTelemetryLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "OpenTelemetry",
      isComingSoon: false,
    },
    {
      logo: <PydanticLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "Pydantic",
      isComingSoon: false,
    },
    {
      logo: <SmoleAgentsLogo className="w-10 h-10 sm:w-12 sm:h-12" />,
      tooltip: "SmoleAgents",
      isComingSoon: false,
    },
  ];

  // Duplicate logos for continuous scrolling
  const duplicatedLogos = [
    ...integrationLogos,
    ...integrationLogos,
    ...integrationLogos,
  ];

  return (
    <section className="relative w-full overflow-hidden py-12 sm:py-16 md:py-20">
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
      <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 landing-xs:mb-8 sm:mb-12 landing-md:mb-24">
        {/* Header Section - Responsive */}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 landing-sm:gap-8 mb-12 sm:mb-24 items-center">
          <div className="flex flex-col items-center relative">
            <div className="flex items-baseline justify-start">
              <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
                <BoltIcon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-[#00d992]" />
              </div>
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#00d992]">
                voltagent
              </span>
              <div className="relative">
                <span className="ml-2 text-lg sm:text-xl md:text-2xl font-medium text-gray-400">
                  Console
                </span>
              </div>
            </div>
            <p className="mt-2 text-center self-center text-gray-400 text-xs sm:text-sm">
              Monitor, debug, and improve AI agents from any framework
            </p>
          </div>

          <div className="relative mt-6 lg:mt-0">
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-left md:ml-8"
            >
              <p className="text-sm sm:text-base md:text-lg text-[#dcdcdc] mb-4">
                <Link
                  to="https://voltagent.dev/docs/observability/developer-console/"
                  className="text-[#00d992] no-underline font-bold"
                >
                  The Universal Developer Console
                </Link>{" "}
                gives you full visibility into AI agents from any framework
                during development and execution.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-gray-400">
                Real-time visualization of your agent's execution flow,
                including function calls, tool usage, and message history -
                regardless of which framework you use.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Framework Integration Examples */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-12 sm:mb-24">
        <div className="text-left mb-8">
          <h2 className="text-xl sm:text-2xl md:text-3xl text-orange-500 font-bold mb-4">
            Easy Integration with Any Framework & Vanilla JS/Python
          </h2>
          <p className="text-gray-400 max-w-3xl text-sm sm:text-base md:text-lg mb-8">
            Connect your existing AI agents to the console with minimal setup.
            Universal compatibility means you're never locked into a specific
            technology stack.
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

      {/* How to Get Started Section */}
      <HowToGetStarted />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-8 sm:mb-16">
        <div className="text-left">
          <h2 className="text-xl sm:text-2xl md:text-3xl text-emerald-500 font-bold mb-4">
            AI Agent Observability Matters
          </h2>
          <p className="text-gray-400 max-w-3xl text-sm sm:text-base md:text-lg mb-4">
            As the number of AI agents in your system grows, maintaining
            visibility becomes increasingly critical. Without proper
            observability, debugging and managing agent behavior becomes
            overwhelming.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-4 sm:gap-6">
          <div className="flex flex-col gap-4 sm:gap-6">
            {/* Connection Management Card */}
            <motion.div
              className="rounded-md border-2 border-solid border-emerald-500 transition-all duration-300 overflow-hidden h-auto"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <div
                className="p-3 sm:p-4 border-b border-white/10 bg-[#191c24]"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-emerald-400/10 w-6 h-6 sm:w-8 sm:h-8 landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0">
                    <ArrowPathIcon className="w-3 h-3 sm:w-4 sm:h-4 landing-md:w-5 landing-md:h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-xs sm:text-sm landing-lg:text-base font-semibold text-white">
                      Any Framework, Any Agent
                    </div>
                    <p className="text-gray-400 text-xs landing-lg:text-sm mb-0 leading-relaxed">
                      {getResponsiveText(
                        "Visualize and debug AI agents from any framework in real-time.",
                        "Visualize and debug AI agents from any framework in real-time.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <FlowOverview />
              </div>
            </motion.div>

            {/* Message Inspector Card */}
            <motion.div
              className="rounded-md border-2 border-solid transition-all duration-300 overflow-hidden h-auto"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div
                className="p-3 sm:p-4 border-b border-white/10 bg-[#191c24]"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-emerald-400/10 w-6 h-6 sm:w-8 sm:h-8 landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0">
                    <CommandLineIcon className="w-3 h-3 sm:w-4 sm:h-4 landing-md:w-5 landing-md:h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-xs sm:text-sm landing-lg:text-base font-semibold text-white">
                      Universal Agent Communication
                    </div>
                    <p className="text-gray-400 text-xs landing-lg:text-sm mb-0 leading-relaxed">
                      {getResponsiveText(
                        "Chat with AI agents from any framework in real-time.",
                        "Chat with AI agents from any framework, with metrics and insights.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <AgentChat />
              </div>
            </motion.div>
          </div>

          <div className="flex flex-col gap-4 sm:gap-6 mt-4 sm:mt-0">
            {/* Agent Detail View Card */}
            <motion.div
              className="rounded-md border-2 border-solid transition-all duration-300 overflow-hidden h-auto"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <div
                className="p-3 sm:p-4 border-b border-white/10 bg-[#191c24]"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-emerald-400/10 w-6 h-6 sm:w-8 sm:h-8 landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0">
                    <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4 landing-md:w-5 landing-md:h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-xs sm:text-sm landing-lg:text-base font-semibold text-white">
                      Framework-Independent Monitoring
                    </div>
                    <p className="text-gray-400 text-xs landing-lg:text-sm mb-0 leading-relaxed">
                      {getResponsiveText(
                        "View detailed inputs, outputs, and parameters regardless of framework.",
                        "Inputs, outputs, and parameters for any agent, memory, and tool call.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <AgentDetailView />
              </div>
            </motion.div>

            {/* Agent List View Card */}
            <motion.div
              className="rounded-md border-2 border-solid   transition-all duration-300 overflow-hidden h-auto"
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div
                className="p-3 sm:p-4 border-b border-white/10 bg-[#191c24]"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="bg-emerald-400/10 w-6 h-6 sm:w-8 sm:h-8 landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0">
                    <ListBulletIcon className="w-3 h-3 sm:w-4 sm:h-4 landing-md:w-5 landing-md:h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 text-xs sm:text-sm landing-lg:text-base font-semibold text-white">
                      Agent List View
                    </div>
                    <p className="text-gray-400 text-xs landing-lg:text-sm mb-0 leading-relaxed">
                      {getResponsiveText(
                        "View active and completed agent sessions.",
                        "Displays a list of active or recent agent sessions for quick overview.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <AgentListView />
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Console;
