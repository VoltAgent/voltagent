import React from "react";
import { motion } from "framer-motion";
import {
  ListBulletIcon,
  EyeIcon,
  CommandLineIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import AgentListView from "./AgentListView";
import AgentDetailView from "./AgentDetailView";
import AgentChat from "./AgentChat";
import FlowOverview from "./FlowOverview";

const ObservabilityFeatures = () => {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const getResponsiveText = (mobileText: string, desktopText: string) => {
    return isMobile ? mobileText : desktopText;
  };

  return (
    <>
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
              className="rounded-md border-2 border-solid transition-all duration-300 overflow-hidden h-auto"
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
    </>
  );
};

export default ObservabilityFeatures;
