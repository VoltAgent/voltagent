import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
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
    <div className="text-white relative w-full overflow-hidden landing-xs:mb-8 landing-md:mb-36">
      <div className="max-w-7xl mx-auto  landing-md:px-4">
        {/* VoltAgent vs VoltOps Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 landing-xs:gap-6 landing-sm:gap-10 landing-md:gap-8 items-stretch">
          {/* VoltAgent - Left Side */}
          <div>
            <div className="flex flex-col items-center gap-2 landing-xs:mb-3 landing-md:mb-4">
              <p className="text-main-emerald landing-xs:text-sm landing-sm:text-lg landing-md:text-xl font-bold mb-0 uppercase tracking-wide text-center leading-tight">
                DEVELOPMENT & ORCHESTRATION{" "}
              </p>
              <span className="text-gray-300 landing-xs:text-xs landing-sm:text-base landing-md:text-lg text-center">
                Build agents with <span className="text-[#00d992] font-bold">VoltAgent</span>
              </span>
            </div>

            <div className="relative landing-xs:p-3 landing-md:p-6 rounded-lg border border-solid border-white/10  hover:border-[#00d992]/30 transition-all duration-300 ">
              <div className="landing-xs:mb-2 landing-md:mb-4">
                <div className="landing-xs:mb-1 landing-md:mb-2">
                  {/* Mobile: Badge above title */}
                  <div className="mb-1 landing-md:hidden">
                    <span className="px-2 py-1 bg-[#00d992]/10 text-[#00d992] landing-xs:text-xs text-xs font-medium rounded border border-[#00d992]/20">
                      open-source
                    </span>
                  </div>

                  {/* Desktop: Badge inline with title */}
                  <div className="hidden landing-md:flex items-center gap-2">
                    <p className="landing-xs:text-base landing-md:text-2xl mb-0 font-bold text-white ">
                      VoltAgent{" "}
                      <span className="landing-xs:text-base landing-md:text-2xl font-bold text-main-emerald">
                        Core Framework
                      </span>
                    </p>
                    <span className="px-2 py-1 bg-[#00d992]/10 text-[#00d992] landing-xs:text-xs text-xs font-medium rounded border border-[#00d992]/20">
                      open-source
                    </span>
                  </div>

                  {/* Mobile: Title only */}
                  <p className="landing-xs:text-base landing-md:text-2xl mb-0 font-bold text-white landing-md:hidden">
                    VoltAgent{" "}
                    <span className="landing-xs:text-base landing-md:text-2xl font-bold text-main-emerald">
                      Core Framework
                    </span>
                  </p>
                </div>
                <p className="text-gray-400 landing-xs:text-xs landing-md:text-lg  text-left leading-relaxed">
                  A TypeScript framework for building AI agents and LLM apps with enterprise-grade
                  capabilities, fully free and open-source.
                </p>
              </div>

              {/* Feature Pills */}
              <div className="flex flex-wrap gap-2 landing-xs:mb-3 landing-md:mb-6">
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
              <div className="flex items-center gap-2 landing-xs:mb-3 landing-md:mb-6">
                <TypeScriptLogo className="landing-xs:w-4 landing-xs:h-4 landing-md:w-6 landing-md:h-6" />
                <span className="text-gray-300 text-xs landing-md:text-sm">
                  Built with TypeScript
                </span>
              </div>

              {/* CTA Button */}
              <button
                type="button"
                className="w-full landing-xs:py-1.5 backdrop-blur-md  landing-xs:px-3 landing-md:py-3 landing-md:px-4 text-emerald-400 font-semibold rounded-md border border-emerald-400/20 bg-emerald-400/10 hover:bg-emerald-400/20 transition-colors duration-200 cursor-pointer landing-xs:text-xs landing-md:text-base"
                onClick={() => {
                  window.open("https://voltagent.dev/docs/", "_blank");
                }}
              >
                <span>DOCS</span>
                <ArrowTopRightOnSquareIcon className="landing-xs:w-3 landing-xs:h-3 ml-3 landing-xs:ml-2" />
              </button>
            </div>
          </div>

          {/* VoltOps - Right Side */}
          <div>
            <div className="flex flex-col items-center gap-2 landing-xs:mb-3 landing-md:mb-4">
              <p className="text-orange-500 landing-xs:text-sm landing-sm:text-lg landing-md:text-xl font-bold mb-0 uppercase tracking-wide text-center leading-tight">
                LLM OBSERVABILITY PLATFORM
              </p>
              <span className="text-gray-300 landing-xs:text-xs landing-sm:text-base landing-md:text-lg text-center">
                Enterprise-grade observability with{" "}
                <span className="text-orange-500 font-bold">VoltOps</span>
              </span>
            </div>

            <div className="relative landing-xs:p-3 landing-md:p-6 rounded-lg border border-solid border-white/10 bg-white/5 hover:border-orange-400/30 transition-all duration-300 ">
              <div className="landing-xs:mb-2 landing-md:mb-4">
                <p className="landing-xs:text-base landing-md:text-2xl text-left font-bold text-white landing-xs:mb-1 landing-md:mb-2">
                  VoltOps{" "}
                  <span className="landing-xs:text-base landing-md:text-2xl font-bold text-orange-500">
                    LLM Observability
                  </span>
                </p>
                <p className="text-gray-400 landing-xs:text-xs landing-md:text-lg text-left leading-relaxed">
                  Framework-agnostic observability platform for tracing, debugging, and monitoring
                  AI agents & LLM apps.
                </p>
              </div>

              {/* Framework Icons - Sliding Animation */}
              <div className="landing-xs:mb-3 landing-md:mb-6">
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

              <div className="flex flex-col landing-sm:flex-row justify-between landing-xs:gap-2 landing-sm:gap-6">
                {/* CTA Buttons */}
                <button
                  type="button"
                  className="w-full landing-xs:py-1.5 landing-xs:px-3 landing-md:py-3 backdrop-blur-md landing-md:px-4 text-orange-400 font-semibold rounded-md border border-orange-400/20 bg-orange-400/10 hover:bg-orange-400/20 transition-colors duration-200 cursor-pointer landing-xs:text-xs landing-md:text-base"
                  onClick={() => {
                    window.open("/observability-docs/", "_blank");
                  }}
                >
                  <span>DOCS</span>
                  <ArrowTopRightOnSquareIcon className="landing-xs:w-3 landing-xs:h-3 ml-3 landing-xs:ml-2" />
                </button>
                <button
                  type="button"
                  className="w-full landing-xs:py-1.5 landing-xs:px-3 landing-md:py-3 backdrop-blur-md landing-md:px-4 text-orange-400 font-semibold rounded-md border border-orange-400/20 bg-orange-400/10 hover:bg-orange-400/20 transition-colors duration-200 cursor-pointer landing-xs:text-xs landing-md:text-base"
                  onClick={() => {
                    const voltOpsPricingSection = document.querySelector(
                      '[data-section="voltops-pricing"]',
                    );
                    if (voltOpsPricingSection) {
                      voltOpsPricingSection.scrollIntoView({
                        behavior: "smooth",
                      });
                    }
                  }}
                >
                  See VoltOps Pricing
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
