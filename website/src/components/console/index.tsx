import React from "react";
import { motion } from "framer-motion";
import {
  ListBulletIcon,
  EyeIcon,
  CommandLineIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { DotPattern } from "../ui/dot-pattern";

import { useMediaQuery } from "@site/src/hooks/use-media-query";
import AgentListView from "./AgentListView";
import AgentDetailView from "./AgentDetailView";
import AgentChat from "./AgentChat";
import FlowOverview from "./FlowOverview";

export const Console = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const getResponsiveText = (mobileText: string, desktopText: string) => {
    return isMobile ? mobileText : desktopText;
  };

  return (
    <section className="relative w-full overflow-hidden py-12 sm:py-16 md:py-20">
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
              Monitor, debug, and improve your AI agents
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
                The VoltAgent Developer Console gives you full visibility into
                your Voltagent-based AI agents during development and execution.
              </p>
              <p className="text-sm sm:text-base md:text-lg text-gray-400">
                <span className="text-[#00d992] font-bold text-base sm:text-lg">
                  Real-time visualization
                </span>{" "}
                of your agent's execution flow, including function calls, tool
                usage, and message history as it happens.
              </p>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="h-[400px] sm:h-[500px] md:h-[600px] lg:h-[800px] mb-12 sm:mb-24 px-4 sm:px-6 lg:px-8">
        <iframe
          src="https://console.voltagent.dev/demo"
          title="Voltage Agent Console"
          className="w-full h-full"
          style={{
            height: "100%",
            border: "2px solid #2c3335",
            borderRadius: "6px",
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        />
      </div>

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
              className="rounded-lg border-2 border-solid border-emerald-500 transition-all duration-300 overflow-hidden h-auto"
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
                      Real-Time Agent Visualization
                    </div>
                    <p className="text-gray-400 text-xs landing-lg:text-sm mb-0 leading-relaxed">
                      {getResponsiveText(
                        "Visualize and debug your AI agent's execution flow in real-time.",
                        "Visualize and debug your AI agent's execution flow in real-time.",
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
              className="rounded-lg border-2 border-solid transition-all duration-300 overflow-hidden h-auto"
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
                      Agent Chat
                    </div>
                    <p className="text-gray-400 text-xs landing-lg:text-sm mb-0 leading-relaxed">
                      {getResponsiveText(
                        "Chat with your AI agents in real-time.",
                        "Chat with your AI agents in real-time, with metrics and insights.",
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
              className="rounded-lg border-2 border-solid transition-all duration-300 overflow-hidden h-auto"
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
                      Granular Visibility into Agent Runs
                    </div>
                    <p className="text-gray-400 text-xs landing-lg:text-sm mb-0 leading-relaxed">
                      {getResponsiveText(
                        "View detailed inputs, outputs, and parameters for each agent, memory, and tool call.",
                        "Inputs, outputs, and parameters for agent, memory, and tool call.",
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
              className="rounded-lg border-2 border-solid   transition-all duration-300 overflow-hidden h-auto"
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
