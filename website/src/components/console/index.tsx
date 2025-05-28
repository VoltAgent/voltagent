import React from "react";
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
import {
  LangChainLogo,
  AutoGenLogo,
  CrewAILogo,
  AutoGPTLogo,
} from "@site/static/img/logos";

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
                Universal AI Agent
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
                during development and execution. Works with VoltAgent,
                LangChain, AutoGen, CrewAI, and more.
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
          <h2 className="text-xl sm:text-2xl md:text-3xl text-emerald-500 font-bold mb-4">
            Easy Integration with Any Framework
          </h2>
          <p className="text-gray-400 max-w-3xl text-sm sm:text-base md:text-lg mb-8">
            Connect your existing AI agents to the console with minimal setup.
            Works seamlessly with all major frameworks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* LangChain */}
          <motion.div
            className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center hover:border-emerald-400/50 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="flex justify-center mb-4">
              <div className="bg-emerald-400/10 p-3 rounded-lg">
                <LangChainLogo className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">LangChain</h3>
            <p className="text-gray-400 text-sm">
              Monitor your LangChain agents with full observability
            </p>
          </motion.div>

          {/* AutoGen */}
          <motion.div
            className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center hover:border-emerald-400/50 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex justify-center mb-4">
              <div className="bg-emerald-400/10 p-3 rounded-lg">
                <AutoGenLogo className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">AutoGen</h3>
            <p className="text-gray-400 text-sm">
              Debug multi-agent conversations and workflows
            </p>
          </motion.div>

          {/* CrewAI */}
          <motion.div
            className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center hover:border-emerald-400/50 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="flex justify-center mb-4">
              <div className="bg-emerald-400/10 p-3 rounded-lg">
                <CrewAILogo className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">CrewAI</h3>
            <p className="text-gray-400 text-sm">
              Visualize CrewAI team workflows and tasks
            </p>
          </motion.div>

          {/* VoltAgent */}
          <motion.div
            className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 text-center hover:border-emerald-400/50 transition-colors"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="flex justify-center mb-4">
              <div className="bg-emerald-400/10 p-3 rounded-lg">
                <BoltIcon className="w-8 h-8 text-emerald-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">VoltAgent</h3>
            <p className="text-gray-400 text-sm">
              Built-in console integration out of the box
            </p>
          </motion.div>
        </div>

        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Learn more about integrations in our{" "}
            <Link
              to="https://voltagent.dev/docs/observability/developer-console/"
              className="text-emerald-400 no-underline hover:underline"
            >
              documentation
            </Link>
          </p>
        </div>
      </div>

      {/* How to Use Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-12 sm:mb-24">
        <div className="text-left mb-12">
          <h2 className="text-xl sm:text-2xl md:text-3xl text-emerald-500 font-bold mb-4">
            How to Get Started
          </h2>
          <p className="text-gray-400 max-w-3xl text-sm sm:text-base md:text-lg">
            Get up and running with universal AI agent observability in just 3
            simple steps
          </p>
        </div>

        <div className="relative">
          {/* Connection Lines - Hidden on mobile */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-400/20 via-emerald-400/40 to-emerald-400/20 transform -translate-y-1/2 z-0" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
            {/* Step 1: Build Your LLM App - Framework Focus */}
            <motion.div
              className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center hover:border-emerald-400/50 transition-all duration-300 relative min-h-[400px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Step Number */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold">
                1
              </div>

              <h3 className="text-2xl font-bold text-white mb-4 mt-4">
                Build Your LLM App
              </h3>
              <p className="text-gray-400 text-base mb-6">
                Create your AI agent using any framework you prefer. Universal
                compatibility means you're never locked in.
              </p>

              {/* Framework Showcase - Prominent */}
              <div className="space-y-4">
                <div className="flex flex-col gap-4">
                  <div className="flex justify-center">
                    <BoltIcon className="w-8 h-8 text-emerald-400" />
                    <h4 className="text-white font-semibold text-lg mb-2">
                      VoltAgent
                    </h4>
                  </div>

                  <div className="flex justify-center">
                    <LangChainLogo className="w-8 h-8 text-emerald-400" />
                    <h4 className="text-white font-semibold text-lg mb-2">
                      LangChain
                    </h4>
                  </div>

                  <div className="flex justify-center">
                    <AutoGenLogo className="w-8 h-8 text-emerald-400" />
                    <h4 className="text-white font-semibold text-lg mb-2">
                      AutoGen
                    </h4>
                  </div>

                  <div className="flex justify-center">
                    <CrewAILogo className="w-8 h-8 text-emerald-400" />
                    <h4 className="text-white font-semibold text-lg mb-2">
                      CrewAI
                    </h4>
                  </div>
                  <div className="flex justify-center">
                    <CrewAILogo className="w-8 h-8 text-emerald-400" />
                    <h4 className="text-white font-semibold text-lg mb-2">
                      Vercel AI SDK
                    </h4>
                  </div>
                  <div className="flex justify-center">
                    <BoltIcon className="w-8 h-8 text-emerald-400" />
                    <h4 className="text-white font-semibold text-lg mb-2">
                      Python
                    </h4>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 2: Implement Connector - Code Focus */}
            <motion.div
              className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center hover:border-emerald-400/50 transition-all duration-300 relative min-h-[400px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Step Number */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold">
                2
              </div>

              <h3 className="text-2xl font-bold text-white mb-4 mt-4">
                Implement Connector
              </h3>
              <p className="text-gray-400 text-base mb-6">
                Add just a few lines of code to connect your agent to the
                console. Simple integration for any framework.
              </p>

              {/* Code Examples */}
              <div className="space-y-4 text-left">
                <div className="bg-gray-800/70 rounded-lg border border-gray-600">
                  <pre className="text-sm text-gray-300 font-mono overflow-x-auto">
                    <code>{`import { VoltConsole } from '@voltagent/console';

// Connect any agent
VoltConsole.monitor(yourAgent);`}</code>
                  </pre>
                </div>
              </div>

              <div className="mt-6">
                <span className="text-emerald-400 text-sm font-medium">
                  ✨ Works with existing code - no refactoring needed
                </span>
              </div>
            </motion.div>

            {/* Step 3: Launch Dev Console - Screenshot Focus */}
            <motion.div
              className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-center hover:border-emerald-400/50 transition-all duration-300 relative min-h-[400px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              {/* Step Number */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold">
                3
              </div>

              <h3 className="text-2xl font-bold text-white mb-4 mt-4">
                Launch Dev Console
              </h3>
              <p className="text-gray-400 text-base mb-6">
                Start observing your AI agents in real-time. Get full visibility
                into every interaction, decision, and execution step.
              </p>

              {/* Console Preview */}
              <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-600 mb-6">
                <AgentDetailView />
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-emerald-400/10 text-emerald-400 px-3 py-2 rounded-lg">
                  <div className="font-semibold">Real-time</div>
                  <div className="text-xs text-gray-400">Live monitoring</div>
                </div>
                <div className="bg-emerald-400/10 text-emerald-400 px-3 py-2 rounded-lg">
                  <div className="font-semibold">Debug</div>
                  <div className="text-xs text-gray-400">Step-by-step</div>
                </div>
                <div className="bg-emerald-400/10 text-emerald-400 px-3 py-2 rounded-lg">
                  <div className="font-semibold">Monitor</div>
                  <div className="text-xs text-gray-400">Performance</div>
                </div>
                <div className="bg-emerald-400/10 text-emerald-400 px-3 py-2 rounded-lg">
                  <div className="font-semibold">Optimize</div>
                  <div className="text-xs text-gray-400">Improve agents</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="h-[400px] sm:h-[500px] md:h-[600px] lg:h-[800px] px-4 sm:px-6 lg:px-8">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6  mt-6">
        <Link
          to="https://console.voltagent.dev/demo"
          className="inline-flex items-center no-underline  w-full  bg-emerald-400/10 mb-12 sm:mb-24 text-emerald-400 
          border-solid border border-emerald-400/20 text-base sm:text-lg font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20 w-full justify-center"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            backdropFilter: "blur(4px)",
            WebkitBackdropFilter: "blur(4px)",
          }}
        >
          <div className="flex items-center justify-center px-4 py-3 sm:py-4   ">
            <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 animate-pulse" />
            <span className="text-xs sm:text-base">See Console Live Demo</span>
            <ArrowTopRightOnSquareIcon
              className="hidden sm:inline-block w-5 h-5 ml-2 mb-1"
              aria-hidden="true"
            />
          </div>
        </Link>
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
