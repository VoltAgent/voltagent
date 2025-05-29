import React from "react";
import { motion } from "framer-motion";
import { BoltIcon } from "@heroicons/react/24/solid";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import Link from "@docusaurus/Link";
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
  PythonLogo,
  TypeScriptLogo,
} from "@site/static/img/logos";
import { VoltAgentLogo } from "@site/static/img/logos/integrations/voltagent";
import { PlusIcon } from "@heroicons/react/24/outline";

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
            Using universal AI agent observability in just 3 simple steps
          </p>
        </div>

        <div className="relative">
          {/* Connection Lines - Hidden on mobile */}

          {/* Steps 1 and 2 - Side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
            {/* Step 1: Build Your LLM App - Framework Focus */}
            <motion.div
              className=" border-solid border-gray-800/50  rounded-md text-center hover:border-emerald-400/50 transition-all duration-300 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Header Section */}
              <div className="bg-[#191c24] rounded-t-md p-4 pt-8 text-left">
                <div className="flex r items-center gap-2 mb-2">
                  <div className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors cursor-pointer hover:bg-emerald-400/20">
                    1
                  </div>
                  <span className="text-lg font-semibold text-emerald-400 ">
                    Build Your LLM App
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-0">
                  Build your AI agent using various frameworks or vanilla
                  Python/TS. Universal compatibility means you're never locked
                  in.
                </p>
              </div>

              {/* Content Section */}
              <div className="p-4 ">
                {/* Framework Showcase - Prominent */}
                <div className="space-y-2">
                  <div className="flex justify-between mb-4  px-8 relative">
                    {/* Framework Items */}
                    <div className="flex flex-col items-center justify-center  gap-2">
                      <VoltAgentLogo className="w-10 h-10 text-emerald-400" />
                    </div>

                    <div className="flex flex-col items-center justify-center  gap-2">
                      <PythonLogo className="w-10 h-10" />
                    </div>

                    <div className="flex flex-col items-center justify-center  gap-2">
                      <TypeScriptLogo className="w-10 h-10" />
                    </div>

                    <div className="flex flex-col items-center justify-center  gap-2">
                      <VercelLogo className="w-10 h-10" />
                    </div>

                    <div className="flex flex-col items-center justify-center  gap-2">
                      <CrewAILogo className="w-20 h-20" />
                    </div>

                    <div className="flex flex-col items-center justify-center  gap-2">
                      <LangChainLogo className="w-14 h-14" />
                    </div>
                  </div>
                  <Link
                    to="https://github.com/VoltAgent/voltagent/issues/new"
                    className="inline-flex items-center no-underline bg-emerald-400/10 text-emerald-400 
                      border-solid border border-emerald-400/20 text-base sm:text-lg font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20 px-4 py-2"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backdropFilter: "blur(4px)",
                      WebkitBackdropFilter: "blur(4px)",
                    }}
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    <span className="text-sm">
                      Request Framework Integration
                    </span>
                  </Link>
                  {/* Request New Integration */}
                </div>
              </div>
            </motion.div>

            {/* Step 2: Implement Connector - Code Focus */}
            <motion.div
              className=" border-solid border-gray-800/50  rounded-md text-center hover:border-emerald-400/50 transition-all duration-300 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Header Section */}
              <div className="bg-[#191c24] rounded-t-md p-4 pt-8 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors cursor-pointer hover:bg-emerald-400/20">
                    2
                  </div>
                  <span className="text-lg font-semibold text-emerald-400">
                    Implement Connector
                  </span>
                </div>

                <p className="text-gray-400 text-sm mb-0 pr-12">
                  Add just a few lines of code to connect your agent to the
                  console. Simple integration for any framework.
                </p>
              </div>

              {/* Code Section */}
              <div className="w-full relative rounded-none rounded-b-md  overflow-y-hidden backdrop-blur-md  transition-all duration-300">
                <pre className="text-left rounded-none rounded-b-md backdrop-blur-md bg-white/5 overflow-hidden p-0 text-sm font-mono m-0">
                  <div className="flex">
                    <div className="py-6 px-2 text-right text-[#4D5B6E] select-none border-solid border-t-0 border-b-0 border-l-0 border-r border-[#1e2730] min-w-[45px] text-xs">
                      {Array.from({ length: 7 }, (_, i) => (
                        <div key={`line-${i + 1}`}>{i + 1}</div>
                      ))}
                    </div>
                    <div className="py-6 px-3 block text-xs w-full relative">
                      <motion.div
                        className="absolute inset-0 bg-[#00d992]/5"
                        layoutId="codeHighlight"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      />
                      <code className="block relative leading-[1.4] z-10">
                        <span className="text-blue-400">import</span>{" "}
                        <span className="text-gray-300">
                          {"{ VoltConsole }"}
                        </span>{" "}
                        <span className="text-blue-400">from</span>{" "}
                        <span className="text-main-emerald">
                          '@voltagent/console'
                        </span>
                        <br />
                        <br />
                        <span className="text-gray-300">
                          {"// Configure console options"}
                        </span>
                        <br />
                        <span className="text-purple-400">const</span>{" "}
                        <span className="text-gray-300">console = </span>
                        <span className="text-blue-400">new</span>{" "}
                        <span className="text-gray-300">VoltConsole({"{"}</span>
                        <span className="text-main-emerald">projectId: </span>
                        <span className="text-gray-300">'your-project-id'</span>
                        <span className="text-gray-300">{"}"});</span>
                        <br />
                        <br />
                        <span className="text-purple-400">try</span>{" "}
                        <span className="text-gray-300">{"{"}</span>
                        <br />
                        <span className="text-gray-300">{"  "}</span>
                        <span className="text-purple-400">await</span>{" "}
                        <span className="text-gray-300">console.</span>
                        <span className="text-main-emerald">monitor</span>
                        <span className="text-gray-300">(yourAgent);</span>
                        <br />
                        <span className="text-gray-300">{"}"}</span>{" "}
                        <span className="text-purple-400">catch</span>{" "}
                        <span className="text-gray-300">(error)</span>{" "}
                        <span className="text-gray-300">{"{"}</span>
                        <br />
                      </code>
                    </div>
                  </div>
                </pre>
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
          <div className="bg-[#191c24] rounded-t-md  text-left ">
            <div className="flex items-center justify-between px-4">
              <div className="flex flex-col  justify-between py-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 w-9 h-9 rounded-full flex items-center justify-center text-lg font-bold transition-colors cursor-pointer hover:bg-emerald-400/20">
                    3
                  </div>
                  <span className="text-lg font-semibold text-emerald-400">
                    Launch Dev Console
                  </span>
                </div>
                <div className="flex  flex-col gap-2">
                  <p className="text-gray-400 text-sm mb-0">
                    Start observing your AI agents in real-time. Get full
                    visibility into every interaction, decision, and execution
                    step.
                  </p>
                </div>
              </div>
              <Link
                to="https://console.voltagent.dev/demo"
                className="inline-flex items-center no-underline bg-emerald-400/10 text-emerald-400 
                border-solid border border-emerald-400/20 text-base sm:text-lg font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20 px-4 py-2"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <BoltIcon className="w-5 h-5 mr-2 animate-pulse" />
                <span className="text-sm ">Try Live Demo</span>
                <ArrowTopRightOnSquareIcon
                  className="w-4 h-4 ml-2 mb-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
            <div className="h-[400px] sm:h-[500px] md:h-[600px] lg:h-[800px] ">
              <iframe
                src="https://console.voltagent.dev/demo"
                title="Voltage Agent Console"
                className="w-full h-full"
                style={{
                  height: "100%",
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              />
            </div>
          </div>

          {/* Content Section */}
          {/* Console Demo iframe */}
        </motion.div>
      </div>
    </>
  );
};
