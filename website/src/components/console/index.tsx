import React from "react";
import { motion } from "framer-motion";
import { BoltIcon } from "@heroicons/react/24/solid";
import { DotPattern } from "../ui/dot-pattern";
import PricingSection from "./PricingSection";
import FrameworkIntegration from "./FrameworkIntegration";
import ObservabilityFeatures from "./ObservabilityFeatures";
import Link from "@docusaurus/Link";
import { HowToGetStarted } from "./HowToGetStarted";

export const Console = () => {
  return (
    <section className="relative w-full overflow-hidden py-8 landing-xs:py-6 landing-sm:py-12 landing-md:py-16 landing-lg:py-20">
      <DotPattern dotColor="#94a3b8" dotSize={1.2} spacing={20} />
      <div className="max-w-7xl mx-auto px-4 landing-xs:px-3 landing-sm:px-6 landing-xs:mb-6 landing-sm:mb-8 landing-md:mb-12 landing-lg:mb-24">
        {/* Header Section - Responsive */}
        <div className="grid grid-cols-1 landing-lg:grid-cols-2 gap-4 landing-xs:gap-3 landing-sm:gap-6 landing-md:gap-8 mb-8 landing-xs:mb-6 landing-sm:mb-12 landing-md:mb-16 landing-lg:mb-24 items-center">
          <div className="flex flex-col items-center relative">
            <div className="flex items-baseline justify-start">
              <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
                <BoltIcon className="w-3 h-3 landing-xs:w-3 landing-xs:h-3 landing-sm:w-4 landing-sm:h-4 landing-md:w-5 landing-md:h-5 landing-lg:w-6 landing-lg:h-6 text-[#00d992]" />
              </div>
              <span className="text-xl landing-xs:text-lg landing-sm:text-2xl landing-md:text-3xl landing-lg:text-4xl font-bold text-[#00d992]">
                voltagent
              </span>
              <div className="relative">
                <span className="ml-2 text-base landing-xs:text-sm landing-sm:text-lg landing-md:text-xl landing-lg:text-2xl font-medium text-gray-400">
                  Console
                </span>
              </div>
            </div>
            <p className="mt-2 text-center self-center text-gray-400 text-xs landing-xs:text-xs landing-sm:text-sm landing-md:text-base">
              Monitor, debug, and improve AI agents from any framework
            </p>
          </div>

          <div className="relative mt-4 landing-xs:mt-3 landing-sm:mt-6 landing-lg:mt-0">
            <motion.div
              initial={{ opacity: 0, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-left landing-md:ml-6 landing-lg:ml-8"
            >
              <p className="text-sm landing-xs:text-xs landing-sm:text-base landing-md:text-lg text-[#dcdcdc] mb-3 landing-xs:mb-2 landing-sm:mb-4">
                <Link
                  to="https://voltagent.dev/docs/observability/developer-console/"
                  className="text-[#00d992] no-underline font-bold"
                >
                  The Universal Developer Console
                </Link>{" "}
                gives you full visibility into AI agents from any framework
                during development and execution.
              </p>
              <p className="text-sm landing-xs:text-xs landing-sm:text-base landing-md:text-lg text-gray-400">
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
