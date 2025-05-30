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
import PricingSection from "./PricingSection";
import FrameworkIntegration from "./FrameworkIntegration";
import ObservabilityFeatures from "./ObservabilityFeatures";
import Link from "@docusaurus/Link";

import { HowToGetStarted } from "./HowToGetStarted";

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
      <FrameworkIntegration />

      {/* How to Get Started Section */}
      <HowToGetStarted />

      {/* Observability Features */}
      <ObservabilityFeatures />

      <PricingSection />
    </section>
  );
};

export default Console;
