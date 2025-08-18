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
        className="border-solid bg-white/5 border-[#1e293b]/40 border-2 rounded-lg overflow-hidden transition-all duration-300 h-full hover:border-[#00d992]/30 hover:scale-[1.02] cursor-pointer"
        style={{
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-3">{example.title}</h3>

          <p className="text-gray-400 text-sm">{example.description}</p>

          <div className="mt-4">
            <span className="text-[#00d992] text-sm font-medium hover:text-[#00c182] transition-colors group">
              View Example
              <span className="inline-block transition-transform group-hover:translate-x-1 ml-1">
                →
              </span>
            </span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
};
