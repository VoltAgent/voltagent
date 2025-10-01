import Link from "@docusaurus/Link";
import { motion } from "framer-motion";
import React from "react";

interface ExampleCardProps {
  example: {
    id: number;
    slug: string;
    title: string;
    description: string;
  };
}

export const ExampleCard = ({ example }: ExampleCardProps) => {
  return (
    <Link to={`/examples/agents/${example.slug}/`} className="no-underline">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="group border-solid bg-gradient-to-br from-white/[0.07] to-white/[0.02] border-[#1e293b]/50 border rounded-xl overflow-hidden transition-all duration-300 h-full hover:border-[#00d992]/40 hover:shadow-lg hover:shadow-[#00d992]/10 cursor-pointer relative"
        style={{
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        {/* Gradient overlay on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00d992]/0 to-[#00d992]/0 group-hover:from-[#00d992]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none" />

        <div className="p-7 relative z-10 flex flex-col h-full">
          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[#00d992] transition-colors duration-300">
            {example.title}
          </h3>

          <p className="text-gray-400 text-[15px] leading-relaxed group-hover:text-gray-300 transition-colors duration-300 mb-0 flex-grow">
            {example.description}
          </p>

          <div className="flex justify-end">
            <span className="text-[#00d992] text-lg font-medium transition-all duration-300 group-hover:text-[#00ffaa] group-hover:scale-110 inline-block group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
