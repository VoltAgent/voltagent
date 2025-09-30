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
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto"
        >
          {examples.map((example) => (
            <ExampleCard key={example.id} example={example} />
          ))}
        </motion.div>
      </div>
    </section>
  );
};
