import {
  BugAntIcon,
  ChartBarIcon,
  ChatBubbleBottomCenterIcon,
  RocketLaunchIcon,
} from "@heroicons/react/24/outline";
import React from "react";

import { useMediaQuery } from "@site/src/hooks/use-media-query";
import AIChat from "./AIChat";
import Debugging from "./Debugging";
import Deployment from "./Deployment";
import Observability from "./Observability";

export default function Ops() {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const getResponsiveText = (mobileText: string, desktopText: string) => {
    return isMobile ? mobileText : desktopText;
  };

  return (
    <section className="relative w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 landing-xs:mb-16 landing-md:mb-36">
        <div className="flex flex-col mb-6 landing-xs:mb-8 sm:mb-12">
          <div className="w-full max-w-5xl">
            <div className="mb-4">
              <span className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold text-indigo-500 tracking-wide uppercase">
                Observability
              </span>
              <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:text-5xl sm:tracking-tight">
                Stay in control at every stage
              </p>
              <p className="max-w-3xl landing-md:text-xl landing-xs:text-md text-gray-400">
                From tracking deployments to debugging and live interaction,
                VoltAgent gives you full visibility into your AI agents.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 landing-md:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            {/* Deployment Card */}
            <div className="rounded-lg border border-solid border-white/10 hover:border-main-emerald  transition-all duration-300 overflow-hidden h-auto">
              <div className="p-4 border-b border-white/10 bg-[#0A0F15]">
                <div className="flex items-start gap-4">
                  <div className="bg-[#00d992]/10 w-8 h-8  landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0">
                    <RocketLaunchIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-[#00d992]" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Deployment
                    </div>
                    <p className="text-gray-400 landing-lg:text-sm landing-xs:text-xs mb-0 leading-relaxed">
                      {getResponsiveText(
                        "Monitor deployments and logs.",
                        "Deploy your Agents in seconds with VoltAgent Deployment.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="">
                <Deployment />
              </div>
            </div>
            {/* Debugging Card */}
            <div className="rounded-lg border border-solid border-white/10 hover:border-main-emerald transition-all duration-300 overflow-hidden h-auto">
              <div className="p-4 border-b border-white/10 bg-[#0A0F15]">
                <div className="flex items-start gap-4">
                  <div className="bg-[#00d992]/10 w-8 h-8  landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0">
                    <BugAntIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-[#00d992]" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Debugging
                    </div>
                    <p className="text-gray-400 landing-lg:text-sm landing-xs:text-xs mb-0 leading-relaxed">
                      {getResponsiveText(
                        "Debug with visual flow and logs.",
                        "Debug and analyze your VoltAgent-powered AI agent's behavior with visual flows.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="">
                <Debugging />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {/* Observability Card */}
            <div className="rounded-lg border border-solid border-white/10 hover:border-main-emerald transition-all duration-300 overflow-hidden h-auto">
              <div className="p-4 bg-[#0A0F15]">
                <div className="flex items-start gap-4">
                  <div className="bg-[#00d992]/10 w-8 h-8  landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0">
                    <ChartBarIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-[#00d992]" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      Observability
                    </div>
                    <p className="text-gray-400 landing-lg:text-sm landing-xs:text-xs mb-0 leading-relaxed">
                      {getResponsiveText(
                        "Connect to Langfuse, LangSmith, and more.",
                        "Connect your VoltAgent-powered AI agents to popular observability platforms.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="">
                <Observability />
              </div>
            </div>

            {/* AI Chat Card */}
            <div className="rounded-lg border border-solid border-white/10 hover:border-main-emerald transition-all duration-300 overflow-hidden h-auto">
              <div className="p-4  border-b border-white/10 bg-[#0A0F15]">
                <div className="flex items-start gap-4">
                  <div className="bg-[#00d992]/10 w-8 h-8  landing-md:w-10 landing-md:h-10 rounded-md flex items-center justify-center shrink-0">
                    <ChatBubbleBottomCenterIcon className="w-4 h-4 landing-md:w-5 landing-md:h-5 text-[#00d992]" />
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 landing-xs:text-sm landing-lg:text-base font-semibold text-white">
                      AI Chat
                    </div>
                    <p className="text-gray-400 landing-lg:text-sm landing-xs:text-xs mb-0 leading-relaxed">
                      {getResponsiveText(
                        "Chat with AI agent and debug responses.",
                        "Interact with your AI agent through natural language chat interface.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
              <div className="">
                <AIChat />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
