import React from "react";
import { motion } from "framer-motion";
import { BoltIcon } from "@heroicons/react/24/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import Link from "@docusaurus/Link";
import { LangChainLogo, AutoGenLogo, CrewAILogo } from "@site/static/img/logos";

export const HowToGetStarted = () => {
  return (
    <>
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

          {/* Steps 1 and 2 - Side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            {/* Step 1: Build Your LLM App - Framework Focus */}
            <motion.div
              className=" border-solid border-gray-800/50  rounded-md text-center hover:border-emerald-400/50 transition-all duration-300 relative min-h-[400px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Header Section */}
              <div className="bg-[#191c24] rounded-t-md  p-4 pt-8 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xl font-semibold text-white ">
                    Build Your LLM App
                  </span>
                  <div className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-colors cursor-pointer hover:bg-emerald-400/20">
                    1
                  </div>
                </div>

                <p className="text-gray-400 text-base mb-0">
                  Create your AI agent using any framework you prefer. Universal
                  compatibility means you're never locked in.
                </p>
              </div>

              {/* Content Section */}
              <div className="p-4">
                {/* Framework Showcase - Prominent */}
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-6">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <BoltIcon className="w-10 h-10 text-emerald-400" />
                      <h4 className="text-white font-semibold text-base">
                        VoltAgent
                      </h4>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-3">
                      <LangChainLogo className="w-10 h-10 text-emerald-400" />
                      <h4 className="text-white font-semibold text-base">
                        LangChain
                      </h4>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-3">
                      <AutoGenLogo className="w-10 h-10 text-emerald-400" />
                      <h4 className="text-white font-semibold text-base">
                        AutoGen
                      </h4>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-3">
                      <CrewAILogo className="w-10 h-10 text-emerald-400" />
                      <h4 className="text-white font-semibold text-base">
                        CrewAI
                      </h4>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-3">
                      <CrewAILogo className="w-10 h-10 text-emerald-400" />
                      <h4 className="text-white font-semibold text-base">
                        Vercel AI
                      </h4>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-3">
                      <BoltIcon className="w-10 h-10 text-emerald-400" />
                      <h4 className="text-white font-semibold text-base">
                        Python
                      </h4>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Step 2: Implement Connector - Code Focus */}
            <motion.div
              className=" border-solid border-gray-800/50 rounded-md text-center hover:border-emerald-400/50 transition-all duration-300 relative min-h-[400px]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Header Section */}
              <div className="bg-[#191c24] rounded-t-md  p-4 pt-8 text-left">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xl font-semibold text-white">
                    Implement Connector
                  </span>
                  <div className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-colors cursor-pointer hover:bg-emerald-400/20">
                    2
                  </div>
                </div>

                <p className="text-gray-400 text-base mb-0 pr-12">
                  Add just a few lines of code to connect your agent to the
                  console. Simple integration for any framework.
                </p>
              </div>

              {/* Content Section */}
              <div className="p-4">
                {/* Code Examples */}
                <div className="space-y-4 text-left">
                  <div className="bg-gray-800/70 rounded-md border border-gray-600">
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
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Step 3: Launch Dev Console - Full Width */}
      <div className="w-full mb-12 sm:mb-24">
        <motion.div
          className=" border-solid border-gray-800/50 rounded-md text-center hover:border-emerald-400/50 transition-all duration-300 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Header Section */}
          <div className="bg-[#191c24] rounded-t-md py-6 pt-8 text-left px-6">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xl font-semibold text-white">
                Launch Dev Console
              </span>
              <div className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-colors cursor-pointer hover:bg-emerald-400/20">
                3
              </div>
            </div>

            <p className="text-gray-400 text-base mb-0">
              Start observing your AI agents in real-time. Get full visibility
              into every interaction, decision, and execution step.
            </p>
          </div>

          {/* Content Section */}
          <div className="py-6">
            {/* Console Demo iframe */}
            <div className="h-[400px] sm:h-[500px] md:h-[600px] lg:h-[800px] mb-6">
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

            {/* Features Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm px-6">
              <div className="bg-emerald-400/10 text-emerald-400 px-3 py-2 rounded-md">
                <div className="font-semibold">Real-time</div>
                <div className="text-xs text-gray-400">Live monitoring</div>
              </div>
              <div className="bg-emerald-400/10 text-emerald-400 px-3 py-2 rounded-md">
                <div className="font-semibold">Debug</div>
                <div className="text-xs text-gray-400">Step-by-step</div>
              </div>
              <div className="bg-emerald-400/10 text-emerald-400 px-3 py-2 rounded-md">
                <div className="font-semibold">Monitor</div>
                <div className="text-xs text-gray-400">Performance</div>
              </div>
              <div className="bg-emerald-400/10 text-emerald-400 px-3 py-2 rounded-md">
                <div className="font-semibold">Optimize</div>
                <div className="text-xs text-gray-400">Improve agents</div>
              </div>
            </div>

            {/* Demo Link */}
            <div className="mt-6">
              <Link
                to="https://console.voltagent.dev/demo"
                className="inline-flex items-center no-underline bg-emerald-400/10 text-emerald-400 
                border-solid border border-emerald-400/20 text-base sm:text-lg font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20 px-6 py-3"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 mr-2 animate-pulse" />
                <span className="text-sm sm:text-base">Try Live Demo</span>
                <ArrowTopRightOnSquareIcon
                  className="w-5 h-5 ml-2 mb-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};
