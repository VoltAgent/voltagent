import { AnimatePresence, motion } from "framer-motion";
import React from "react";

type CodeExampleProps = {
  // isVisible: boolean; // TODO: Prop 'isVisible' is declared but never used. Remove or utilize it.
  featureType: "api" | "memory" | "prompt" | "tools";
};

export const CodeExample = ({
  // isVisible,
  featureType = "api",
}: CodeExampleProps) => {
  // Code examples for each feature type
  const codeExamples = {
    api: (
      <>
        <span className="text-blue-400">import</span>{" "}
        <span className="text-gray-300">{"{ Agent }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@voltagent/core'</span>
        <br />
        <span className="text-blue-400">import</span>{" "}
        <span className="text-gray-300">{"{ VercelAIProvider }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        {/* TODO: Corrected package name based on other examples and project structure */}
        <span className="text-main-emerald">'@voltagent/vercel-ai'</span>
        <br />
        <br />
        <span className="text-blue-400">import</span>{" "}
        <span className="text-gray-300">{"{ openai }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@ai-sdk/openai'</span>
        <br />
        <span className="text-blue-400">import</span>{" "}
        <span className="text-gray-300">{"{ anthropic }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@ai-sdk/anthropic'</span>
        <br />
        <br />
        <span className="text-gray-300">
          {/* Switch between AI providers with a single line */}
        </span>
        <br />
        <span className="text-purple-400">const</span> <span className="text-gray-300">agent</span>{" "}
        <span className="text-gray-500">=</span> <span className="text-blue-400">new Agent</span>
        <span className="text-gray-300">({"{"}</span>
        <br />
        <span className="text-gray-300"> provider: </span>
        <span className="text-gray-300">new VercelAIProvider()</span>
        <span className="text-gray-300">,</span>
        <br />
        <span className="text-gray-300"> model: </span>
        <span className="text-main-emerald">openai("gpt-4o-mini")</span>
        <span className="text-gray-300">,</span>
        <br />
        <span className="text-gray-300">{"});"}</span>
        <br />
        <br />
        <span className="text-gray-300">{/* To switch to a different provider: */}</span>
        <br />
        <span className="text-purple-400">const</span>{" "}
        <span className="text-gray-300">anthropicAgent</span>{" "}
        <span className="text-gray-500">=</span> <span className="text-blue-400">new Agent</span>
        <span className="text-gray-300">({"{"}</span>
        <br />
        <span className="text-gray-300"> provider: </span>
        <span className="text-gray-300">new VercelAIProvider()</span>
        <span className="text-gray-300">,</span>
        <br />
        <span className="text-gray-300"> model: </span>
        <span className="text-main-emerald">anthropic('claude-3-haiku-20240307')</span>
        <span className="text-gray-300">,</span>
        <br />
        <span className="text-gray-300">{"});"}</span>
      </>
    ),
    memory: (
      <>
        <span className="text-blue-400">import</span> {/* TODO: Corrected package name */}
        <span className="text-gray-300">{"{ Agent, LibSQLStorage }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@voltagent/core'</span>
        <br />
        {/* TODO: Need provider/model for Agent */}
        <span className="text-blue-400">import</span>{" "}
        <span className="text-gray-300">{"{ VercelAIProvider }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@voltagent/vercel-ai'</span>
        <br />
        <span className="text-blue-400">import</span>{" "}
        <span className="text-gray-300">{"{ openai }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@ai-sdk/openai'</span>
        <br />
        <br />
        <span className="text-gray-300">{/* Create memory system for long-term recall */}</span>
        <br />
        <span className="text-purple-400">const</span> <span className="text-gray-300">memory</span>{" "}
        <span className="text-gray-500">=</span>{" "}
        <span className="text-blue-400">new LibSQLStorage</span>
        <span className="text-gray-300">({"{"}</span>
        <br />
        <span className="text-gray-300"> url: </span>
        <span className="text-main-emerald">'file:memory.db'</span>
        <span className="text-gray-300">,</span>
        <br />
        <span className="text-gray-300">{"});"}</span>
        <br />
        <br />
        <span className="text-purple-400">const</span> <span className="text-gray-300">agent</span>{" "}
        <span className="text-gray-500">=</span> <span className="text-blue-400">new Agent</span>
        <span className="text-gray-300">({"{"}</span>
        <br />
        <span className="text-gray-300"> provider: new VercelAIProvider(), </span>
        {/* Added provider */}
        <br />
        <span className="text-gray-300"> model: openai("gpt-4o-mini"), </span>
        {/* Added model */}
        <br />
        <span className="text-gray-300"> memory,</span>
        <br />
        <span className="text-gray-300">{"});"}</span>
        <br />
        <br />
        <span className="text-gray-300">{/* Agent can now remember past conversations */}</span>
        <br />
        <span className="text-purple-400">await</span> <span className="text-gray-300">agent.</span>
        <span className="text-main-emerald">generateText</span>
        <span className="text-gray-300">(</span>
        <span className="text-main-emerald">'Remember this fact: sky is blue'</span>
        <span className="text-gray-300">);</span>
      </>
    ),
    prompt: (
      <>
        <span className="text-blue-400">import</span> {/* Updated import */}
        <span className="text-gray-300">{"{ Agent, createPrompt }"}</span>{" "}
        <span className="text-blue-400">from</span> {/* Updated package name */}
        <span className="text-main-emerald">'@voltagent/core'</span>
        <br />
        <span className="text-blue-400">import</span>{" "}
        <span className="text-gray-300">{"{ VercelAIProvider }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@voltagent/vercel-ai'</span>
        <br />
        <span className="text-blue-400">import</span>{" "}
        <span className="text-gray-300">{"{ openai }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@ai-sdk/openai'</span>
        <br />
        <span className="text-gray-300">{/* Create and tune prompts for specific tasks */}</span>
        <br />
        <span className="text-purple-400">const</span>{" "}
        <span className="text-gray-300">customPromptFn</span> {/* Renamed for clarity */}
        <span className="text-gray-500">=</span> <span className="text-blue-400">createPrompt</span>
        <span className="text-gray-300">({"{"}</span>
        <br />
        <span className="text-gray-300"> template: </span>
        <span className="text-main-emerald">
          {"`You are a helpful assistant that {{role}}.\nTask: {{task}}`"}
        </span>
        <span className="text-gray-300">,</span>
        <br />
        <span className="text-gray-300">
          {" "}
          variables: {"{ role: 'simplifies complex topics', task: '' }"}
        </span>
        <br />
        <span className="text-gray-300">{"});"}</span>
        <br />
        <br />
        <span className="text-purple-400">const</span> <span className="text-gray-300">agent</span>{" "}
        <span className="text-gray-500">=</span> <span className="text-blue-400">new Agent</span>{" "}
        {/* Use Agent constructor */}
        <span className="text-gray-300">({"{"}</span>
        <br />
        <span className="text-gray-300"> provider: new VercelAIProvider(), </span>
        {/* Added provider */}
        <br />
        <span className="text-gray-300"> model: openai("gpt-4o-mini"), </span>
        {/* Added model */}
        <br />
        <span className="text-gray-300">{"});"}</span>
        <br />
        <br />
        {/* Generate the specific prompt string first */}
        <span className="text-purple-400">const</span>{" "}
        <span className="text-gray-300">specificPrompt</span>{" "}
        <span className="text-gray-500">=</span>{" "}
        <span className="text-gray-300">customPromptFn</span>
        <span className="text-gray-300">({"{"}</span>
        <span className="text-gray-300"> task: </span>
        <span className="text-main-emerald">'Explain quantum physics'</span>
        <span className="text-gray-300">{"});"}</span>
        <br />
        {/* Use agent.generateText with the generated prompt */}
        <span className="text-purple-400">await</span> <span className="text-gray-300">agent.</span>
        <span className="text-main-emerald">generateText</span>
        <span className="text-gray-300">(</span>
        <span className="text-gray-300">specificPrompt</span>
        <span className="text-gray-300">);</span>
      </>
    ),
    tools: (
      <>
        <span className="text-blue-400">import</span> {/* TODO: Corrected package name */}
        <span className="text-gray-300">{"{ Agent, createTool }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@voltagent/core'</span>
        <br />
        <span className="text-blue-400">import</span>{" "}
        <span className="text-gray-300">{"{ VercelAIProvider }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@voltagent/vercel-ai'</span>
        <br />
        <span className="text-blue-400">import</span>{" "}
        <span className="text-gray-300">{"{ openai }"}</span>{" "}
        <span className="text-blue-400">from</span>{" "}
        <span className="text-main-emerald">'@ai-sdk/openai'</span>
        <br />
        <span className="text-gray-300">
          {/* Define a custom tool for API requests using createTool */}
        </span>
        <br />
        <span className="text-purple-400">const</span>{" "}
        <span className="text-gray-300">fetchWeatherTool</span>{" "}
        <span className="text-gray-500">=</span> <span className="text-blue-400">createTool</span>(
        {/* Use createTool */}
        <br />
        <span className="text-gray-300">{"  "}name: </span>
        <span className="text-main-emerald">'fetchWeather'</span>
        <span className="text-gray-300">,</span>
        <br />
        <span className="text-gray-300">{"  "}description: </span>
        <span className="text-main-emerald">'Get weather for a location'</span>
        <span className="text-gray-300">,</span>
        <br />
        <span className="text-gray-300">
          {"  "}parameters: z.object({"{"}
        </span>
        <br />
        <span className="text-gray-300">{"    "}location: z.string().describe(</span>
        <span className="text-main-emerald">"The city and state, e.g. San Francisco"</span>
        <span className="text-gray-300">)</span>
        <br />
        <span className="text-gray-300">
          {"  "}
          {"}"}),
        </span>
        <br />
        <span className="text-gray-300">
          {"  "}
          execute: async (args) {"=>"} {/* Removed explicit type for args */}
          {"{"} {/* API call logic placeholder */}
          <span className="text-gray-500">console</span>.
          <span className="text-main-emerald">log</span>(
          <span className="text-main-emerald">`Implement the tool logic here`</span>
          );
          {"}"}
        </span>
        <br />
        {/* Closing parenthesis for createTool */}
        <span className="text-gray-300">{"});"}</span>
        <br />
        <br />
        <span className="text-purple-400">const</span> <span className="text-gray-300">agent</span>{" "}
        <span className="text-gray-500">=</span> <span className="text-blue-400">new Agent</span>
        <span className="text-gray-300">({"{"}</span>
        <br />
        <span className="text-gray-300"> provider: new VercelAIProvider(), </span>
        {/* Added provider */}
        <br />
        <span className="text-gray-300"> model: openai("gpt-4o-mini"), </span>
        {/* Added model */}
        <br />
        <span className="text-gray-300"> tools: </span>
        <span className="text-main-emerald">[fetchWeatherTool]</span> {/* Use the created tool */}
        <span className="text-gray-300">,</span>
        <br />
        <span className="text-gray-300">{"});"}</span>
      </>
    ),
  };

  // Animation variants for code content
  const codeBlockVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.2,
        ease: "easeIn",
      },
    },
  };

  return (
    <div className="relative">
      <div
        // Fixed: Removed unnecessary template literal
        className="max-w-4xl relative overflow-y-hidden backdrop-blur-md border border-[#1e2730] hover:border-[#00d992] transition-all duration-300 rounded-lg"
      >
        <motion.div
          className="absolute top-0 left-0 w-full h-[3px] rounded-t-lg landing-xs:hidden landing-md:block"
          style={{
            background:
              "linear-gradient(45deg, rgb(0, 217, 146), rgb(0, 217, 146), rgb(0, 217, 146), rgb(0, 217, 146)) 0% 0% / 300%",
          }}
        />
        <pre className="text-left backdrop-blur-md bg-white/5 overflow-hidden rounded-lg p-0 text-sm font-mono m-0 landing-md:h-[340px] landing-xs:h-[275px]">
          <div className="flex">
            <div className="py-7 px-2 text-right text-gray-500  leading-[1.4] select-none border-r border-gray-700 min-w-[40px] landing-xs:text-[9px] landing-md:text-xs">
              {/* Dynamically generate line numbers based on the longest example */}
              {/* Using index as key is acceptable here as the list is static and has no stable IDs */}
              {Array.from({ length: 18 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: I have no choice
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <div className="py-7 px-3 block landing-xs:text-[9px] landing-md:text-xs  w-full relative">
              <motion.div
                className="absolute inset-0 bg-[#00d992]/5 rounded-r"
                layoutId="codeHighlight"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
              <AnimatePresence mode="wait">
                <motion.code
                  key={featureType}
                  variants={codeBlockVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className="block relative leading-[1.4] z-10 "
                >
                  {codeExamples[featureType]}
                </motion.code>
              </AnimatePresence>
            </div>
          </div>
        </pre>
      </div>
    </div>
  );
}; // Converted to const arrow function
