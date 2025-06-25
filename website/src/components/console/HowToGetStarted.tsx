import Link from "@docusaurus/Link";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/outline";
import { BoltIcon } from "@heroicons/react/24/solid";
import { PythonLogo, TypeScriptLogo, VercelLogo } from "@site/static/img/logos";
import { VoltAgentLogo } from "@site/static/img/logos/integrations/voltagent";
import { motion } from "framer-motion";
import React from "react";

export const HowToGetStarted = () => {
  return (
    <>
      {/* How to Use Section */}
      <div className="max-w-7xl mx-auto px-4 landing-xs:px-3 landing-sm:px-6 mb-8 landing-xs:mb-6 landing-sm:mb-12 landing-md:mb-16 landing-lg:mb-24">
        <div className="text-left mb-8 landing-xs:mb-6 landing-sm:mb-12 landing-md:mb-16">
          <h2 className="text-lg landing-xs:text-base landing-sm:text-xl landing-md:text-2xl landing-lg:text-3xl text-emerald-500 font-bold mb-3 landing-xs:mb-2 landing-sm:mb-4">
            How to Get Started
          </h2>
          <p className="text-gray-400 max-w-3xl text-sm landing-xs:text-xs landing-sm:text-base landing-md:text-lg">
            Using universal AI agent observability in just 3 simple steps
          </p>
        </div>

        <div className="relative">
          {/* Steps 1 and 2 - Side by side */}
          <div className="grid grid-cols-1 landing-lg:grid-cols-2 gap-4 landing-xs:gap-3 landing-sm:gap-6 landing-md:gap-8 relative z-10">
            {/* Step 1: Build Your LLM App - Framework Focus */}
            <motion.div
              className="border-solid border-gray-800/50 rounded-md text-center hover:border-emerald-400/50 transition-all duration-300 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              {/* Header Section */}
              <div className="bg-[#191c24] rounded-t-md p-3 landing-xs:p-2 landing-sm:p-4 landing-xs:pt-3 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 w-7 h-7 landing-xs:w-6 landing-xs:h-6 landing-sm:w-8 landing-sm:h-8 landing-md:w-9 landing-md:h-9 rounded-full flex items-center justify-center text-sm landing-xs:text-xs landing-sm:text-base landing-md:text-lg font-bold transition-colors cursor-pointer hover:bg-emerald-400/20">
                    1
                  </div>
                  <span className="text-base landing-xs:text-sm landing-sm:text-lg landing-md:text-lg font-semibold text-emerald-400">
                    Build Your LLM App
                  </span>
                </div>

                <p className="text-gray-400 text-xs landing-xs:text-xs landing-sm:text-sm landing-md:text-md mb-0">
                  Build your AI agent using various frameworks or vanilla
                  Python/TS. Universal compatibility means you're never locked
                  in.
                </p>
              </div>

              {/* Content Section */}
              <div className="p-3 landing-xs:p-2 landing-sm:p-4">
                {/* Framework Showcase - Prominent */}
                <div className="space-y-2">
                  <div className="flex justify-between  py-4  px-4 landing-xs:px-2 landing-sm:px-6 landing-md:px-8 relative">
                    {/* Framework Items */}
                    <Link
                      to="https://voltagent.dev/voltops-llm-observability-docs/voltagent-framework/"
                      className="flex flex-col items-center justify-center gap-1 landing-xs:gap-0.5 landing-sm:gap-2 cursor-pointer no-underline hover:opacity-80 transition-opacity"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <VoltAgentLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10 text-emerald-400" />
                      <span className="text-xs landing-xs:text-xs landing-sm:text-sm text-gray-400 font-medium">
                        VoltAgent
                      </span>
                    </Link>

                    <Link
                      to="https://voltagent.dev/voltops-llm-observability-docs/python-sdk/"
                      className="flex flex-col items-center justify-center gap-1 landing-xs:gap-0.5 landing-sm:gap-2 cursor-pointer no-underline hover:opacity-80 transition-opacity"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <PythonLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10" />
                      <span className="text-xs landing-xs:text-xs landing-sm:text-sm text-gray-400 font-medium">
                        Python SDK
                      </span>
                    </Link>

                    <Link
                      to="https://voltagent.dev/voltops-llm-observability-docs/js-ts-sdk/"
                      className="flex flex-col items-center justify-center gap-1 landing-xs:gap-0.5 landing-sm:gap-2 cursor-pointer no-underline hover:opacity-80 transition-opacity"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TypeScriptLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8 landing-sm:h-8 landing-md:w-10 landing-md:h-10" />
                      <span className="text-xs landing-xs:text-xs landing-sm:text-sm text-gray-400 font-medium">
                        TypeScript SDK
                      </span>
                    </Link>

                    <Link
                      to="https://voltagent.dev/voltops-llm-observability-docs/vercel-ai/"
                      className="flex flex-col items-center justify-center gap-1 landing-xs:gap-0.5 landing-sm:gap-2 cursor-pointer no-underline hover:opacity-80 transition-opacity"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <VercelLogo className="w-6 h-6 landing-xs:w-5 landing-xs:h-5 landing-sm:w-8  text-white landing-sm:h-8 landing-md:w-10 landing-md:h-10" />
                      <span className="text-xs landing-xs:text-xs landing-sm:text-sm text-gray-400 font-medium">
                        Vercel AI SDK
                      </span>
                    </Link>
                  </div>
                  <Link
                    to="https://github.com/VoltAgent/voltagent/issues/new"
                    className="inline-flex items-center no-underline bg-emerald-400/10 text-emerald-400 
                      border-solid border border-emerald-400/20 text-xs landing-xs:text-xs landing-sm:text-sm landing-md:text-base font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-6 py-1.5 landing-xs:py-1 landing-sm:py-2 "
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      backdropFilter: "blur(4px)",
                      WebkitBackdropFilter: "blur(4px)",
                    }}
                  >
                    <PlusIcon className="w-4 h-4 landing-xs:w-3 landing-xs:h-3 landing-sm:w-5 landing-sm:h-5 mr-2 landing-xs:mr-1" />
                    <span className="text-xs landing-xs:text-xs ">
                      Request Framework Integration
                    </span>
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Step 2: Implement Connector - Code Focus */}
            <motion.div
              className="border-solid border-gray-800/50 rounded-md text-center hover:border-emerald-400/50 transition-all duration-300 relative"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              {/* Header Section */}
              <div className="bg-[#191c24] rounded-t-md p-3 landing-xs:p-2 landing-sm:p-4 pt-4 landing-xs:pt-3 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 w-7 h-7 landing-xs:w-6 landing-xs:h-6 landing-sm:w-8 landing-sm:h-8 landing-md:w-9 landing-md:h-9 rounded-full flex items-center justify-center text-sm landing-xs:text-xs landing-sm:text-base landing-md:text-lg font-bold transition-colors cursor-pointer hover:bg-emerald-400/20">
                    2
                  </div>
                  <span className="text-base landing-xs:text-sm landing-sm:text-lg landing-md:text-lg font-semibold text-emerald-400">
                    Implement Connector
                  </span>
                </div>

                <p className="text-gray-400 text-xs landing-xs:text-xs landing-sm:text-sm landing-md:text-md mb-0 pr-8 landing-xs:pr-4 landing-sm:pr-10 landing-md:pr-12">
                  Add just a few lines of code to connect your agent to the
                  console. Simple integration for any framework.
                </p>
              </div>

              {/* Code Section */}
              <div className="w-full relative rounded-none rounded-b-md overflow-y-hidden backdrop-blur-md transition-all duration-300">
                <pre className="text-left rounded-none rounded-b-md backdrop-blur-md bg-white/5 overflow-hidden p-0 text-xs landing-xs:text-xs landing-sm:text-xs landing-md:text-sm font-mono m-0 h-fit">
                  <div className="flex">
                    <div className="py-4 landing-xs:py-3 landing-sm:py-5 landing-md:py-6 px-1.5 landing-xs:px-1 landing-sm:px-2 landing-md:px-3 text-right text-[#4D5B6E] select-none border-solid border-t-0 border-b-0 border-l-0 border-r border-[#1e2730] min-w-[35px] landing-xs:min-w-[30px] landing-sm:min-w-[40px] landing-md:min-w-[45px] text-xs landing-xs:text-xs">
                      {Array.from({ length: 8 }, (_, i) => (
                        <div key={`line-${i + 1}`}>{i + 1}</div>
                      ))}
                    </div>
                    <div className="py-4 landing-xs:py-3 landing-sm:py-5 landing-md:py-6 px-2 landing-xs:px-1.5 landing-sm:px-3 landing-md:px-4 block text-xs landing-xs:text-xs landing-sm:text-xs landing-md:text-sm w-full relative">
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
                          {"{ VoltAgentObservabilitySDK }"}
                        </span>{" "}
                        <span className="text-blue-400">from</span>{" "}
                        <span className="text-main-emerald">
                          '@voltagent/sdk'
                        </span>
                        <br />
                        <br />
                        <span className="text-purple-400">const</span>{" "}
                        <span className="text-gray-300">sdk = </span>
                        <span className="text-blue-400">new</span>{" "}
                        <span className="text-gray-300">
                          VoltAgentObservabilitySDK({"{"}
                        </span>
                        <br />
                        <span className="text-gray-300">{"  "}</span>
                        <span className="text-main-emerald">baseUrl: </span>
                        <span className="text-gray-300">
                          'https://api.voltagent.dev',
                        </span>
                        <br />
                        <span className="text-gray-300">{"  "}</span>
                        <span className="text-main-emerald">publicKey: </span>
                        <span className="text-gray-300">
                          'your-public-key',
                        </span>
                        <br />
                        <span className="text-gray-300">{"  "}</span>
                        <span className="text-main-emerald">secretKey: </span>
                        <span className="text-gray-300">
                          'your-secret-key',
                        </span>
                        <br />
                        <span className="text-gray-300">{"}"});</span>
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
      <div className="w-full mb-8 landing-xs:mb-6 landing-sm:mb-12 landing-md:mb-16 landing-lg:mb-24 px-4 landing-xs:px-3">
        <motion.div
          className="border-solid border-gray-800/50 rounded-md text-center hover:border-emerald-400/50 transition-all duration-300 relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {/* Header Section */}
          <div className="bg-[#191c24] rounded-t-md text-left">
            <div className="flex flex-col landing-sm:flex-row items-start landing-sm:items-center justify-between px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-6">
              <div className="flex flex-col justify-between py-3 landing-xs:py-2 landing-sm:py-4 w-full landing-sm:w-auto">
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 w-7 h-7 landing-xs:w-6 landing-xs:h-6 landing-sm:w-8 landing-sm:h-8 landing-md:w-9 landing-md:h-9 rounded-full flex items-center justify-center text-sm landing-xs:text-xs landing-sm:text-base landing-md:text-lg font-bold transition-colors cursor-pointer hover:bg-emerald-400/20">
                    3
                  </div>
                  <span className="text-base landing-xs:text-sm landing-sm:text-lg landing-md:text-lg font-semibold text-emerald-400">
                    Launch VoltOps Platform
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-gray-400 text-xs landing-xs:text-xs landing-sm:text-sm landing-md:text-md mb-0">
                    Start observing your AI agents in real-time. Get full
                    visibility into every interaction, decision, and execution
                    step.
                  </p>
                </div>
              </div>
              <Link
                to="https://console.voltagent.dev/demo"
                className="inline-flex items-center justify-center no-underline bg-emerald-400/10 text-emerald-400 
                border-solid border border-emerald-400/20 text-xs landing-xs:text-xs landing-sm:text-sm landing-md:text-base font-semibold rounded transition-colors cursor-pointer hover:bg-emerald-400/20 px-3 landing-xs:px-2 landing-sm:px-4 landing-md:px-6 py-1.5 landing-xs:py-1 landing-sm:py-2 landing-md:py-3 mt-2 landing-sm:mt-0 w-full landing-sm:w-auto"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backdropFilter: "blur(4px)",
                  WebkitBackdropFilter: "blur(4px)",
                }}
              >
                <BoltIcon className="w-4 h-4 landing-xs:w-3 landing-xs:h-3 landing-sm:w-5 landing-sm:h-5 mr-2 landing-xs:mr-1 animate-pulse" />
                <span className="text-xs landing-xs:text-xs landing-sm:text-sm landing-md:text-base">
                  Try Live Demo
                </span>
                <ArrowTopRightOnSquareIcon
                  className="w-3 h-3 landing-xs:w-3 landing-xs:h-3 landing-sm:w-4 landing-sm:h-4 ml-2 landing-xs:ml-1 mb-1"
                  aria-hidden="true"
                />
              </Link>
            </div>
            <div className="h-[250px] landing-xs:h-[200px] landing-sm:h-[350px] mt-4 landing-md:h-[500px] landing-lg:h-[600px] landing-xl:h-[800px]">
              {/* Mobile and tablet - show image */}
              <img
                src="/img/ops/flow-1.png"
                alt="VoltOps Platform Flow"
                className="w-full h-full object-cover rounded-b-md p-1 block landing-md:hidden"
              />
              {/* Desktop - show iframe */}
              <iframe
                src="https://console.voltagent.dev/demo"
                title="VoltOps Platform Demo"
                className="w-full h-full rounded-b-md hidden landing-md:block"
                style={{
                  border: "2px solid #2c3335",
                  borderRadius: "6px",
                }}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};
