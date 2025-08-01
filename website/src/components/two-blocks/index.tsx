import React from "react";
import {
  LangChainLogo,
  OpenTelemetryLogo,
  PydanticLogo,
  PythonLogo,
  TypeScriptLogo,
  VercelLogo,
} from "../../../static/img/logos";
import {
  AutogenLogo,
  CrewAILogo,
  LlamaIndexLogo,
  VoltAgentLogo,
} from "../../../static/img/logos/integrations";

export function TwoBlocks() {
  return (
    <div className="text-white relative w-full overflow-hidden landing-xs:mb-16 landing-md:mb-36">
      <div className="max-w-7xl mx-auto landing-xs:px-3 landing-md:px-4">
        {/* Header Section */}
        {/*  <div className="mb-12">
          <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold text-main-emerald tracking-wide uppercase">
            Complete AI Platform
          </h2>
          <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
            Build, deploy, and monitor AI agents end-to-end
          </p>
          <p className="max-w-3xl landing-md:text-xl landing-xs:text-md text-gray-400">
            From development to production monitoring - everything you need for enterprise AI agents in one integrated platform.
          </p>
        </div> */}

        {/* VoltAgent vs VoltOps Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 landing-xs:gap-6 landing-md:gap-8 items-stretch">
          {/* VoltAgent - Left Side */}
          <div>
            <div className="flex flex-col items-center gap-2 landing-xs:mb-3 landing-md:mb-4">
              <p className="text-main-emerald landing-xs:text-lg landing-md:text-xl font-bold mb-0 uppercase tracking-wide text-center">
                DEVELOPMENT & ORCHESTRATION{" "}
              </p>
              <span className="text-gray-300 landing-xs:text-base landing-md:text-lg text-center">
                Build agents with VoltAgent
              </span>
            </div>

            <div className="relative landing-xs:p-4 landing-md:p-6 rounded-lg border border-solid border-white/10  hover:border-[#00d992]/30 transition-all duration-300 ">
              <div className="landing-xs:mb-3 landing-md:mb-4">
                <div className="flex items-center gap-2 landing-xs:mb-1 landing-md:mb-2">
                  <p className="landing-xs:text-lg landing-md:text-2xl mb-0 font-bold text-white ">
                    VoltAgent{" "}
                    <span className="landing-xs:text-lg landing-md:text-2xl font-bold text-main-emerald">
                      Framework
                    </span>
                  </p>
                  <span className="px-2 py-1 bg-[#00d992]/10 text-[#00d992] landing-xs:text-xs text-xs font-medium rounded border border-[#00d992]/20">
                    open-source
                  </span>
                </div>
                <p className="text-gray-400 landing-xs:text-sm landing-md:text-lg leading-relaxed">
                  A TypeScript framework for building and AI agents with
                  enterprise-grade capabilities and seamless integrations.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 landing-xs:mb-4 landing-md:mb-6">
                <span className="px-3 py-1 bg-[#00d992]/10 text-[#00d992] text-xs font-medium rounded-full border border-[#00d992]/20">
                  LLMs
                </span>
                <span className="px-3 py-1 bg-[#00d992]/10 text-[#00d992] text-xs font-medium rounded-full border border-[#00d992]/20">
                  Memory
                </span>
                <span className="px-3 py-1 bg-[#00d992]/10 text-[#00d992] text-xs font-medium rounded-full border border-[#00d992]/20">
                  Tools
                </span>
                <span className="px-3 py-1 bg-[#00d992]/10 text-[#00d992] text-xs font-medium rounded-full border border-[#00d992]/20">
                  Workflows
                </span>
                <span className="px-3 py-1 bg-[#00d992]/10 text-[#00d992] text-xs font-medium rounded-full border border-[#00d992]/20">
                  MCP
                </span>
              </div>

              {/* Language Icon */}
              <div className="flex items-center gap-2 landing-xs:mb-4 landing-md:mb-6">
                <TypeScriptLogo className="landing-xs:w-5 landing-xs:h-5 landing-md:w-6 landing-md:h-6" />
                <span className="text-gray-300 landing-xs:text-sm text-sm">
                  Built with TypeScript
                </span>
              </div>

              {/* CTA Button */}
              <button
                type="button"
                className="w-full landing-xs:py-2 landing-xs:px-3 landing-md:py-3 landing-md:px-4 text-emerald-400 font-semibold rounded-lg border border-emerald-400/20 bg-emerald-400/10 hover:bg-emerald-400/20 transition-colors duration-200 cursor-pointer landing-xs:text-sm landing-md:text-base"
                onClick={() => {
                  window.open("https://voltagent.dev/docs/", "_blank");
                }}
              >
                Explore VoltAgent
              </button>
            </div>
          </div>

          {/* VoltOps - Right Side */}
          <div>
            <div className="flex flex-col items-center gap-2 landing-xs:mb-3 landing-md:mb-4">
              <p className="text-orange-500 landing-xs:text-lg landing-md:text-xl font-bold mb-0 uppercase tracking-wide text-center">
                LLM OBSERVABILITY PLATFORM
              </p>
              <span className="text-gray-300 landing-xs:text-base landing-md:text-lg text-center">
                Gain visibility with VoltOps
              </span>
            </div>

            <div className="relative landing-xs:p-4 landing-md:p-6 rounded-lg border border-solid border-white/10 bg-white/5 hover:border-orange-400/30 transition-all duration-300 ">
              <div className="landing-xs:mb-3 landing-md:mb-4">
                <p className="landing-xs:text-lg landing-md:text-2xl font-bold text-white landing-xs:mb-1 landing-md:mb-2">
                  VoltOps{" "}
                  <span className="landing-xs:text-lg landing-md:text-2xl font-bold text-orange-500">
                    LLM Observability
                  </span>
                </p>
                <p className="text-gray-400 landing-xs:text-sm landing-md:text-lg leading-relaxed">
                  Framework-agnostic observability platform for tracing,
                  debugging, and monitoring AI agents across tech stacks.
                </p>
              </div>

              {/* Framework Icons - Sliding Animation */}
              <div className="landing-xs:mb-4 landing-md:mb-6">
                <style>{`
                  @keyframes scrollLeftSmall {
                    0% {
                      transform: translateX(0);
                    }
                    100% {
                      transform: translateX(-50%);
                    }
                  }

                  .scroll-left-small {
                    animation: scrollLeftSmall 30s linear infinite;
                  }
                `}</style>

                <div
                  className="flex overflow-hidden"
                  style={{
                    maxWidth: "100%",
                    scrollbarWidth: "none",
                    msOverflowStyle: "none",
                    WebkitOverflowScrolling: "touch",
                    WebkitMaskImage:
                      "linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)",
                    maskImage:
                      "linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)",
                  }}
                >
                  <div className="flex landing-xs:space-x-3 landing-md:space-x-4 landing-xs:py-2 landing-md:py-3 scroll-left-small">
                    {/* Create array of logos and duplicate for smooth infinite scroll */}
                    {[
                      ...Array(2)
                        .fill(null)
                        .flatMap((_, setIndex) => [
                          {
                            Component: VoltAgentLogo,
                            name: "voltagent",
                            setIndex,
                          },
                          {
                            Component: TypeScriptLogo,
                            name: "typescript",
                            setIndex,
                          },
                          { Component: PythonLogo, name: "python", setIndex },
                          { Component: VercelLogo, name: "vercel", setIndex },
                          {
                            Component: LangChainLogo,
                            name: "langchain",
                            setIndex,
                          },
                          { Component: CrewAILogo, name: "crewai", setIndex },
                          {
                            Component: LlamaIndexLogo,
                            name: "llamaindex",
                            setIndex,
                          },
                          {
                            Component: OpenTelemetryLogo,
                            name: "opentelemetry",
                            setIndex,
                          },
                          {
                            Component: PydanticLogo,
                            name: "pydantic",
                            setIndex,
                          },
                          { Component: AutogenLogo, name: "autogen", setIndex },
                        ]),
                    ].map((logo, index) => (
                      <div
                        key={`${logo.name}-${logo.setIndex}-${index}`}
                        className="bg-gray-900/30 landing-xs:min-w-10 landing-xs:w-10 landing-xs:h-10 landing-md:min-w-12 landing-md:w-12 landing-md:h-12 flex items-center justify-center rounded-md border border-gray-800/40 flex-shrink-0"
                      >
                        <logo.Component className="landing-xs:w-6 landing-xs:h-6 landing-md:w-8 landing-md:h-8 opacity-70" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button
                type="button"
                className="w-full landing-xs:py-2 landing-xs:px-3 landing-md:py-3 landing-md:px-4 text-orange-400 font-semibold rounded-lg border border-orange-400/20 bg-orange-400/10 hover:bg-orange-400/20 transition-colors duration-200 cursor-pointer landing-xs:text-sm landing-md:text-base"
                onClick={() => {
                  const livePreviewSection = document.querySelector(
                    '[data-section="live-preview"]',
                  );
                  if (livePreviewSection) {
                    livePreviewSection.scrollIntoView({ behavior: "smooth" });
                    window.dispatchEvent(new CustomEvent("activateVoltOpsTab"));
                  }
                }}
              >
                See VoltOps in action
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
