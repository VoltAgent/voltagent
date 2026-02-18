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
        <span className="text-[#ff7b72]">import</span>{" "}
        <span className="text-[#f0f6fc]">{"{ Agent }"}</span>{" "}
        <span className="text-[#ff7b72]">from</span>{" "}
        <span className="text-[#a5d6ff]">'@voltagent/core'</span>
        <br />
        <span className="text-[#ff7b72]">import</span>{" "}
        <span className="text-[#f0f6fc]">{"{ openai }"}</span>{" "}
        <span className="text-[#ff7b72]">from</span>{" "}
        <span className="text-[#a5d6ff]">'@ai-sdk/openai'</span>
        <br />
        <span className="text-[#ff7b72]">import</span>{" "}
        <span className="text-[#f0f6fc]">{"{ anthropic }"}</span>{" "}
        <span className="text-[#ff7b72]">from</span>{" "}
        <span className="text-[#a5d6ff]">'@ai-sdk/anthropic'</span>
        <br />
        <br />
        <span className="text-[#f0f6fc]">
          {/* Switch between AI providers with a single line */}
        </span>
        <br />
        <span className="text-[#ff7b72]">const</span> <span className="text-[#f0f6fc]">agent</span>{" "}
        <span className="text-[#8b949e]">=</span> <span className="text-[#ff7b72]">new Agent</span>
        <span className="text-[#f0f6fc]">({"{"}</span>
        <br />
        <span className="text-[#f0f6fc]"> model: </span>
        <span className="text-[#a5d6ff]">openai("gpt-4o-mini")</span>
        <span className="text-[#f0f6fc]">,</span>
        <br />
        <span className="text-[#f0f6fc]">{"});"}</span>
        <br />
        <br />
        <span className="text-[#f0f6fc]">{/* To switch to a different provider: */}</span>
        <br />
        <span className="text-[#ff7b72]">const</span>{" "}
        <span className="text-[#f0f6fc]">anthropicAgent</span>{" "}
        <span className="text-[#8b949e]">=</span> <span className="text-[#ff7b72]">new Agent</span>
        <span className="text-[#f0f6fc]">({"{"}</span>
        <br />
        <span className="text-[#f0f6fc]"> model: </span>
        <span className="text-[#a5d6ff]">anthropic('claude-3-haiku-20240307')</span>
        <span className="text-[#f0f6fc]">,</span>
        <br />
        <span className="text-[#f0f6fc]">{"});"}</span>
      </>
    ),
    memory: (
      <>
        <span className="text-[#ff7b72]">import</span> {/* Updated for Memory API */}
        <span className="text-[#f0f6fc]">{"{ Agent, Memory }"}</span>{" "}
        <span className="text-[#ff7b72]">from</span>{" "}
        <span className="text-[#a5d6ff]">'@voltagent/core'</span>
        <br />
        <span className="text-[#ff7b72]">import</span>{" "}
        <span className="text-[#f0f6fc]">{"{ LibSQLMemoryAdapter }"}</span>{" "}
        <span className="text-[#ff7b72]">from</span>{" "}
        <span className="text-[#a5d6ff]">'@voltagent/libsql'</span>
        <br />
        <span className="text-[#ff7b72]">import</span>{" "}
        <span className="text-[#f0f6fc]">{"{ openai }"}</span>{" "}
        <span className="text-[#ff7b72]">from</span>{" "}
        <span className="text-[#a5d6ff]">'@ai-sdk/openai'</span>
        <br />
        <br />
        <span className="text-[#f0f6fc]">{/* Create memory system for long-term recall */}</span>
        <br />
        <span className="text-[#ff7b72]">const</span> <span className="text-[#f0f6fc]">memory</span>{" "}
        <span className="text-[#8b949e]">=</span> <span className="text-[#ff7b72]">new Memory</span>
        <span className="text-[#f0f6fc]">({"{"}</span>
        <br />
        <span className="text-[#f0f6fc]"> storage: </span>
        <span className="text-[#ff7b72]">new LibSQLMemoryAdapter</span>
        <span className="text-[#f0f6fc]">({"{"} url: </span>
        <span className="text-[#a5d6ff]">'file:memory.db'</span>
        <span className="text-[#f0f6fc]"> {"}"})</span>
        <span className="text-[#f0f6fc]">,</span>
        <br />
        <span className="text-[#f0f6fc]">{"});"}</span>
        <br />
        <br />
        <span className="text-[#ff7b72]">const</span> <span className="text-[#f0f6fc]">agent</span>{" "}
        <span className="text-[#8b949e]">=</span> <span className="text-[#ff7b72]">new Agent</span>
        <span className="text-[#f0f6fc]">({"{"}</span>
        <br />
        <span className="text-[#f0f6fc]"> model: openai("gpt-4o-mini"), </span>
        {/* Added model */}
        <br />
        <span className="text-[#f0f6fc]"> memory,</span>
        <br />
        <span className="text-[#f0f6fc]">{"});"}</span>
        <br />
        <br />
        <span className="text-[#f0f6fc]">{/* Agent can now remember past conversations */}</span>
        <br />
        <span className="text-[#ff7b72]">await</span> <span className="text-[#f0f6fc]">agent.</span>
        <span className="text-[#a5d6ff]">generateText</span>
        <span className="text-[#f0f6fc]">(</span>
        <span className="text-[#a5d6ff]">'Remember this fact: sky is blue'</span>
        <span className="text-[#f0f6fc]">);</span>
      </>
    ),
    prompt: (
      <>
        <span className="text-[#ff7b72]">import</span> {/* Updated import */}
        <span className="text-[#f0f6fc]">{"{ Agent, createPrompt }"}</span>{" "}
        <span className="text-[#ff7b72]">from</span> {/* Updated package name */}
        <span className="text-[#a5d6ff]">'@voltagent/core'</span>
        <br />
        <span className="text-[#ff7b72]">import</span>{" "}
        <span className="text-[#f0f6fc]">{"{ openai }"}</span>{" "}
        <span className="text-[#ff7b72]">from</span>{" "}
        <span className="text-[#a5d6ff]">'@ai-sdk/openai'</span>
        <br />
        <span className="text-[#f0f6fc]">{/* Create and tune prompts for specific tasks */}</span>
        <br />
        <span className="text-[#ff7b72]">const</span>{" "}
        <span className="text-[#f0f6fc]">customPromptFn</span> {/* Renamed for clarity */}
        <span className="text-[#8b949e]">=</span>{" "}
        <span className="text-[#ff7b72]">createPrompt</span>
        <span className="text-[#f0f6fc]">({"{"}</span>
        <br />
        <span className="text-[#f0f6fc]"> template: </span>
        <span className="text-[#a5d6ff]">
          {"`You are a helpful assistant that {{role}}.\nTask: {{task}}`"}
        </span>
        <span className="text-[#f0f6fc]">,</span>
        <br />
        <span className="text-[#f0f6fc]">
          {" "}
          variables: {"{ role: 'simplifies complex topics', task: '' }"}
        </span>
        <br />
        <span className="text-[#f0f6fc]">{"});"}</span>
        <br />
        <br />
        <span className="text-[#ff7b72]">const</span> <span className="text-[#f0f6fc]">agent</span>{" "}
        <span className="text-[#8b949e]">=</span> <span className="text-[#ff7b72]">new Agent</span>{" "}
        {/* Use Agent constructor */}
        <span className="text-[#f0f6fc]">({"{"}</span>
        <br />
        <span className="text-[#f0f6fc]"> model: openai("gpt-4o-mini"), </span>
        {/* Added model */}
        <br />
        <span className="text-[#f0f6fc]">{"});"}</span>
        <br />
        <br />
        {/* Generate the specific prompt string first */}
        <span className="text-[#ff7b72]">const</span>{" "}
        <span className="text-[#f0f6fc]">specificPrompt</span>{" "}
        <span className="text-[#8b949e]">=</span>{" "}
        <span className="text-[#f0f6fc]">customPromptFn</span>
        <span className="text-[#f0f6fc]">({"{"}</span>
        <span className="text-[#f0f6fc]"> task: </span>
        <span className="text-[#a5d6ff]">'Explain quantum physics'</span>
        <span className="text-[#f0f6fc]">{"});"}</span>
        <br />
        {/* Use agent.generateText with the generated prompt */}
        <span className="text-[#ff7b72]">await</span> <span className="text-[#f0f6fc]">agent.</span>
        <span className="text-[#a5d6ff]">generateText</span>
        <span className="text-[#f0f6fc]">(</span>
        <span className="text-[#f0f6fc]">specificPrompt</span>
        <span className="text-[#f0f6fc]">);</span>
      </>
    ),
    tools: (
      <>
        <span className="text-[#ff7b72]">import</span> {/* TODO: Corrected package name */}
        <span className="text-[#f0f6fc]">{"{ Agent, createTool }"}</span>{" "}
        <span className="text-[#ff7b72]">from</span>{" "}
        <span className="text-[#a5d6ff]">'@voltagent/core'</span>
        <br />
        <span className="text-[#ff7b72]">import</span>{" "}
        <span className="text-[#f0f6fc]">{"{ openai }"}</span>{" "}
        <span className="text-[#ff7b72]">from</span>{" "}
        <span className="text-[#a5d6ff]">'@ai-sdk/openai'</span>
        <br />
        <span className="text-[#f0f6fc]">
          {/* Define a custom tool for API requests using createTool */}
        </span>
        <br />
        <span className="text-[#ff7b72]">const</span>{" "}
        <span className="text-[#f0f6fc]">fetchWeatherTool</span>{" "}
        <span className="text-[#8b949e]">=</span> <span className="text-[#ff7b72]">createTool</span>
        ({/* Use createTool */}
        <br />
        <span className="text-[#f0f6fc]">{"  "}name: </span>
        <span className="text-[#a5d6ff]">'fetchWeather'</span>
        <span className="text-[#f0f6fc]">,</span>
        <br />
        <span className="text-[#f0f6fc]">{"  "}description: </span>
        <span className="text-[#a5d6ff]">'Get weather for a location'</span>
        <span className="text-[#f0f6fc]">,</span>
        <br />
        <span className="text-[#f0f6fc]">
          {"  "}parameters: z.object({"{"}
        </span>
        <br />
        <span className="text-[#f0f6fc]">{"    "}location: z.string().describe(</span>
        <span className="text-[#a5d6ff]">"The city and state, e.g. San Francisco"</span>
        <span className="text-[#f0f6fc]">)</span>
        <br />
        <span className="text-[#f0f6fc]">
          {"  "}
          {"}"}),
        </span>
        <br />
        <span className="text-[#f0f6fc]">
          {"  "}
          execute: async (args) {"=>"} {/* Removed explicit type for args */}
          {"{"} {/* API call logic placeholder */}
          <span className="text-[#8b949e]">console</span>.
          <span className="text-[#a5d6ff]">log</span>(
          <span className="text-[#a5d6ff]">`Implement the tool logic here`</span>
          );
          {"}"}
        </span>
        <br />
        {/* Closing parenthesis for createTool */}
        <span className="text-[#f0f6fc]">{"});"}</span>
        <br />
        <br />
        <span className="text-[#ff7b72]">const</span> <span className="text-[#f0f6fc]">agent</span>{" "}
        <span className="text-[#8b949e]">=</span> <span className="text-[#ff7b72]">new Agent</span>
        <span className="text-[#f0f6fc]">({"{"}</span>
        <br />
        <span className="text-[#f0f6fc]"> model: openai("gpt-4o-mini"), </span>
        {/* Added model */}
        <br />
        <span className="text-[#f0f6fc]"> tools: </span>
        <span className="text-[#a5d6ff]">[fetchWeatherTool]</span> {/* Use the created tool */}
        <span className="text-[#f0f6fc]">,</span>
        <br />
        <span className="text-[#f0f6fc]">{"});"}</span>
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
        style={{ borderWidth: "1px" }}
        className="max-w-4xl relative overflow-y-hidden border border-solid border-[#3d3a39] hover:border-[#5c5855] transition-colors duration-300 rounded-lg"
      >
        <motion.div
          className="absolute top-0 left-0 w-full h-[3px] rounded-t-lg landing-xs:hidden landing-md:block"
          style={{
            background:
              "linear-gradient(45deg, rgb(47, 214, 161), rgb(16, 185, 129), rgb(47, 214, 161), rgb(5, 150, 105)) 0% 0% / 300%",
            boxShadow:
              "0 0 15px 3px rgba(47, 214, 161, 0.4), 0 0 30px 6px rgba(47, 214, 161, 0.15)",
          }}
        />
        <pre className="text-left bg-[#020202] overflow-hidden rounded-lg p-0 text-sm font-mono m-0 landing-md:h-[340px] landing-xs:h-[275px]">
          <div className="flex">
            <div className="py-7 px-2 text-right text-[#8b949e]  leading-[1.4] select-none border-r border-[#3d3a39] min-w-[40px] landing-xs:text-[9px] landing-md:text-xs">
              {/* Dynamically generate line numbers based on the longest example */}
              {/* Using index as key is acceptable here as the list is static and has no stable IDs */}
              {Array.from({ length: 18 }, (_, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: I have no choice
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <div className="py-7 px-3 block landing-xs:text-[9px] landing-md:text-xs  w-full relative">
              <motion.div
                className="absolute inset-0 bg-[#2fd6a1]/6 rounded-r"
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
