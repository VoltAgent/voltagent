import { BoltIcon } from "@heroicons/react/24/solid";
import { motion } from "framer-motion";
import React from "react";
import { ExampleCard } from "./exampleCard";

interface ExampleListProps {
  examples?: any[];
}

export const ExampleList = ({ examples = [] }: ExampleListProps) => {
  return (
    <section className=" py-20 overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#00d992]/5 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-0  w-96 h-96 bg-[#00d992]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
        {/* Header */}
        <div className="mb-12 sm:mb-16">
          <div className="flex flex-col justify-center">
            <div className="flex items-baseline justify-start mb-6">
              <div className="relative">
                <span className=" text-xl sm:text-3xl font-medium text-[#dcdcdc]">
                  Examples & Templates
                </span>
              </div>
            </div>

            <p className="text-base text-gray-400 mb-4 leading-relaxed max-w-3xl">
              Explore practical examples and code snippets to get started with{" "}
              <span className="text-[#00d992] font-semibold">VoltAgent</span>.
            </p>
          </div>
        </div>

        {/* Examples Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {examples.map((example) => (
            <ExampleCard key={example.id} example={example} />
          ))}

          {/* Other Mini Examples Card */}
          <a
            href="https://github.com/VoltAgent/voltagent/tree/main/examples"
            target="_blank"
            rel="noopener noreferrer"
            className="group border-solid bg-gradient-to-br from-white/[0.07] to-white/[0.02] border-[#1e293b]/50 border rounded-xl overflow-hidden transition-all duration-300 hover:border-[#00d992]/40 hover:shadow-lg hover:shadow-[#00d992]/10 cursor-pointer relative no-underline"
            style={{
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            {/* Gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d992]/0 to-[#00d992]/0 group-hover:from-[#00d992]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />

            <div className="p-7 relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[#00d992]/10 flex items-center justify-center group-hover:bg-[#00d992]/20 transition-colors duration-300">
                  <svg className="w-5 h-5 text-[#00d992]" fill="currentColor" viewBox="0 0 24 24">
                    <path
                      fillRule="evenodd"
                      d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-0 group-hover:text-[#00d992] transition-colors duration-300 no-underline">
                  More Examples
                </h3>
              </div>

              <p className="text-gray-400 text-[15px] mb-0 leading-relaxed group-hover:text-gray-300 transition-colors duration-300 flex-grow">
                Browse additional mini examples on GitHub
              </p>

              <div className="flex justify-end">
                <span className="text-[#00d992] text-lg font-medium transition-all duration-300 group-hover:text-[#00ffaa] group-hover:scale-110 inline-block group-hover:translate-x-0.5">
                  →
                </span>
              </div>
            </div>
          </a>
        </motion.div>
      </div>
    </section>
  );
};
