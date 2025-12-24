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
      ? `bg-gradient-to-r from-indigo-600/40 to-indigo-500/20 border-l-2 border-solid border-t-0 border-r-0 border-b-0 border-indigo-500 pl-2 rounded-sm shadow-lg text-white ${baseHighlightClass}`
      : `text-gray-400 ${baseHighlightClass}`;
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
          <h2 className="landing-xs:text-sm landing-md:text-lg landing-xs:mb-2 landing-md:mb-4 font-semibold  text-indigo-500 tracking-wide uppercase">
            Intelligent Coordination
          </h2>
          <p className="mt-1 landing-xs:text-2xl landing-md:text-4xl landing-xs:mb-2 landing-md:mb-4 landing-xs:font-bold landing-md:font-extrabold text-white sm:tracking-tight">
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
                <pre className="text-left h-full bg-transparent p-0 text-xs md:text-sm font-mono m-0">
                  <div className="flex">
                    <div className="py-5 px-2 text-right text-gray-500 select-none border-r border-gray-700/50 min-w-[40px] text-xs">
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
                        <span className="text-blue-400">import</span>
                        <span>
                          {" "}
                          {"{"} Agent {"}"}{" "}
                        </span>
                        <span className="text-blue-400">from</span>
                        <span className="text-yellow-300"> "@voltagent/core"</span>
                        <span>;</span>
                        <br />

                        <span className="text-blue-400">import</span>
                        <span>
                          {" "}
                          {"{"} openai {"}"}{" "}
                        </span>
                        <span className="text-blue-400">from</span>
                        <span className="text-yellow-300"> "@ai-sdk/openai"</span>
                        <span>;</span>
                        <br />
                        <br />
                      </span>

                      {/* Centralized Coordination */}
                      <span className={`block ${getHighlightClasses("centralized")}`}>
                        {/* Define supervisor agent */}
                        <span className="text-gray-300">{"// Define supervisor agent"}</span>
                        <br />
                        <span className="text-blue-400">const</span>
                        <span> supervisorAgent = </span>
                        <span className="text-blue-400">new</span>
                        <span className="text-green-400"> Agent</span>
                        <span>{"({"}</span>
                        <br />
                        <span className="ml-4">name: </span>
                        <span className="text-yellow-300">"Supervisor Agent"</span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">description: </span>
                        <span className="text-yellow-300">
                          "You manage a workflow between specialized agents."
                        </span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">llm: </span>
                        <span className="text-blue-400">new</span>

                        <span>(),</span>
                        <br />
                        <span className="ml-4">model: </span>
                        <span className="text-green-400">openai</span>
                        <span>(</span>
                        <span className="text-yellow-300">"gpt-4o-mini"</span>
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
                        <span className="text-gray-300">{"// Define story agent"}</span>
                        <br />
                        <span className="text-blue-400">const</span>
                        <span> storyAgent = </span>
                        <span className="text-blue-400">new</span>
                        <span className="text-green-400"> Agent</span>
                        <span>{"({"}</span>
                        <br />
                        <span className="ml-4">name: </span>
                        <span className="text-yellow-300">"Story Agent"</span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">description: </span>
                        <span className="text-yellow-300">"You are a creative story writer."</span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">llm: </span>
                        <span className="text-blue-400">new</span>

                        <span>(),</span>
                        <br />
                        <span className="ml-4">model: </span>
                        <span className="text-green-400">openai</span>
                        <span>(</span>
                        <span className="text-yellow-300">"gpt-4o-mini"</span>
                        <span>),</span>
                        <br />
                        <span>{"});"}</span>
                        <br />
                        <br />
                      </span>

                      {/* Shared Memory System */}
                      <span className={`block ${getHighlightClasses("memory")}`}>
                        {/* Define translator agent */}
                        <span className="text-gray-300">{"// Define translator agent"}</span>
                        <br />
                        <span className="text-blue-400">const</span>
                        <span> translatorAgent = </span>
                        <span className="text-blue-400">new</span>
                        <span className="text-green-400"> Agent</span>
                        <span>{"({"}</span>
                        <br />
                        <span className="ml-4">name: </span>
                        <span className="text-yellow-300">"Translator Agent"</span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">description: </span>
                        <span className="text-yellow-300">"Translate English text to German"</span>
                        <span>,</span>
                        <br />
                        <span className="ml-4">llm: </span>
                        <span className="text-blue-400">new</span>

                        <span>(),</span>
                        <br />
                        <span className="ml-4">model: </span>
                        <span className="text-green-400">openai</span>
                        <span>(</span>
                        <span className="text-yellow-300">"gpt-4o-mini"</span>
                        <span>),</span>
                        <br />
                        <span>{"});"}</span>
                        <br />
                        <br />
                      </span>

                      {/* Dynamic Agent Selection */}
                      <span className={`block ${getHighlightClasses("dynamic")}`}>
                        {/* Stream response from supervisor agent */}
                        <span className="text-gray-300">
                          {"// Stream response from supervisor agent"}
                        </span>
                        <br />
                        <span className="text-blue-400">const</span>
                        <span> result = </span>
                        <span className="text-blue-400">await</span>
                        <span> supervisorAgent.streamText(</span>
                        <br />
                        <span className="ml-4" />
                        <span className="text-yellow-300">
                          "Write a 100 word story in English."
                        </span>
                        <br />
                        <span>);</span>
                        <br />
                        <br />
                        <span className="text-blue-400">for await</span>
                        <span> (</span>
                        <span className="text-blue-400">const</span>
                        <span> chunk </span>
                        <span className="text-blue-400">of</span>
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
                        ? "border-1 border-solid border-indigo-500 bg-white/10 shadow-md shadow-indigo-500/20"
                        : "border-solid border-indigo-500/30 hover:bg-white/5"
                    }  flex flex-col cursor-pointer transition-all duration-300`}
                    onMouseEnter={() => handleMouseEnter("centralized")}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick("centralized")}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-indigo-500/10 w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                        <CpuChipIcon className="w-5 h-5 text-indigo-500" />
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
                        ? "border-1 border-solid border-indigo-500 bg-white/10 shadow-md shadow-indigo-500/20"
                        : "border-solid border-indigo-500/30 hover:bg-white/5"
                    }  flex flex-col cursor-pointer transition-all duration-300`}
                    onMouseEnter={() => handleMouseEnter("specialized")}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick("specialized")}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-indigo-500/10 w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                        <UserPlusIcon className="w-5 h-5 text-indigo-500" />
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
                        ? "border-1 border-solid border-indigo-500 bg-white/10 shadow-md shadow-indigo-500/20"
                        : "border-solid border-indigo-500/30 hover:bg-white/5"
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
                      <div className="bg-indigo-500/10 w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                        <EyeIcon className="w-5 h-5 text-indigo-500" />
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
                        ? "border-1 border-solid border-indigo-500 bg-white/10 shadow-md shadow-indigo-500/20"
                        : "border-solid border-indigo-500/30 hover:bg-white/5"
                    }  flex flex-col cursor-pointer transition-all duration-300`}
                    onMouseEnter={() => handleMouseEnter("dynamic")}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => handleClick("dynamic")}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="bg-indigo-500/10 w-10 h-10 rounded-md flex items-center justify-center shrink-0">
                        <UsersIcon className="w-5 h-5 text-indigo-500" />
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
