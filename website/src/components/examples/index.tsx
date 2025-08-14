import { BoltIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import React from "react";
import { ExampleCard } from "./exampleCard";

interface ExampleListProps {
  examples?: any[];
}

export const ExampleList = ({ examples = [] }: ExampleListProps) => {
  return (
    <section className="relative py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="mb-12 sm:mb-16">
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline justify-start mb-6">
              <div className="flex mr-2 items-center border-2 border-solid border-[#00d992] rounded-full p-1">
                <BoltIcon className="w-5 h-5 sm:w-6 sm:h-6 text-[#00d992]" />
              </div>
              <span className="text-3xl sm:text-4xl font-bold text-[#00d992]">voltagent</span>
              <div className="relative">
                <span className="ml-2 text-xl sm:text-2xl font-medium text-gray-400">
                  Examples & Tutorials
                </span>
              </div>
            </div>

            <p className="text-base text-gray-400 mb-4 leading-relaxed max-w-3xl">
              Explore practical examples and code snippets to get started with{" "}
              <span className="text-[#00d992] font-semibold">VoltAgent</span>. Each example includes
              complete code, installation instructions, and usage guidelines to help you build
              powerful AI agents quickly.
            </p>
          </div>
        </div>

        {/* Examples Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6"
        >
          {examples.map((example) => (
            <ExampleCard key={example.id} example={example} />
          ))}
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <div
            className="inline-block border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg p-8"
            style={{
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          >
            <h3 className="text-xl font-bold text-[#00d992] mb-3">
              Want to Contribute an Example?
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              Share your VoltAgent implementations with the community. Submit your examples through
              GitHub.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="https://github.com/voltagent/voltagent/tree/main/examples"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-[#00d992]/10 text-[#00d992] border-solid border-[#00d992]/20 font-semibold rounded-lg transition-colors hover:bg-[#00d992]/20 no-underline"
              >
                View on GitHub
              </a>
              <a
                href="/docs/"
                className="px-6 py-2 bg-gray-800/50 text-gray-300 border-solid border-gray-600 font-semibold rounded-lg transition-colors hover:bg-gray-700/50 no-underline"
              >
                Read Documentation
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
