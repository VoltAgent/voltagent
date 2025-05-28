import type React from "react";
import { motion, AnimatePresence } from "framer-motion";

// Animation variants for code block
const codeBlockVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

interface CodeBlockProps {
  code: string;
}

// Code display component
const CodeBlock: React.FC<CodeBlockProps> = ({ code }) => {
  return (
    <div className="relative max-w-4xl overflow-hidden transition-all duration-300">
      {/* Code content with line numbers */}
      <pre className="text-left bg-white/5 rounded-none overflow-x-auto p-0 text-[10px] sm:text-sm font-mono m-0">
        <div className="flex">
          <div className="py-3 px-3 text-right text-gray-500 leading-[1.4] select-none border-r border-gray-700 min-w-[30px] landing-xs:text-[9px] landing-md:text-xs">
            {Array.from({ length: code.split("\n").length || 1 }, (_, i) => (
              <div key={`line-${i + 1}`}>{i + 1}</div>
            ))}
          </div>
          <div className="py-3 px-3 block landing-xs:text-[9px] landing-md:text-xs w-full relative">
            <motion.div
              className="absolute inset-0 "
              layoutId="codeHighlight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
            <AnimatePresence mode="wait">
              <motion.code
                key="code-block"
                id="code-content"
                className="block relative z-10 text-gray-300"
                variants={codeBlockVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                {code}
              </motion.code>
            </AnimatePresence>
          </div>
        </div>
      </pre>
    </div>
  );
};

export default CodeBlock;
