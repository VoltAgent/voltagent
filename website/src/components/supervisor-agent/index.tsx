import { CpuChipIcon, EyeIcon, UserPlusIcon, UsersIcon } from "@heroicons/react/24/outline";
import { useMediaQuery } from "@site/src/hooks/use-media-query";
import { useState } from "react";
import { MobileCodeBlock } from "./mobile-code-block";
import { MobileVersion } from "./mobile-version";
import { WorkflowCodeExample } from "./workflow-code-example";

export function SupervisorAgent() {
  const [highlightedSection, setHighlightedSection] = useState<string | null>("centralized");

  const isMobile = useMediaQuery("(max-width: 1023px)");

  // Function to define code sections
  const getHighlightClasses = (section: string) => {
    const baseHighlightClass = "transition-all duration-300 ease-in-out";

    return highlightedSection === section
      ? `bg-gradient-to-r from-[#1a1a1a]/70 to-[#151515]/70 border-l-2 border-solid border-t-0 border-r-0 border-b-0 border-[#2fd6a1] pl-2 rounded-sm shadow-lg text-white ${baseHighlightClass}`
      : `text-[#8b949e] ${baseHighlightClass}`;
  };

  // Handlers for mouse over and click
  const handleMouseEnter = (section: string) => {
    setHighlightedSection(section);
  };

  const handleMouseLeave = () => {
    setHighlightedSection(null);
  };

  const handleClick = (section: string) => {
    setHighlightedSection(section === highlightedSection ? null : section);
  };

  return (
    <div className="relative w-full overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 landing-xs:mb-16 landing-md:mb-36">
        <div className="">
          <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold text-main-emerald tracking-wide uppercase">
            Intelligent Coordination
          </h2>
          <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-normal landing-md:font-semibold text-white sm:tracking-tight">
            Supervisor agent orchestration
          </p>
          <p className="max-w-3xl  landing-md:text-xl  landing-xs:text-md text-gray-400">
            Build powerful multi-agent systems with a central Supervisor Agent that coordinates
            specialized agents.
          </p>
        </div>

        {/* Code Example - Full Width */}
        <div className="">
          {isMobile ? <MobileVersion isVisible={true} /> : <WorkflowCodeExample isVisible={true} />}
        </div>

        {/* Code block section */}
        <div className="flex items-center justify-center landing-xs:mt-0 landing-md:mt-12">
          {isMobile ? (
            <MobileCodeBlock isVisible={true} />
          ) : (
            <>
              {/* Code Section - Full Width */}
              <div className="w-[55%] border-t border-r-0 rounded-none border-b-0 rounded-lg border-t-0 border-solid border-white/10">
                <pre className="text-left h-full bg-[#020202] p-0 text-xs md:text-sm font-mono m-0">
                  <div className="flex">
                    <div className="py-5 px-2 text-right text-[#8b949e] select-none border-r border-[#3d3a39] min-w-[40px] text-xs">
                      <div>1</div>
                      <div>2</div>
                      <div>3</div>
                      <div>4</div>
                      <div>5</div>
                      <div>6</div>
                      <div>7</div>
                      <div>8</div>
                      <div>9</div>
                      <div>10</div>
                      <div>11</div>
                      <div>12</div>
                      <div>13</div>
                      <div>14</div>
                      <div>15</div>
                      <div>16</div>
                      <div>17</div>
                      <div>18</div>
                      <div>19</div>
                      <div>20</div>
                      <div>21</div>
                      <div>22</div>
                      <div>23</div>
                      <div>24</div>
                      <div>25</div>
                      <div>26</div>
                      <div>27</div>
                      <div>28</div>
                      <div>29</div>
                      <div>30</div>
                      <div>31</div>
                      <div>32</div>
                      <div>33</div>
                      <div>34</div>
                    </div>
                    <code className="py-5 px-3 block text-xs">
                      {/* Orchestrator initialization - Common for all features */}
                      <span className={`block ${getHighlightClasses("orchestrator")}`}>
                        <span className="text-[#ff7b72]">import</span>
                        <span>
                          {" "}
                          {"{"} Agent {"}"}{" "}
                        </span>
                        <span className="text-[#ff7b72]">from</span>
                        <span className="text-[#a5d6ff]"> "@voltagent/core"</span>
                        <span>;</span>
                        <br />

                        <span className="text-[#ff7b72]">import</span>
                        <span>
                          {" "}
                          {"{"} openai {"}"}{" "}
                        </span>
                        <span className="text-[#ff7b72]">from</span>
                        <span className="text-[#a5d6ff]"> "@ai-sdk/openai"</span>
                        <span>;</span>
                        <br />
                        <br />
                      </span>

                      {/* Centralized Coordination */}
                      <span className={`block ${getHighlightClasses("centralized")}`}>
                        {/* Define supervisor agent */}
                        <span className="text-[#8b949e]">{"// Define supervisor agent"}</span>
                        <br />
                        <span className="text-[#ff7b72]">const</span>
                        <span> supervisorAgent = </span>
                        <span className="text-[#ff7b72]">new</span>
                        <span className="text-[#d2a8ff]"> Agent</span>
                        <span>{"({"}</span>
                        <br />
                        <span className="ml-4">name: </span>
                        <span className="text-[#a5d6ff]">"Supervisor Agent"</span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">description: </span>
                        <span className="text-[#a5d6ff]">
                          "You manage a workflow between specialized agents."
                        </span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">llm: </span>
                        <span className="text-[#ff7b72]">new</span>

                        <span>(),</span>
                        <br />
                        <span className="ml-4">model: </span>
                        <span className="text-[#d2a8ff]">openai</span>
                        <span>(</span>
                        <span className="text-[#a5d6ff]">"gpt-4o-mini"</span>
                        <span>),</span>
                        <br />
                        <span className="ml-4">subAgents: [storyAgent, translatorAgent]</span>
                        <br />
                        <span>{"});"}</span>
                        <br />
                        <br />
                      </span>

                      {/* Specialized Agent Roles */}
                      <span className={`block ${getHighlightClasses("specialized")}`}>
                        {/* Define story agent */}
                        <span className="text-[#8b949e]">{"// Define story agent"}</span>
                        <br />
                        <span className="text-[#ff7b72]">const</span>
                        <span> storyAgent = </span>
                        <span className="text-[#ff7b72]">new</span>
                        <span className="text-[#d2a8ff]"> Agent</span>
                        <span>{"({"}</span>
                        <br />
                        <span className="ml-4">name: </span>
                        <span className="text-[#a5d6ff]">"Story Agent"</span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">description: </span>
                        <span className="text-[#a5d6ff]">"You are a creative story writer."</span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">llm: </span>
                        <span className="text-[#ff7b72]">new</span>

                        <span>(),</span>
                        <br />
                        <span className="ml-4">model: </span>
                        <span className="text-[#d2a8ff]">openai</span>
                        <span>(</span>
                        <span className="text-[#a5d6ff]">"gpt-4o-mini"</span>
                        <span>),</span>
                        <br />
                        <span>{"});"}</span>
                        <br />
                        <br />
                      </span>

                      {/* Shared Memory System */}
                      <span className={`block ${getHighlightClasses("memory")}`}>
                        {/* Define translator agent */}
                        <span className="text-[#8b949e]">{"// Define translator agent"}</span>
                        <br />
                        <span className="text-[#ff7b72]">const</span>
                        <span> translatorAgent = </span>
                        <span className="text-[#ff7b72]">new</span>
                        <span className="text-[#d2a8ff]"> Agent</span>
                        <span>{"({"}</span>
                        <br />
                        <span className="ml-4">name: </span>
                        <span className="text-[#a5d6ff]">"Translator Agent"</span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">description: </span>
                        <span className="text-[#a5d6ff]">"Translate English text to German"</span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">llm: </span>
                        <span className="text-[#ff7b72]">new</span>

                        <span>(),</span>
                        <br />
                        <span className="ml-4">model: </span>
                        <span className="text-[#d2a8ff]">openai</span>
                        <span>(</span>
                        <span className="text-[#a5d6ff]">"gpt-4o-mini"</span>
                        <span>),</span>
                        <br />
                        <span>{"});"}</span>
                        <br />
                        <br />
                      </span>

                      {/* Dynamic Agent Selection */}
                      <span className={`block ${getHighlightClasses("dynamic")}`}>
                        {/* Stream response from supervisor agent */}
                        <span className="text-[#8b949e]">
                          {"// Stream response from supervisor agent"}
                        </span>
                        <br />
                        <span className="text-[#ff7b72]">const</span>
                        <span> result = </span>
                        <span className="text-[#ff7b72]">await</span>
                        <span> supervisorAgent.streamText(</span>
                        <br />
                        <span className="ml-4" />
                        <span className="text-[#a5d6ff]">"Write a 100 word story in English."</span>
                        <br />
                        <span>);</span>
                        <br />
                        <br />
                        <span className="text-[#ff7b72]">for await</span>
                        <span> (</span>
                        <span className="text-[#ff7b72]">const</span>
                        <span> chunk </span>
                        <span className="text-[#ff7b72]">of</span>
                        <span> result.textStream) {"{"}</span>
                        <br />
                        <span className="ml-4">console.log(chunk);</span>
                        <br />
                        <span>{"}"}</span>
                      </span>
                    </code>
                  </div>
                </pre>
              </div>

              {/* Feature Cards - Grid Layout */}
              <div className="flex w-[45%] flex-col gap-6">
                {/* Feature 1 - Centralized Coordination */}
                <div className="relative h-full">
                  <div
                    className={`h-[130px] p-5 rounded-lg ${
                      highlightedSection === "centralized"
                        ? "border-1 border-solid border-[#5c5855] bg-[#1a1a1a]"
                        : "border-solid border-[#3d3a39] bg-[#101010] hover:bg-[#1a1a1a] hover:border-[#5c5855]"
                    }  flex flex-col cursor-pointer transition-all duration-300`}
                    onMouseEnter={() => handleMouseEnter("centralized")}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick("centralized")}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-[#b8b3b0]/10 w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                        <CpuChipIcon className="w-5 h-5 text-[#b8b3b0]" />
                      </div>
                      <div className="text-base font-semibold text-white">
                        Centralized Coordination
                      </div>
                    </div>
                    <div className="text-gray-400 text-xs leading-relaxed">
                      Supervisor Agent manages the workflow, delegates tasks to specialized agents,
                      and maintains context across the entire process.
                    </div>
                  </div>
                </div>

                {/* Feature 2 - Specialized Agent Roles */}
                <div className="relative h-full">
                  <div
                    className={`h-[130px] p-5 rounded-lg ${
                      highlightedSection === "specialized"
                        ? "border-1 border-solid border-[#5c5855] bg-[#1a1a1a]"
                        : "border-solid border-[#3d3a39] bg-[#101010] hover:bg-[#1a1a1a] hover:border-[#5c5855]"
                    }  flex flex-col cursor-pointer transition-all duration-300`}
                    onMouseEnter={() => handleMouseEnter("specialized")}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick("specialized")}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-[#b8b3b0]/10 w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                        <UserPlusIcon className="w-5 h-5 text-[#b8b3b0]" />
                      </div>
                      <div className="text-base font-semibold text-white">
                        Specialized Agent Roles
                      </div>
                    </div>
                    <div className="text-gray-400 text-xs leading-relaxed">
                      Each agent in the workflow can be optimized for specific tasks, with custom
                      tools, knowledge, and capabilities.
                    </div>
                  </div>
                </div>

                {/* Feature 3 - Shared Memory System */}
                <div className="relative h-full">
                  <div
                    className={`h-[130px] p-5 rounded-lg ${
                      highlightedSection === "memory"
                        ? "border-1 border-solid border-[#5c5855] bg-[#1a1a1a]"
                        : "border-solid border-[#3d3a39] bg-[#101010] hover:bg-[#1a1a1a] hover:border-[#5c5855]"
                    }  flex flex-col cursor-pointer transition-all duration-300`}
                    onMouseEnter={() => handleMouseEnter("memory")}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick("memory")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleClick("memory");
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-[#b8b3b0]/10 w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                        <EyeIcon className="w-5 h-5 text-[#b8b3b0]" />
                      </div>
                      <div className="text-base font-semibold text-white">Shared Memory System</div>
                    </div>
                    <div className="text-gray-400 text-xs leading-relaxed">
                      Maintain context and state across multiple agent interactions, enabling
                      complex reasoning and multi-step problem solving.
                    </div>
                  </div>
                </div>

                {/* Feature 4 - Dynamic Agent Selection */}
                <div className="relative h-full">
                  <div
                    className={`h-[130px] p-5 rounded-lg ${
                      highlightedSection === "dynamic"
                        ? "border-1 border-solid border-[#5c5855] bg-[#1a1a1a]"
                        : "border-solid border-[#3d3a39] bg-[#101010] hover:bg-[#1a1a1a] hover:border-[#5c5855]"
                    }  flex flex-col cursor-pointer transition-all duration-300`}
                    onMouseEnter={() => handleMouseEnter("dynamic")}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick("dynamic")}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-[#b8b3b0]/10 w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                        <UsersIcon className="w-5 h-5 text-[#b8b3b0]" />
                      </div>
                      <div className="text-base font-semibold text-white">
                        Dynamic Agent Selection
                      </div>
                    </div>
                    <div className="text-gray-400 text-xs leading-relaxed">
                      Supervisor intelligently routes tasks to the most appropriate agents based on
                      the current context and requirements.
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
